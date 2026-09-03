import { createFileRoute } from "@tanstack/react-router";
import { getAccountSnapshot } from "@/lib/server/customer-auth";
import { jsonError } from "@/lib/server/http";

export const Route = createFileRoute("/api/account/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const account = await getAccountSnapshot(request);
          if (!account) return jsonError("Please sign in to view your account.", 401);
          return Response.json(account);
        } catch (error) {
          console.error("Customer account service unavailable", error);
          return jsonError(
            "Customer account data is temporarily unavailable. Please try again shortly.",
            503,
          );
        }
      },
    },
  },
});
