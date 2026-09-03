import "@tanstack/react-start/server-only";

import { ObjectId, type Collection, type Filter } from "mongodb";
import { getOrderCollection } from "@/lib/server/customer-auth";
import { ensureLegacyOrderNumbers, formatOrderNumber } from "@/lib/server/order-number";

export const orderStatuses = [
  "pending_confirmation",
  "approved",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "rejected",
] as const;

export const paymentStatuses = ["pending", "paid", "failed", "refunded", "not_required"] as const;

type OrderStatus = (typeof orderStatuses)[number];
type PaymentStatus = (typeof paymentStatuses)[number];

type OrderItemDocument = {
  productId?: string;
  productName?: string;
  quantity?: number;
  price?: string | number | null;
  image?: string;
  variant?: string;
};

type OrderHistoryDocument = {
  status: string;
  note?: string;
  changedAt: Date;
};

type AdminOrderDocument = {
  _id?: ObjectId;
  orderNumber?: number;
  customerId?: string;
  items?: OrderItemDocument[];
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  transactionReference?: string;
  paymentNotes?: string;
  delivery?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  pricing?: {
    subtotal?: number | string | null;
    shipping?: number | string | null;
    discount?: number | string | null;
    total?: number | string | null;
    status?: string;
  };
  couponCode?: string;
  statusHistory?: OrderHistoryDocument[];
  manual?: boolean;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

type AdminOrdersCollection = Collection<AdminOrderDocument>;

export type AdminOrderListItem = {
  id: string;
  number: string;
  customerName: string;
  phone: string;
  email: string;
  itemCount: number;
  total: number | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
};

export type AdminOrderDetail = AdminOrderListItem & {
  customerId: string | null;
  delivery: {
    name: string;
    email: string;
    phone: string;
    address: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: string | number | null;
    image: string;
    variant: string;
    lineTotal: number | null;
  }>;
  pricing: {
    subtotal: number | null;
    shipping: number | null;
    discount: number | null;
    total: number | null;
    status: string;
  };
  couponCode: string | null;
  transactionReference: string;
  paymentNotes: string;
  statusHistory: Array<{ status: string; note: string; changedAt: string }>;
  manual: boolean;
};

function asCollection(collection: Awaited<ReturnType<typeof getOrderCollection>>) {
  return collection as unknown as AdminOrdersCollection;
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value)))
    return Number(value);
  return null;
}

function dateValue(value: Date | undefined) {
  return value?.toISOString() ?? new Date(0).toISOString();
}

function statusValue(value: unknown) {
  return orderStatuses.includes(value as OrderStatus)
    ? (value as OrderStatus)
    : "pending_confirmation";
}

function paymentStatusValue(value: unknown) {
  return paymentStatuses.includes(value as PaymentStatus) ? (value as PaymentStatus) : "pending";
}

function listItem(document: AdminOrderDocument & { _id: ObjectId }): AdminOrderListItem {
  return {
    id: document._id.toHexString(),
    number: formatOrderNumber(document.orderNumber),
    customerName: document.delivery?.name ?? "Customer",
    phone: document.delivery?.phone ?? "",
    email: document.delivery?.email ?? "",
    itemCount: (document.items ?? []).reduce(
      (total, item) => total + (Number.isInteger(item.quantity) ? (item.quantity as number) : 0),
      0,
    ),
    total: numericValue(document.pricing?.total),
    status: statusValue(document.status),
    paymentStatus: paymentStatusValue(document.paymentStatus ?? document.pricing?.status),
    paymentMethod: document.paymentMethod ?? "Not recorded",
    createdAt: dateValue(document.createdAt),
  };
}

