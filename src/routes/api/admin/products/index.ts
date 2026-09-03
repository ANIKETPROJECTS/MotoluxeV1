import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import {
  createCatalogProduct,
  listCatalogProducts,
  seedStarterCatalog,
  validateCatalogInput,
} from "@/lib/server/admin-catalog";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/products/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const url = new URL(request.url);
          const products = await listCatalogProducts(
            url.searchParams.get("search") ?? "",
            url.searchParams.get("category") ?? "",
            url.searchParams.get("stock") ?? "all",
          );
          return Response.json({ products, needsSeed: products.length === 0 });
        } catch (error) {
          console.error("Admin product list unavailable", error);
          return jsonError("Products are temporarily unavailable.", 503);
        }
      },
      POST: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const body = await readJson(request);
          if (body?.["action"] === "seed") {
            const imported = await seedStarterCatalog();
            return Response.json({ imported }, { status: 201 });
          }
          const parsed = validateCatalogInput((body ?? {}) as Record<string, unknown>);
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const product = await createCatalogProduct(parsed.input);
          if (!product) return jsonError("Product creation failed.", 500);
          return Response.json({ product }, { status: 201 });
        } catch (error) {
          if (error instanceof Error && error.message.includes("duplicate key")) {
            return jsonError("A product with this slug already exists.", 409);
          }
          console.error("Admin product creation unavailable", error);
          return jsonError("Products are temporarily unavailable.", 503);
        }
      },
    },
  },
});
