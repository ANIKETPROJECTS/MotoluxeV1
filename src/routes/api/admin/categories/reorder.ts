import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import { reorderCatalogCategories } from "@/lib/server/admin-taxonomy";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/categories/reorder")({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const body = await readJson(request);
          const items = Array.isArray(body?.["items"])
            ? body["items"].filter(
                (item): item is { id: string; displayOrder: number } =>
                  Boolean(item) &&
                  typeof item === "object" &&
                  typeof item["id"] === "string" &&
                  typeof item["displayOrder"] === "number",
              )
            : [];
          if (!items.length) return jsonError("Provide category order values to save.", 400);
          await reorderCatalogCategories(items);
          return Response.json({ ok: true });
        } catch (error) {
          console.error("Admin category reorder unavailable", error);
          return jsonError("Category order is temporarily unavailable.", 503);
        }
      },
    },
  },
});
