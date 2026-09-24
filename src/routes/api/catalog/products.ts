import { createFileRoute } from "@tanstack/react-router";
import { listPublicCatalogProducts } from "@/lib/server/admin-catalog";

export const Route = createFileRoute("/api/catalog/products")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return Response.json(
            { products: await listPublicCatalogProducts() },
            { headers: { "cache-control": "no-store" } },
          );
        } catch (error) {
          console.error("Public catalog unavailable", error);
          return Response.json(
            { error: "The product catalog is temporarily unavailable." },
            { status: 503, headers: { "cache-control": "no-store" } },
          );
        }
      },
    },
  },
});
