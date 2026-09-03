import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookieHeader, destroyCustomerSession } from "@/lib/server/customer-auth";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await destroyCustomerSession(request);
        return Response.json(
          { ok: true },
          { headers: { "Set-Cookie": clearSessionCookieHeader() } },
        );
      },
    },
  },
});
