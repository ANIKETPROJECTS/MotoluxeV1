import { createFileRoute } from "@tanstack/react-router";
import { getPublicCatalogVisibility } from "@/lib/server/catalog-visibility";

export const Route = createFileRoute("/api/catalog/visibility")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return Response.json(await getPublicCatalogVisibility(), {
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          console.error("Public catalog visibility unavailable", error);
          return Response.json(
            { error: "Catalog visibility is temporarily unavailable." },
            { status: 503 },
          );
        }
      },
    },
  },
});
