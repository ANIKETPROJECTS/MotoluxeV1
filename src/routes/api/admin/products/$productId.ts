import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import {
  deleteCatalogProduct,
  updateCatalogProduct,
  validateCatalogInput,
} from "@/lib/server/admin-catalog";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/products/$productId")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const parsed = validateCatalogInput((await readJson(request)) as Record<string, unknown>);
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const product = await updateCatalogProduct(params.productId, parsed.input);
          if (!product) return jsonError("Product not found.", 404);
          return Response.json({ product });
        } catch (error) {
          if (error instanceof Error && error.message.includes("duplicate key")) {
            return jsonError("A product with this slug already exists.", 409);
          }
          console.error("Admin product update unavailable", error);
          return jsonError("Products are temporarily unavailable.", 503);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const deleted = await deleteCatalogProduct(params.productId);
          if (!deleted) return jsonError("Product not found.", 404);
          return Response.json({ ok: true });
        } catch (error) {
          console.error("Admin product deletion unavailable", error);
          return jsonError("Products are temporarily unavailable.", 503);
        }
      },
    },
  },
});
