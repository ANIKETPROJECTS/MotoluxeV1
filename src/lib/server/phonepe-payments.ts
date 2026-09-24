import "@tanstack/react-start/server-only";

import { ObjectId } from "mongodb";
import { getPhonePeOrderStatus, type PhonePeOrderStatus } from "@/lib/server/phonepe";
import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";
import { allocateOrderNumber, formatOrderNumber } from "@/lib/server/order-number";

type CheckoutLine = {
  productDocumentId: string;
  productSlug: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
  size: string;
};

type DeliverySnapshot = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

type PricingSnapshot = {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
};

type PaymentAttemptDocument = {
  _id?: ObjectId;
  merchantOrderId: string;
  phonepeOrderId?: string;
  customerId: string;
  items: CheckoutLine[];
  delivery: DeliverySnapshot;
  pricing: PricingSnapshot;
  couponCode?: string;
  amountPaise: number;
  state: "pending" | "failed" | "initiation_failed" | "paid" | "paid_inventory_issue";
  orderId?: ObjectId;
  orderNumber?: number;
  transactionReference?: string;
  inventoryIssue?: string;
  createdAt: Date;
  updatedAt: Date;
};

type ProductDocument = {
  _id: ObjectId;
  slug: string;
  name: string;
  category: string;
  price: string;
  size: string;
  image: string;
  stock?: number;
  published?: boolean;
};

type InventoryMovementDocument = {
  productId: ObjectId;
  productName: string;
  productSlug: string;
  eventType: "purchase";
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  relatedOrderNumber: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  createdAt: Date;
  updatedAt: Date;
};

type OrderDocument = {
  orderNumber: number;
  customerId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image: string;
    variant: string;
  }>;
  couponCode?: string;
  delivery: DeliverySnapshot;
  pricing: PricingSnapshot & { status: "priced" };
  status: "pending_confirmation";
  paymentStatus: "paid";
  paymentMethod: "PhonePe";
  transactionReference: string;
  paymentNotes: string;
  statusHistory: Array<{ status: string; note: string; changedAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
};

class InventoryCommitConflict extends Error {}

function transactionReference(status: PhonePeOrderStatus) {
  return (
    status.paymentDetails?.find((payment) => payment.state === "COMPLETED")?.transactionId ??
    status.orderId ??
    ""
  );
}

