import { createFileRoute } from "@tanstack/react-router";
import {
  createAdminCustomer,
  listAdminCustomers,
  validateCustomerInput,
} from "@/lib/server/admin-customers";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/customers/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const url = new URL(request.url);
          return Response.json(
            await listAdminCustomers({
              search: url.searchParams.get("search") ?? "",
              city: url.searchParams.get("city") ?? "",
              state: url.searchParams.get("state") ?? "",
              activity: url.searchParams.get("activity") ?? "",
              paid: url.searchParams.get("paid") ?? "",
              sort: url.searchParams.get("sort") ?? "joined",
              direction: url.searchParams.get("direction") ?? "desc",
            }),
          );
        } catch (error) {
          console.error("Admin customer list unavailable", error);
          return jsonError("Customers are temporarily unavailable.", 503);
        }
      },
      POST: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const parsed = validateCustomerInput(
            (await readJson(request)) as Record<string, unknown>,
          );
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const result = await createAdminCustomer(parsed.input);
          if (!result.ok) return jsonError(result.error, result.status);
          return Response.json(result, { status: 201 });
        } catch (error) {
          console.error("Admin customer creation unavailable", error);
          return jsonError("Customer creation is temporarily unavailable.", 503);
        }
      },
    },
  },
});
