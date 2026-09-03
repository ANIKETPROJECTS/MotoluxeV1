import { createFileRoute } from "@tanstack/react-router";
import { findCustomerFromRequest } from "@/lib/server/customer-auth";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const customer = await findCustomerFromRequest(request);
        return Response.json({
          customer,
          authenticated: Boolean(customer),
        });
      },
    },
  },
});
