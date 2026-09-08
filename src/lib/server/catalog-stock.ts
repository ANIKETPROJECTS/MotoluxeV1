import "@tanstack/react-start/server-only";

import { products } from "@/data/catalog";
import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";

type CatalogStockDocument = {
  slug: string;
  stock?: number;
};

export async function getPublicCatalogStocks() {
  const { db } = await getMotoluxeDatabase();
  const slugs = products.map((product) => product.slug);
  const documents = await db
    .collection<CatalogStockDocument>(MOTOLUXE_COLLECTIONS.products)
    .find({ slug: { $in: slugs } }, { projection: { _id: 0, slug: 1, stock: 1 } })
    .toArray();
  const stockBySlug = Object.fromEntries(
    documents.map((document) => [
      document.slug,
      Number.isInteger(document.stock) ? document.stock : 0,
    ]),
  );

  return Object.fromEntries(slugs.map((slug) => [slug, stockBySlug[slug] ?? 0]));
}
