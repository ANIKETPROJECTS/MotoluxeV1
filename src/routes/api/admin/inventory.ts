import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import {
  adjustInventory,
  listInventory,
  validateAdjustmentInput,
} from "@/lib/server/admin-inventory";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/inventory")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const url = new URL(request.url);
          return Response.json(
            await listInventory(
              url.searchParams.get("productId") ?? "",
              url.searchParams.get("eventType") ?? "",
              url.searchParams.get("from") ?? "",
              url.searchParams.get("to") ?? "",
            ),
          );
        } catch (error) {
          console.error("Admin inventory list unavailable", error);
          return jsonError("Inventory is temporarily unavailable.", 503);
        }
      },
      POST: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const parsed = validateAdjustmentInput(
            (await readJson(request)) as Record<string, unknown>,
          );
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const result = await adjustInventory(parsed.input);
          if (!result.ok) return jsonError(result.error, result.status);
          if (!("movement" in result))
            return jsonError("The stock adjustment was not recorded.", 503);
          return Response.json({ movement: result.movement }, { status: 201 });
        } catch (error) {
          console.error("Admin inventory adjustment unavailable", error);
          return jsonError("Inventory adjustment is temporarily unavailable.", 503);
        }
      },
    },
  },
});
