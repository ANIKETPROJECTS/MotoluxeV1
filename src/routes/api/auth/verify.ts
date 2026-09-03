import { createFileRoute } from "@tanstack/react-router";
import { normalizePhone, sessionCookieHeader, verifyOtp } from "@/lib/server/customer-auth";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/auth/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readJson(request);
        const phone = normalizePhone(body?.["phone"]);
        const otp = typeof body?.["otp"] === "string" ? body["otp"].replace(/\D/g, "") : "";
        const name = typeof body?.["name"] === "string" ? body["name"].trim() : "";
        if (!phone || otp.length !== 6) {
          return jsonError("Enter the six-digit code sent to your phone.", 400);
        }
        if (name.length < 2 || name.length > 100) {
          return jsonError("Enter your full name before signing in.", 400);
        }

        let result;
        try {
          result = await verifyOtp(phone, otp, name);
        } catch (error) {
          console.error("Customer verification service unavailable", error);
          return jsonError(
            "Customer login is temporarily unavailable. Please try again shortly.",
            503,
          );
        }
        if ("error" in result) return jsonError(result.error, 400);

        return Response.json(
          { customer: result.customer },
          { headers: { "Set-Cookie": sessionCookieHeader(result.sessionCookie) } },
        );
      },
    },
  },
});
