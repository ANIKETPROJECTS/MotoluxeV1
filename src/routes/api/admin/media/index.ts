import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import { listMediaAssets } from "@/lib/server/admin-media";
import { jsonError } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/media/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const url = new URL(request.url);
          const assets = await listMediaAssets({
            query: url.searchParams.get("query") ?? "",
            kind: url.searchParams.get("kind") ?? "",
          });
          return Response.json({ assets });
        } catch (error) {
          console.error("Media library unavailable", error);
          return jsonError("Media library is temporarily unavailable.", 503);
        }
      },
    },
  },
});
