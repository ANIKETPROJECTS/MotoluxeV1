import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import {
  createCatalogBrand,
  listCatalogBrands,
  validateBrandInput,
} from "@/lib/server/admin-taxonomy";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/brands/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const url = new URL(request.url);
          const brands = await listCatalogBrands(
            url.searchParams.get("search") ?? "",
            url.searchParams.get("active") ?? "all",
          );
          return Response.json({ brands });
        } catch (error) {
          console.error("Admin brand list unavailable", error);
          return jsonError("Brands are temporarily unavailable.", 503);
        }
      },
      POST: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const parsed = validateBrandInput((await readJson(request)) as Record<string, unknown>);
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const brand = await createCatalogBrand(parsed.input);
          if (!brand) return jsonError("Brand creation failed.", 500);
          return Response.json({ brand }, { status: 201 });
        } catch (error) {
          if (error instanceof Error && error.message.includes("duplicate key")) {
            return jsonError("A brand with this slug already exists.", 409);
          }
          console.error("Admin brand creation unavailable", error);
          return jsonError("Brands are temporarily unavailable.", 503);
        }
      },
    },
  },
});
