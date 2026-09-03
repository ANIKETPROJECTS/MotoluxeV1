import { createFileRoute } from "@tanstack/react-router";
import {
  createCustomerReview,
  listCustomerReviewEligibility,
  validateCustomerReviewInput,
} from "@/lib/server/admin-reviews";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/account/reviews")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const eligible = await listCustomerReviewEligibility(request);
          if (!eligible) return jsonError("Please sign in to review a product.", 401);
          return Response.json({ eligible });
        } catch (error) {
          console.error("Customer review eligibility unavailable", error);
          return jsonError("Review data is temporarily unavailable.", 503);
        }
      },
      POST: async ({ request }) => {
        try {
          const parsed = validateCustomerReviewInput(
            (await readJson(request)) as Record<string, unknown>,
          );
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const result = await createCustomerReview(request, parsed.input);
          if ("error" in result) return jsonError(result.error, 400);
          return Response.json(result, { status: 201 });
        } catch (error) {
          console.error("Customer review creation unavailable", error);
          return jsonError("Review submission is temporarily unavailable.", 503);
        }
      },
    },
  },
});
