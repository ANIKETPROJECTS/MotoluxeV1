import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import {
  createCatalogCategory,
  listCatalogCategories,
  seedStarterCategories,
  validateCategoryInput,
} from "@/lib/server/admin-taxonomy";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/categories/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const url = new URL(request.url);
          const categories = await listCatalogCategories(
            url.searchParams.get("search") ?? "",
            url.searchParams.get("published") ?? "all",
          );
          return Response.json({ categories, needsSeed: categories.length === 0 });
        } catch (error) {
          console.error("Admin category list unavailable", error);
          return jsonError("Categories are temporarily unavailable.", 503);
        }
      },
      POST: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const body = await readJson(request);
          if (body?.["action"] === "seed") {
            const imported = await seedStarterCategories();
            return Response.json({ imported }, { status: 201 });
          }
          const parsed = validateCategoryInput((body ?? {}) as Record<string, unknown>);
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const category = await createCatalogCategory(parsed.input);
          if (!category) return jsonError("The selected parent category was not found.", 400);
          return Response.json({ category }, { status: 201 });
        } catch (error) {
          if (error instanceof Error && error.message.includes("duplicate key")) {
            return jsonError("A category with this slug already exists.", 409);
          }
          console.error("Admin category creation unavailable", error);
          return jsonError("Categories are temporarily unavailable.", 503);
        }
      },
    },
  },
});
