import { createFileRoute } from "@tanstack/react-router";
import { getAuthenticatedCustomer } from "@/lib/server/customer-auth";
import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";
import { reconcilePhonePePayment } from "@/lib/server/phonepe-payments";
import { jsonError } from "@/lib/server/http";

type AttemptOwnerDocument = {
  merchantOrderId: string;
  customerId: string;
};

export const Route = createFileRoute("/api/payments/phonepe/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const merchantOrderId = new URL(request.url).searchParams.get("merchantOrderId") ?? "";
        if (!/^MO[a-f0-9]{32}$/.test(merchantOrderId)) {
          return jsonError("A valid payment reference is required.", 400);
        }

        let customer;
        try {
          customer = await getAuthenticatedCustomer(request);
        } catch (error) {
          console.error("Payment status customer lookup unavailable", error);
          return jsonError("Payment status is temporarily unavailable.", 503);
        }
        if (!customer) return jsonError("Please sign in to check this payment.", 401);

        try {
          const { db } = await getMotoluxeDatabase();
          const attempt = await db
            .collection<AttemptOwnerDocument>(MOTOLUXE_COLLECTIONS.paymentAttempts)
            .findOne({ merchantOrderId, customerId: customer._id.toHexString() });
          if (!attempt) return jsonError("Payment reference not found.", 404);

          return Response.json(await reconcilePhonePePayment(merchantOrderId), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          console.error("PhonePe payment status verification failed", error);
          return jsonError("We could not verify the payment with PhonePe yet.", 503);
        }
      },
    },
  },
});
