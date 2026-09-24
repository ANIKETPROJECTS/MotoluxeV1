import { createFileRoute } from "@tanstack/react-router";
import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { getAuthenticatedCustomer } from "@/lib/server/customer-auth";
import { getStorefrontSettings } from "@/lib/server/admin-settings";
import { calculateCouponDiscount, isCouponCurrentlyActive, numericPrice } from "@/lib/coupon-types";
import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";
import { initiatePhonePeCheckout } from "@/lib/server/phonepe";
import { jsonError, readJson } from "@/lib/server/http";

type SubmittedItem = {
  productId?: unknown;
  quantity?: unknown;
};

type CheckoutProductDocument = {
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

type PaymentAttemptDocument = {
  merchantOrderId: string;
  customerId: string;
  items: Array<{
    productDocumentId: string;
    productSlug: string;
    productName: string;
    quantity: number;
    price: number;
    image: string;
    size: string;
  }>;
  delivery: { name: string; email: string; phone: string; address: string };
  pricing: { subtotal: number; shipping: number; discount: number; total: number };
  couponCode?: string;
  amountPaise: number;
  state: "pending" | "failed" | "initiation_failed" | "paid" | "paid_inventory_issue";
  phonepeOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export const Route = createFileRoute("/api/inventory/purchase")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let customer;
        try {
          customer = await getAuthenticatedCustomer(request);
        } catch (error) {
          console.error("Checkout customer lookup unavailable", error);
          return jsonError("Checkout is temporarily unavailable. Please try again shortly.", 503);
        }
        if (!customer) return jsonError("Please sign in before placing an order.", 401);

        let settings;
        try {
          settings = await getStorefrontSettings();
        } catch (error) {
          console.error("Storefront settings unavailable", error);
          return jsonError("Checkout is temporarily unavailable. Please try again shortly.", 503);
        }
        if (!settings.ordersEnabled) {
          return Response.json(
            { error: "Orders are temporarily paused. Please check back soon." },
            { status: 423 },
          );
        }

        const body = await readJson(request);
        const submittedItems = Array.isArray(body?.["items"])
          ? (body["items"] as SubmittedItem[])
          : [];
        if (submittedItems.length === 0 || submittedItems.length > 20) {
          return jsonError("Add at least one product to your order.", 400);
        }

        const requestedItems: Array<{ slug: string; quantity: number }> = [];
        const requestedSlugs = new Set<string>();
        for (const item of submittedItems) {
          const slug = typeof item.productId === "string" ? item.productId.trim() : "";
          const quantity = typeof item.quantity === "number" ? item.quantity : 0;
          if (
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 99 ||
            requestedSlugs.has(slug)
          ) {
            return jsonError("One or more selected products are invalid.", 400);
          }
          requestedSlugs.add(slug);
          requestedItems.push({ slug, quantity });
        }

        const submittedCouponCode =
          typeof body?.["couponCode"] === "string"
            ? body["couponCode"].trim().toUpperCase().slice(0, 32)
            : "";
        const coupon = submittedCouponCode
          ? settings.coupons.find(
              (candidate) =>
                candidate.code === submittedCouponCode && isCouponCurrentlyActive(candidate),
            )
          : null;
        if (submittedCouponCode && !coupon) {
          return jsonError("That coupon is no longer active or does not exist.", 400);
        }

        const delivery =
          body?.["delivery"] && typeof body["delivery"] === "object"
            ? (body["delivery"] as Record<string, unknown>)
            : null;
        const address = typeof delivery?.["address"] === "string" ? delivery["address"].trim() : "";
        const name =
          typeof delivery?.["name"] === "string" ? delivery["name"].trim() : (customer.name ?? "");
        const accountEmail =
          typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
        const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountEmail) ? accountEmail : "";
        if (address.length < 10 || address.length > 1000 || name.length < 2 || name.length > 100) {
          return jsonError(
            "Enter a valid name and a delivery address of at least 10 characters.",
            400,
          );
        }

        let database;
        try {
          database = await getMotoluxeDatabase();
        } catch (error) {
          console.error("Checkout database unavailable", error);
          return jsonError("Checkout is temporarily unavailable. Please try again shortly.", 503);
        }
        const productCollection = database.db.collection<CheckoutProductDocument>(
          MOTOLUXE_COLLECTIONS.products,
        );
        const products = await productCollection
          .find({
            slug: { $in: requestedItems.map((item) => item.slug) },
            published: { $ne: false },
          })
          .toArray();
        const productBySlug = new Map(products.map((product) => [product.slug, product]));
        if (productBySlug.size !== requestedItems.length) {
          return jsonError("One or more selected products are no longer available.", 409);
        }
        const categorySlugs = [...new Set(products.map((product) => product.category))];
        const categoryDocuments = await database.db
          .collection<{ slug: string; published?: boolean }>(MOTOLUXE_COLLECTIONS.categories)
          .find({ slug: { $in: categorySlugs } }, { projection: { slug: 1, published: 1 } })
          .toArray();
        const unpublishedCategories = new Set(
          categoryDocuments
            .filter((category) => category.published === false)
            .map((category) => category.slug),
        );

        const items: PaymentAttemptDocument["items"] = [];
        for (const requested of requestedItems) {
          const product = productBySlug.get(requested.slug);
          if (!product || unpublishedCategories.has(product.category)) {
            return jsonError("One or more selected products are no longer available.", 409);
          }
          const stock = Number.isInteger(product.stock) ? (product.stock as number) : 0;
          if (stock < requested.quantity) {
            return jsonError(
              `${product.name} only has ${stock} unit${stock === 1 ? "" : "s"} available.`,
              409,
            );
          }
          const price = numericPrice(product.price);
          if (!Number.isFinite(price) || price <= 0) {
            return jsonError(
              `${product.name} does not have an online price set yet. Please contact Motoluxe for pricing.`,
              422,
            );
          }
          if (!product._id) {
            return jsonError(
              "A product record is incomplete. Please contact Motoluxe support.",
              503,
            );
          }
          items.push({
            productDocumentId: product._id.toHexString(),
            productSlug: product.slug,
            productName: product.name,
            quantity: requested.quantity,
            price,
            image: product.image,
            size: product.size,
          });
        }

        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        if (coupon && subtotal < coupon.minimumOrderValue) {
          return jsonError(
            `This coupon requires a minimum order of ₹${coupon.minimumOrderValue}.`,
            400,
          );
        }
        const discount = coupon ? calculateCouponDiscount(coupon, subtotal) : 0;
        const total = Math.round((subtotal - discount) * 100) / 100;
        const amountPaise = Math.round(total * 100);
        if (!Number.isSafeInteger(amountPaise) || amountPaise < 1) {
          return jsonError("The order total is not valid for online payment.", 422);
        }

        const merchantOrderId = `MO${randomUUID().replaceAll("-", "")}`;
        const now = new Date();
        const attempt: PaymentAttemptDocument = {
          merchantOrderId,
          customerId: customer._id.toHexString(),
          items,
          delivery: {
            name,
            email,
            phone: customer.phone,
            address,
          },
          pricing: { subtotal, shipping: 0, discount, total },
          ...(coupon ? { couponCode: coupon.code } : {}),
          amountPaise,
          state: "pending",
          createdAt: now,
          updatedAt: now,
        };
        const attempts = database.db.collection<PaymentAttemptDocument>(
          MOTOLUXE_COLLECTIONS.paymentAttempts,
        );
        await attempts.insertOne(attempt);

        try {
          const redirectUrl = new URL(
            `/order/return?merchantOrderId=${encodeURIComponent(merchantOrderId)}`,
            request.url,
          ).toString();
          const checkout = await initiatePhonePeCheckout({
            merchantOrderId,
            amountPaise,
            redirectUrl,
            phoneNumber: customer.phone,
          });
          const safeRedirectUrl = new URL(checkout.redirectUrl);
          if (safeRedirectUrl.protocol !== "https:") {
            throw new Error("PhonePe returned an invalid checkout URL.");
          }
          await attempts.updateOne(
            { merchantOrderId },
            {
              $set: {
                phonepeOrderId: checkout.orderId,
                updatedAt: new Date(),
              },
            },
          );
          return Response.json(
            { ok: true, merchantOrderId, redirectUrl: safeRedirectUrl.toString() },
            { status: 201, headers: { "cache-control": "no-store" } },
          );
        } catch (error) {
          console.error("PhonePe checkout initiation failed", error);
          await attempts.updateOne(
            { merchantOrderId, state: "pending" },
            { $set: { state: "initiation_failed", updatedAt: new Date() } },
          );
          return jsonError(
            "We could not start PhonePe checkout. Your order has not been placed; please try again.",
            503,
          );
        }
      },
    },
  },
});
