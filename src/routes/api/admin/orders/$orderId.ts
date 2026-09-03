import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import {
  archiveAdminOrder,
  getAdminOrder,
  updateAdminOrder,
  validateOrderUpdate,
} from "@/lib/server/admin-orders";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/orders/$orderId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const order = await getAdminOrder(params.orderId);
          return order ? Response.json({ order }) : jsonError("Order not found.", 404);
        } catch (error) {
          console.error("Admin order detail unavailable", error);
          return jsonError("Order details are temporarily unavailable.", 503);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const parsed = validateOrderUpdate((await readJson(request)) as Record<string, unknown>);
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const result = await updateAdminOrder(params.orderId, parsed.input);
          if (!result.ok) return jsonError(result.error, result.status);
          return Response.json({ order: result.order });
        } catch (error) {
          console.error("Admin order update unavailable", error);
          return jsonError("Order update is temporarily unavailable.", 503);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const result = await archiveAdminOrder(params.orderId);
          if (!result.ok) return jsonError(result.error, result.status);
          return Response.json({ ok: true });
        } catch (error) {
          console.error("Admin order archive unavailable", error);
          return jsonError("Order archive is temporarily unavailable.", 503);
        }
      },
    },
  },
});
