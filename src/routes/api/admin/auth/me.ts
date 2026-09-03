import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import { jsonError } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return Response.json({ admin: await findAdminFromRequest(request) });
        } catch (error) {
          console.error("Admin session lookup unavailable", error);
          return jsonError("Admin login is temporarily unavailable.", 503);
        }
      },
    },
  },
});
