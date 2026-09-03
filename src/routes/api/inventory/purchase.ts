import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedCustomer, getOrderCollection } from "@/lib/server/customer-auth";
import { getProduct } from "@/data/catalog";
import { jsonError, readJson } from "@/lib/server/http";

type SubmittedItem = {
  productId?: unknown;
  quantity?: unknown;
};

export const Route = createFileRoute("/api/inventory/purchase")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let customer;
        try {
          customer = await getAuthenticatedCustomer(request);
        } catch (error) {
          console.error("Order database unavailable", error);
          return jsonError("Orders are temporarily unavailable. Please try again shortly.", 503);
        }
        if (!customer) return jsonError("Please sign in before placing an order.", 401);

        const body = await readJson(request);
        const submittedItems = Array.isArray(body?.["items"])
          ? (body["items"] as SubmittedItem[])
          : [];
        if (submittedItems.length === 0 || submittedItems.length > 20) {
          return jsonError("Add at least one product to your order.", 400);
        }

        const items = [];
        for (const submittedItem of submittedItems) {
          const productId =
            typeof submittedItem.productId === "string" ? submittedItem.productId : "";
          const product = getProduct(productId);
          const quantity = typeof submittedItem.quantity === "number" ? submittedItem.quantity : 0;
          if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
            return jsonError("One or more selected products are invalid.", 400);
          }
          items.push({
            productId: product.slug,
            productName: product.name,
            quantity,
            price: product.price,
          });
        }

        const delivery =
          body?.["delivery"] && typeof body["delivery"] === "object"
            ? (body["delivery"] as Record<string, unknown>)
            : null;
        const address = typeof delivery?.["address"] === "string" ? delivery["address"].trim() : "";
        if (address.length < 10 || address.length > 1000) {
          return jsonError("Enter your delivery details before placing the order.", 400);
        }
        const name =
          typeof delivery?.["name"] === "string" ? delivery["name"].trim() : (customer.name ?? "");
        const email =
          typeof delivery?.["email"] === "string"
            ? delivery["email"].trim().toLowerCase()
            : (customer.email ?? "");
        if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return jsonError("Enter a valid name and email for your order.", 400);
        }

        let orders;
        try {
          orders = await getOrderCollection();
        } catch (error) {
          console.error("Order database unavailable", error);
          return jsonError("Orders are temporarily unavailable. Please try again shortly.", 503);
        }

        const order = {
          customerId: customer._id.toHexString(),
          items,
          couponCode:
            typeof body?.["couponCode"] === "string"
              ? body["couponCode"].trim().slice(0, 40)
              : undefined,
          delivery: {
            name,
            email,
            phone: customer.phone,
            address,
          },
          pricing: {
            subtotal: null,
            shipping: null,
            total: null,
            status: "request_price",
          },
          status: "pending_confirmation",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const result = await orders.insertOne(order);
        return Response.json(
          { ok: true, orderId: result.insertedId.toHexString() },
          { status: 201 },
        );
      },
    },
  },
});
