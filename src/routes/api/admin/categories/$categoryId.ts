import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import {
  deleteCatalogCategory,
  listCatalogCategories,
  updateCatalogCategory,
  validateCategoryInput,
} from "@/lib/server/admin-taxonomy";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/categories/$categoryId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const category = (await listCatalogCategories()).find(
            (item) => item.id === params.categoryId,
          );
          if (!category) return jsonError("Category not found.", 404);
          return Response.json({ category });
        } catch (error) {
          console.error("Admin category lookup unavailable", error);
          return jsonError("Categories are temporarily unavailable.", 503);
        }
      },
      PUT: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const parsed = validateCategoryInput(
            (await readJson(request)) as Record<string, unknown>,
          );
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const category = await updateCatalogCategory(params.categoryId, parsed.input);
          if (!category) return jsonError("Category or parent category was not found.", 404);
          return Response.json({ category });
        } catch (error) {
          if (error instanceof Error && error.message.includes("duplicate key")) {
            return jsonError("A category with this slug already exists.", 409);
          }
          console.error("Admin category update unavailable", error);
          return jsonError("Categories are temporarily unavailable.", 503);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const result = await deleteCatalogCategory(params.categoryId);
          if (!result.deleted)
            return jsonError(result.reason, result.reason.includes("Reassign") ? 409 : 404);
          return Response.json({ ok: true });
        } catch (error) {
          console.error("Admin category deletion unavailable", error);
          return jsonError("Categories are temporarily unavailable.", 503);
        }
      },
    },
  },
});
