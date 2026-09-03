import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import { listAdminOrders } from "@/lib/server/admin-orders";
import { jsonError } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/orders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request)))
            return jsonError("Admin authentication required.", 401);
          const url = new URL(request.url);
          return Response.json(
            await listAdminOrders(
              url.searchParams.get("search") ?? "",
              url.searchParams.get("status") ?? "",
              url.searchParams.get("paymentStatus") ?? "",
              url.searchParams.get("from") ?? "",
              url.searchParams.get("to") ?? "",
              url.searchParams.get("sort") ?? "newest",
            ),
          );
        } catch (error) {
          console.error("Admin order list unavailable", error);
          return jsonError("Orders are temporarily unavailable.", 503);
        }
      },
    },
  },
});
