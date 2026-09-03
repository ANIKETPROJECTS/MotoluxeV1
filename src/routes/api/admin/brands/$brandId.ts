import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import {
  deleteCatalogBrand,
  updateCatalogBrand,
  validateBrandInput,
} from "@/lib/server/admin-taxonomy";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/brands/$brandId")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const parsed = validateBrandInput((await readJson(request)) as Record<string, unknown>);
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const brand = await updateCatalogBrand(params.brandId, parsed.input);
          if (!brand) return jsonError("Brand not found.", 404);
          return Response.json({ brand });
        } catch (error) {
          if (error instanceof Error && error.message.includes("duplicate key")) {
            return jsonError("A brand with this slug already exists.", 409);
          }
          console.error("Admin brand update unavailable", error);
          return jsonError("Brands are temporarily unavailable.", 503);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const result = await deleteCatalogBrand(params.brandId);
          if (!result.deleted)
            return jsonError(result.reason, result.reason.includes("Reassign") ? 409 : 404);
          return Response.json({ ok: true });
        } catch (error) {
          console.error("Admin brand deletion unavailable", error);
          return jsonError("Brands are temporarily unavailable.", 503);
        }
      },
    },
  },
});
