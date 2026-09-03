import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import {
  deleteInventoryMovement,
  updateInventoryMovement,
  validateMovementUpdate,
} from "@/lib/server/admin-inventory";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/inventory/$movementId")({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const parsed = validateMovementUpdate(
            (await readJson(request)) as Record<string, unknown>,
          );
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const movement = await updateInventoryMovement(params.movementId, parsed.input.reason);
          if (!movement) return jsonError("Only manual movements can be edited.", 404);
          return Response.json({ movement });
        } catch (error) {
          console.error("Admin inventory movement update unavailable", error);
          return jsonError("Inventory movement is temporarily unavailable.", 503);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const result = await deleteInventoryMovement(params.movementId);
          if (!result.deleted) return jsonError(result.reason, 409);
          return Response.json({ ok: true });
        } catch (error) {
          console.error("Admin inventory movement deletion unavailable", error);
          return jsonError("Inventory movement is temporarily unavailable.", 503);
        }
      },
    },
  },
});
