import { createFileRoute } from "@tanstack/react-router";
import { updateCustomerProfile } from "@/lib/server/customer-auth";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/auth/profile")({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        const body = await readJson(request);
        const name = typeof body?.["name"] === "string" ? body["name"] : "";
        const email = typeof body?.["email"] === "string" ? body["email"] : undefined;
        let customer;
        try {
          customer = await updateCustomerProfile(request, email ? { name, email } : { name });
        } catch (error) {
          console.error("Customer profile service unavailable", error);
          return jsonError(
            "Customer login is temporarily unavailable. Please try again shortly.",
            503,
          );
        }
        if (!customer) {
          return jsonError("Please provide a valid name and email.", 400);
        }
        return Response.json({ customer });
      },
    },
  },
});
