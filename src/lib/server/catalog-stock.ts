import "@tanstack/react-start/server-only";

import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";

type CatalogStockDocument = {
  slug: string;
  stock?: number;
};

export async function getPublicCatalogStocks() {
  const { db } = await getMotoluxeDatabase();
  const documents = await db
    .collection<CatalogStockDocument>(MOTOLUXE_COLLECTIONS.products)
    .find({}, { projection: { _id: 0, slug: 1, stock: 1 } })
    .limit(500)
    .toArray();
  return Object.fromEntries(
    documents.map((document) => [
      document.slug,
      Number.isInteger(document.stock) ? document.stock : 0,
    ]),
  );
}
