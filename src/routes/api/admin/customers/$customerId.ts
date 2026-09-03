import { createFileRoute } from "@tanstack/react-router";
import {
  archiveAdminCustomer,
  getAdminCustomer,
  updateAdminCustomer,
  validateCustomerInput,
} from "@/lib/server/admin-customers";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/customers/$customerId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const customer = await getAdminCustomer(params.customerId);
          return customer ? Response.json({ customer }) : jsonError("Customer not found.", 404);
        } catch (error) {
          console.error("Admin customer detail unavailable", error);
          return jsonError("Customer details are temporarily unavailable.", 503);
        }
      },
      PUT: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const parsed = validateCustomerInput(
            (await readJson(request)) as Record<string, unknown>,
          );
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const result = await updateAdminCustomer(params.customerId, parsed.input);
          if (!result.ok) return jsonError(result.error, result.status);
          return Response.json(result);
        } catch (error) {
          console.error("Admin customer update unavailable", error);
          return jsonError("Customer update is temporarily unavailable.", 503);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const result = await archiveAdminCustomer(params.customerId);
          if (!result.ok) return jsonError(result.error, result.status);
          return Response.json(result);
        } catch (error) {
          console.error("Admin customer archive unavailable", error);
          return jsonError("Customer archive is temporarily unavailable.", 503);
        }
      },
    },
  },
});