function orderFromAttempt(
  attempt: PaymentAttemptDocument,
  orderNumber: number,
  transactionId: string,
  paymentNotes = "",
): OrderDocument {
  const now = new Date();
  return {
    orderNumber,
    customerId: attempt.customerId,
    items: attempt.items.map((item) => ({
      productId: item.productSlug,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
      variant: item.size,
    })),
    ...(attempt.couponCode ? { couponCode: attempt.couponCode } : {}),
    delivery: attempt.delivery,
    pricing: { ...attempt.pricing, status: "priced" },
    status: "pending_confirmation",
    paymentStatus: "paid",
    paymentMethod: "PhonePe",
    transactionReference: transactionId,
    paymentNotes,
    statusHistory: [
      {
        status: "pending_confirmation",
        note: "PhonePe payment verified.",
        changedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export async function reconcilePhonePePayment(merchantOrderId: string) {
  const { client, db } = await getMotoluxeDatabase();
  const attempts = db.collection<PaymentAttemptDocument>(MOTOLUXE_COLLECTIONS.paymentAttempts);
  const attempt = await attempts.findOne({ merchantOrderId });
  if (!attempt) return { found: false as const, state: "NOT_FOUND" };
  if (attempt.state === "paid" || attempt.state === "paid_inventory_issue") {
    return {
      found: true as const,
      state: "COMPLETED",
      orderId: attempt.orderId?.toHexString(),
      orderNumber: attempt.orderNumber ? formatOrderNumber(attempt.orderNumber) : undefined,
      inventoryIssue: attempt.inventoryIssue,
    };
  }

  const status = await getPhonePeOrderStatus(merchantOrderId);
  const statusAmount =
    typeof status.amount === "number"
      ? status.amount
      : typeof status.amount === "string"
        ? Number(status.amount)
        : Number.NaN;
  if (status.merchantOrderId && status.merchantOrderId !== merchantOrderId) {
    throw new Error("PhonePe returned a different merchant order ID.");
  }
  if (!Number.isSafeInteger(statusAmount) || statusAmount !== attempt.amountPaise) {
    throw new Error("PhonePe payment amount did not match the checkout.");
  }
  if (status.state !== "COMPLETED") {
    if (status.state === "FAILED" || status.state === "EXPIRED") {
      await attempts.updateOne(
        { merchantOrderId, state: { $nin: ["paid", "paid_inventory_issue"] } },
        { $set: { state: "failed", updatedAt: new Date() } },
      );
    }
    return {
      found: true as const,
      state: status.state ?? "PENDING",
    };
  }

  const orderNumber = await allocateOrderNumber();
  const orders = db.collection<OrderDocument>(MOTOLUXE_COLLECTIONS.orders);
  const products = db.collection<ProductDocument>(MOTOLUXE_COLLECTIONS.products);
  const movements = db.collection<InventoryMovementDocument>(
    MOTOLUXE_COLLECTIONS.inventoryMovements,
  );
  let finalized: {
    state: "COMPLETED";
    orderId: string;
    orderNumber: string;
    inventoryIssue?: string;
  } | null = null;

  try {
    await client.withSession(async (session) => {
      await session.withTransaction(async () => {
        const current = await attempts.findOne({ merchantOrderId }, { session });
        if (!current) throw new Error("PhonePe payment attempt no longer exists.");
        if (current.state === "paid" || current.state === "paid_inventory_issue") {
          finalized = {
            state: "COMPLETED",
            orderId: current.orderId?.toHexString() ?? "",
            orderNumber: current.orderNumber
              ? formatOrderNumber(current.orderNumber)
              : formatOrderNumber(orderNumber),
            ...(current.inventoryIssue ? { inventoryIssue: current.inventoryIssue } : {}),
          };
          return;
        }
        if (current.amountPaise !== statusAmount) {
          throw new Error("Stored payment amount did not match the PhonePe confirmation.");
        }

        const now = new Date();
        const updatedProducts: Array<{
          product: ProductDocument;
          line: CheckoutLine;
          stockBefore: number;
        }> = [];
        for (const line of current.items) {
          if (!ObjectId.isValid(line.productDocumentId)) {
            throw new InventoryCommitConflict(`The product “${line.productName}” is unavailable.`);
          }
          const product = await products.findOne(
            { _id: new ObjectId(line.productDocumentId) },
            { session },
          );
          const stockBefore = Number.isInteger(product?.stock) ? (product?.stock as number) : 0;
          if (!product || product.published === false || stockBefore < line.quantity) {
            throw new InventoryCommitConflict(
              `The product “${line.productName}” no longer has enough available stock.`,
            );
          }
          const update = await products.updateOne(
            {
              _id: product._id,
              stock: { $gte: line.quantity },
              published: { $ne: false },
            },
            { $inc: { stock: -line.quantity }, $set: { updatedAt: now } },
            { session },
          );
          if (update.modifiedCount !== 1) {
            throw new InventoryCommitConflict(
              `The product “${line.productName}” stock changed during payment confirmation.`,
            );
          }
          updatedProducts.push({ product, line, stockBefore });
        }

        const numberText = formatOrderNumber(orderNumber);
        const order = orderFromAttempt(current, orderNumber, transactionReference(status));
        const insertedOrder = await orders.insertOne(order, { session });
        for (const entry of updatedProducts) {
          await movements.insertOne(
            {
              productId: entry.product._id,
              productName: entry.product.name,
              productSlug: entry.product.slug,
              eventType: "purchase",
              quantityChange: -entry.line.quantity,
              stockBefore: entry.stockBefore,
              stockAfter: entry.stockBefore - entry.line.quantity,
              reason: `Paid PhonePe order ${numberText}`,
              relatedOrderNumber: numberText,
              buyerName: current.delivery.name,
              buyerPhone: current.delivery.phone,
              buyerEmail: current.delivery.email,
              createdAt: now,
              updatedAt: now,
            },
            { session },
          );
        }
        await attempts.updateOne(
          { merchantOrderId, state: { $nin: ["paid", "paid_inventory_issue"] } },
          {
            $set: {
              state: "paid",
              orderId: insertedOrder.insertedId,
              orderNumber,
              transactionReference: transactionReference(status),
              updatedAt: now,
            },
          },
          { session },
        );
        finalized = {
          state: "COMPLETED",
          orderId: insertedOrder.insertedId.toHexString(),
          orderNumber: numberText,
        };
      });
    });
  } catch (error) {
    if (!(error instanceof InventoryCommitConflict)) throw error;

    await client.withSession(async (session) => {
      await session.withTransaction(async () => {
        const current = await attempts.findOne({ merchantOrderId }, { session });
        if (!current) throw new Error("PhonePe payment attempt no longer exists.");
        if (current.state === "paid" || current.state === "paid_inventory_issue") {
          finalized = {
            state: "COMPLETED",
            orderId: current.orderId?.toHexString() ?? "",
            orderNumber: current.orderNumber
              ? formatOrderNumber(current.orderNumber)
              : formatOrderNumber(orderNumber),
            ...(current.inventoryIssue ? { inventoryIssue: current.inventoryIssue } : {}),
          };
          return;
        }
        const now = new Date();
        const issue = error.message;
        const order = orderFromAttempt(
          current,
          orderNumber,
          transactionReference(status),
          `Payment verified; inventory requires administrator attention: ${issue}`,
        );
        const insertedOrder = await orders.insertOne(order, { session });
        await attempts.updateOne(
          { merchantOrderId, state: { $nin: ["paid", "paid_inventory_issue"] } },
          {
            $set: {
              state: "paid_inventory_issue",
              orderId: insertedOrder.insertedId,
              orderNumber,
              transactionReference: transactionReference(status),
              inventoryIssue: issue,
              updatedAt: now,
            },
          },
          { session },
        );
        finalized = {
          state: "COMPLETED",
          orderId: insertedOrder.insertedId.toHexString(),
          orderNumber: formatOrderNumber(orderNumber),
          inventoryIssue: issue,
        };
      });
    });
  }

  return { found: true as const, ...(finalized ?? { state: "PENDING" as const }) };
}
