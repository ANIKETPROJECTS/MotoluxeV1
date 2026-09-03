import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import {
  createAdminReview,
  listAdminReviews,
  listReviewProducts,
  validateReviewInput,
} from "@/lib/server/admin-reviews";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/reviews/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const url = new URL(request.url);
          const [reviews, products] = await Promise.all([
            listAdminReviews({
              search: url.searchParams.get("search") ?? "",
              status: url.searchParams.get("status") ?? "",
              rating: url.searchParams.get("rating") ?? "",
            }),
            listReviewProducts(),
          ]);
          return Response.json({ reviews, products });
        } catch (error) {
          console.error("Admin review list unavailable", error);
          return jsonError("Reviews are temporarily unavailable.", 503);
        }
      },
      POST: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const parsed = validateReviewInput((await readJson(request)) as Record<string, unknown>);
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const review = await createAdminReview(parsed.input);
          if (!review) return jsonError("Choose a product from the MongoDB catalog.", 400);
          return Response.json({ review }, { status: 201 });
        } catch (error) {
          console.error("Admin review creation unavailable", error);
          return jsonError("Reviews are temporarily unavailable.", 503);
        }
      },
    },
  },
});
