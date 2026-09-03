import { createFileRoute } from "@tanstack/react-router";
import { updateCustomerWishlist } from "@/lib/server/customer-auth";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/account/wishlist")({
  server: {
    handlers: {
      PUT: async ({ request }) => {
        const body = await readJson(request);
        const submittedSlugs = body?.["wishlistSlugs"];
        if (
          !Array.isArray(submittedSlugs) ||
          submittedSlugs.length > 50 ||
          submittedSlugs.some((slug) => typeof slug !== "string")
        ) {
          return jsonError("That wishlist update is not valid.", 400);
        }

        try {
          const wishlistSlugs = await updateCustomerWishlist(request, submittedSlugs);
          if (!wishlistSlugs) return jsonError("Please sign in to update your wishlist.", 401);
          return Response.json({ wishlistSlugs });
        } catch (error) {
          console.error("Customer wishlist service unavailable", error);
          return jsonError(
            "Your wishlist is temporarily unavailable. Please try again shortly.",
            503,
          );
        }
      },
    },
  },
});
