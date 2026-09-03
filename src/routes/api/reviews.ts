import { createFileRoute } from "@tanstack/react-router";
import { listApprovedReviews } from "@/lib/server/admin-reviews";

export const Route = createFileRoute("/api/reviews")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const reviews = await listApprovedReviews(url.searchParams.get("product") ?? undefined);
          return Response.json({ reviews });
        } catch (error) {
          console.error("Public review list unavailable", error);
          return Response.json({ error: "Reviews are temporarily unavailable." }, { status: 503 });
        }
      },
    },
  },
});
