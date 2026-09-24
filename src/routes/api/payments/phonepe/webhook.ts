import { createFileRoute } from "@tanstack/react-router";
import { verifyPhonePeWebhookAuthorization } from "@/lib/server/phonepe";
import { reconcilePhonePePayment } from "@/lib/server/phonepe-payments";
import { jsonError } from "@/lib/server/http";

type PhonePeWebhookBody = {
  event?: string;
  payload?: {
    merchantOrderId?: string;
  };
};

export const Route = createFileRoute("/api/payments/phonepe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!verifyPhonePeWebhookAuthorization(request.headers.get("authorization"))) {
          return jsonError("Webhook authentication failed.", 401);
        }

        const bodyText = await request.text();
        if (bodyText.length > 64_000) return jsonError("Webhook body is too large.", 413);
        let body: PhonePeWebhookBody;
        try {
          body = JSON.parse(bodyText) as PhonePeWebhookBody;
        } catch {
          return jsonError("Webhook body is not valid JSON.", 400);
        }
        if (!["checkout.order.completed", "checkout.order.failed"].includes(body.event ?? "")) {
          return Response.json({ received: true });
        }

        const merchantOrderId = body.payload?.merchantOrderId ?? "";
        if (!/^MO[a-f0-9]{32}$/.test(merchantOrderId)) {
          return jsonError("Webhook payment reference is invalid.", 400);
        }

        try {
          const result = await reconcilePhonePePayment(merchantOrderId);
          if (!result.found) return jsonError("Payment attempt not found.", 404);
          if (result.state === "PENDING") {
            return jsonError("PhonePe has not confirmed the final payment state yet.", 503);
          }
          return Response.json({ received: true });
        } catch (error) {
          console.error("PhonePe webhook reconciliation failed", error);
          return jsonError("Payment update could not be processed yet.", 503);
        }
      },
    },
  },
});
