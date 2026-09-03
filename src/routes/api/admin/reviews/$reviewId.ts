import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import {
  deleteAdminReview,
  updateAdminReview,
  validateReviewInput,
} from "@/lib/server/admin-reviews";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/reviews/$reviewId")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const parsed = validateReviewInput((await readJson(request)) as Record<string, unknown>);
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const review = await updateAdminReview(params.reviewId, parsed.input);
          if (!review) return jsonError("Review or product not found.", 404);
          return Response.json({ review });
        } catch (error) {
          console.error("Admin review update unavailable", error);
          return jsonError("Reviews are temporarily unavailable.", 503);
        }
      },
      PUT: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const parsed = validateReviewInput((await readJson(request)) as Record<string, unknown>);
          if ("error" in parsed) return jsonError(parsed.error, 400);
          const review = await updateAdminReview(params.reviewId, parsed.input);
          if (!review) return jsonError("Review or product not found.", 404);
          return Response.json({ review });
        } catch (error) {
          console.error("Admin review update unavailable", error);
          return jsonError("Reviews are temporarily unavailable.", 503);
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          if (!(await deleteAdminReview(params.reviewId))) {
            return jsonError("Review not found.", 404);
          }
          return Response.json({ ok: true });
        } catch (error) {
          console.error("Admin review deletion unavailable", error);
          return jsonError("Reviews are temporarily unavailable.", 503);
        }
      },
    },
  },
});
