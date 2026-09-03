import { createFileRoute } from "@tanstack/react-router";
import { loginCustomer, normalizePhone, sessionCookieHeader } from "@/lib/server/customer-auth";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readJson(request);
        const phone = normalizePhone(body?.["phone"]);
        const name = typeof body?.["name"] === "string" ? body["name"].trim() : "";

        if (!phone) return jsonError("Enter a valid phone number.", 400);
        if (name.length < 2 || name.length > 100) {
          return jsonError("Enter your full name.", 400);
        }

        try {
          const result = await loginCustomer(phone, name);
          if ("error" in result) return jsonError(result.error, 500);

          return Response.json(
            { customer: result.customer },
            { headers: { "Set-Cookie": sessionCookieHeader(result.sessionCookie) } },
          );
        } catch (error) {
          console.error("Customer login service unavailable", error);
          return jsonError(
            "Customer login is temporarily unavailable. Please try again shortly.",
            503,
          );
        }
      },
    },
  },
});