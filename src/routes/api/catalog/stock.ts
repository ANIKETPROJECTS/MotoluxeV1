import { createFileRoute } from "@tanstack/react-router";
import { getPublicCatalogStocks } from "@/lib/server/catalog-stock";

export const Route = createFileRoute("/api/catalog/stock")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return Response.json({ stocks: await getPublicCatalogStocks() });
        } catch (error) {
          console.error("Public catalog stock unavailable", error);
          return Response.json(
            { error: "Catalog stock is temporarily unavailable." },
            { status: 503 },
          );
        }
      },
    },
  },
});