function detail(document: AdminOrderDocument & { _id: ObjectId }): AdminOrderDetail {
  const base = listItem(document);
  return {
    ...base,
    customerId: document.customerId ?? null,
    delivery: {
      name: document.delivery?.name ?? "",
      email: document.delivery?.email ?? "",
      phone: document.delivery?.phone ?? "",
      address: document.delivery?.address ?? "",
      addressLine1: document.delivery?.addressLine1 ?? "",
      addressLine2: document.delivery?.addressLine2 ?? "",
      city: document.delivery?.city ?? "",
      state: document.delivery?.state ?? "",
      postalCode: document.delivery?.postalCode ?? "",
    },
    items: (document.items ?? []).map((item) => {
      const quantity = Number.isInteger(item.quantity) ? (item.quantity as number) : 0;
      const price = item.price ?? null;
      const numericPrice = numericValue(price);
      return {
        productId: item.productId ?? "",
        productName: item.productName ?? "Motoluxe product",
        quantity,
        price,
        image: item.image ?? "",
        variant: item.variant ?? "",
        lineTotal: numericPrice === null ? null : numericPrice * quantity,
      };
    }),
    pricing: {
      subtotal: numericValue(document.pricing?.subtotal),
      shipping: numericValue(document.pricing?.shipping),
      discount: numericValue(document.pricing?.discount),
      total: numericValue(document.pricing?.total),
      status: document.pricing?.status ?? "request_price",
    },
    couponCode: document.couponCode ?? null,
    transactionReference: document.transactionReference ?? "",
    paymentNotes: document.paymentNotes ?? "",
    statusHistory: (document.statusHistory ?? []).map((entry) => ({
      status: entry.status,
      note: entry.note ?? "",
      changedAt: dateValue(entry.changedAt),
    })),
    manual: document.manual === true,
  };
}

export async function listAdminOrders(
  search = "",
  status = "",
  paymentStatus = "",
  from = "",
  to = "",
  sort = "newest",
) {
  await ensureLegacyOrderNumbers();
  const collection = asCollection(await getOrderCollection());
  const clauses: Filter<AdminOrderDocument>[] = [{ deletedAt: { $exists: false } }];
  if (search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const alternatives: Filter<AdminOrderDocument>[] = [
      { "delivery.name": { $regex: escaped, $options: "i" } },
      { "delivery.phone": { $regex: escaped, $options: "i" } },
      { "delivery.email": { $regex: escaped, $options: "i" } },
    ];
    if (ObjectId.isValid(search.trim())) alternatives.push({ _id: new ObjectId(search.trim()) });
    const numberMatch = /^MOTOLUXE-(\d+)$/i.exec(search.trim());
    if (numberMatch) alternatives.push({ orderNumber: Number(numberMatch[1]) });
    clauses.push({ $or: alternatives });
  }
  if (orderStatuses.includes(status as OrderStatus)) clauses.push({ status });
  if (paymentStatuses.includes(paymentStatus as PaymentStatus)) {
    clauses.push({
      $or: [
        { paymentStatus },
        ...(paymentStatus === "pending" ? [{ paymentStatus: { $exists: false } }] : []),
      ],
    });
  }
  if (from || to) {
    const createdAt: { $gte?: Date; $lte?: Date } = {};
    if (from) {
      const date = new Date(`${from}T00:00:00.000Z`);
      if (!Number.isNaN(date.valueOf())) createdAt.$gte = date;
    }
    if (to) {
      const date = new Date(`${to}T23:59:59.999Z`);
      if (!Number.isNaN(date.valueOf())) createdAt.$lte = date;
    }
    if (createdAt.$gte || createdAt.$lte) clauses.push({ createdAt });
  }
  const query: Filter<AdminOrderDocument> = clauses.length === 1 ? clauses[0]! : { $and: clauses };
  const documents = await collection
    .find(query)
    .sort({ createdAt: sort === "oldest" ? 1 : -1 })
    .limit(250)
    .toArray();
  const orders = documents
    .filter((document): document is AdminOrderDocument & { _id: ObjectId } => Boolean(document._id))
    .map(listItem);
  return {
    orders,
    summary: {
      total: orders.length,
      pending: orders.filter((order) => order.status === "pending_confirmation").length,
      approved: orders.filter((order) => ["approved", "processing"].includes(order.status)).length,
      shipped: orders.filter((order) => order.status === "shipped").length,
      paid: orders.filter((order) => order.paymentStatus === "paid").length,
    },
  };
}

export async function getAdminOrder(id: string) {
  if (!ObjectId.isValid(id)) return null;
  await ensureLegacyOrderNumbers();
  const collection = asCollection(await getOrderCollection());
  const document = await collection.findOne({
    _id: new ObjectId(id),
    deletedAt: { $exists: false },
  });
  return document?._id ? detail(document as AdminOrderDocument & { _id: ObjectId }) : null;
}

