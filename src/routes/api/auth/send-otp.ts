import { createFileRoute } from "@tanstack/react-router";
import { issueOtp, normalizePhone } from "@/lib/server/customer-auth";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/auth/send-otp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readJson(request);
        const phone = normalizePhone(body?.["phone"]);
        if (!phone) {
          return jsonError("Enter a valid phone number.", 400);
        }
        if (process.env["NODE_ENV"] === "production") {
          return jsonError("Phone verification is not configured for production yet.", 503);
        }

        let result;
        try {
          result = await issueOtp(phone);
        } catch (error) {
          console.error("Customer OTP service unavailable", error);
          return jsonError(
            "Customer login is temporarily unavailable. Please try again shortly.",
            503,
          );
        }
        if (result.cooldown) {
          return jsonError("Please wait a few seconds before requesting another code.", 429);
        }

        return Response.json({
          ok: true,
          message: "Your one-time code is ready.",
          ...(result.developmentOtp
            ? {
                developmentOtp: result.developmentOtp,
                developmentOnly: true,
              }
            : {}),
        });
      },
    },
  },
});
