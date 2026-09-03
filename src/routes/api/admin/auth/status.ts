import { createFileRoute } from "@tanstack/react-router";
import { hasAdminUsers } from "@/lib/server/admin-auth";
import { jsonError } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/auth/status")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return Response.json({ hasAdminUsers: await hasAdminUsers() });
        } catch (error) {
          console.error("Admin setup status unavailable", error);
          return jsonError("Admin setup is temporarily unavailable.", 503);
        }
      },
    },
  },
});