export function validateOrderUpdate(input: Record<string, unknown>) {
  const status = input["status"];
  const paymentStatus = input["paymentStatus"];
  const note = typeof input["note"] === "string" ? input["note"].trim() : "";
  const paymentMethod =
    typeof input["paymentMethod"] === "string" ? input["paymentMethod"].trim().slice(0, 100) : "";
  const transactionReference =
    typeof input["transactionReference"] === "string"
      ? input["transactionReference"].trim().slice(0, 150)
      : "";
  const paymentNotes =
    typeof input["paymentNotes"] === "string" ? input["paymentNotes"].trim().slice(0, 500) : "";

  if (status !== undefined && !orderStatuses.includes(status as OrderStatus)) {
    return { error: "Choose a valid order status." as const };
  }
  if (paymentStatus !== undefined && !paymentStatuses.includes(paymentStatus as PaymentStatus)) {
    return { error: "Choose a valid payment status." as const };
  }
  if (note.length > 500) return { error: "Status notes must be 500 characters or less." as const };
  return {
    input: {
      ...(status !== undefined ? { status: status as OrderStatus } : {}),
      ...(paymentStatus !== undefined ? { paymentStatus: paymentStatus as PaymentStatus } : {}),
      note,
      paymentMethod,
      transactionReference,
      paymentNotes,
    },
  };
}

export async function updateAdminOrder(
  id: string,
  input: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    note: string;
    paymentMethod: string;
    transactionReference: string;
    paymentNotes: string;
  },
) {
  if (!ObjectId.isValid(id)) return { ok: false as const, status: 404, error: "Order not found." };
  const collection = asCollection(await getOrderCollection());
  const orderId = new ObjectId(id);
  const current = await collection.findOne({ _id: orderId, deletedAt: { $exists: false } });
  if (!current) return { ok: false as const, status: 404, error: "Order not found." };
  const currentStatus = statusValue(current.status);
  if (input.status === "cancelled" && currentStatus === "delivered") {
    return { ok: false as const, status: 409, error: "Delivered orders cannot be cancelled." };
  }
  const now = new Date();
  const setValues: Record<string, unknown> = { updatedAt: now };
  if (input.status) setValues["status"] = input.status;
  if (input.paymentStatus) setValues["paymentStatus"] = input.paymentStatus;
  if (input.paymentMethod) setValues["paymentMethod"] = input.paymentMethod;
  if (input.transactionReference) setValues["transactionReference"] = input.transactionReference;
  if (input.paymentNotes) setValues["paymentNotes"] = input.paymentNotes;
  const statusChanged = input.status && input.status !== currentStatus;
  const updated = await collection.findOneAndUpdate(
    { _id: orderId, deletedAt: { $exists: false } },
    {
      $set: setValues,
      ...(statusChanged
        ? {
            $push: {
              statusHistory: {
                status: input.status as OrderStatus,
                note: input.note,
                changedAt: now,
              },
            },
          }
        : {}),
    },
    { returnDocument: "after" },
  );
  return updated?._id
    ? { ok: true as const, order: detail(updated as AdminOrderDocument & { _id: ObjectId }) }
    : {
        ok: false as const,
        status: 409,
        error: "Order changed while saving. Refresh and try again.",
      };
}

export async function archiveAdminOrder(id: string) {
  if (!ObjectId.isValid(id)) return { ok: false as const, status: 404, error: "Order not found." };
  const collection = asCollection(await getOrderCollection());
  const orderId = new ObjectId(id);
  const current = await collection.findOne({ _id: orderId, deletedAt: { $exists: false } });
  if (!current) return { ok: false as const, status: 404, error: "Order not found." };
  if (statusValue(current.status) === "delivered") {
    return { ok: false as const, status: 409, error: "Delivered orders cannot be archived." };
  }
  const now = new Date();
  const updated = await collection.updateOne(
    { _id: orderId, deletedAt: { $exists: false } },
    {
      $set: { deletedAt: now, updatedAt: now, status: "cancelled" },
      $push: {
        statusHistory: {
          status: "cancelled",
          note: "Order archived by an administrator.",
          changedAt: now,
        },
      },
    },
  );
  return updated.modifiedCount === 1
    ? { ok: true as const }
    : {
        ok: false as const,
        status: 409,
        error: "Order changed while archiving. Refresh and try again.",
      };
}
