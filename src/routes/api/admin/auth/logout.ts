import { createFileRoute } from "@tanstack/react-router";
import { clearAdminSessionCookieHeader, destroyAdminSession } from "@/lib/server/admin-auth";

export const Route = createFileRoute("/api/admin/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await destroyAdminSession(request);
        return Response.json(
          { ok: true },
          { headers: { "Set-Cookie": clearAdminSessionCookieHeader() } },
        );
      },
    },
  },
});
