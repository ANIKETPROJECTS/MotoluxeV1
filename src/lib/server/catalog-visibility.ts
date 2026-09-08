import "@tanstack/react-start/server-only";

import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";

export type PublicCatalogVisibility = {
  products: Array<{
    slug: string;
    category: string;
    published: boolean;
    featured: boolean;
  }>;
  categories: Array<{
    slug: string;
    published: boolean;
  }>;
};

type ProductVisibilityDocument = {
  slug: string;
  category: string;
  published?: boolean;
  featured?: boolean;
};

type CategoryVisibilityDocument = {
  slug: string;
  published?: boolean;
};

export async function getPublicCatalogVisibility(): Promise<PublicCatalogVisibility> {
  const { db } = await getMotoluxeDatabase();
  const [products, categories] = await Promise.all([
    db
      .collection<ProductVisibilityDocument>(MOTOLUXE_COLLECTIONS.products)
      .find({}, { projection: { slug: 1, category: 1, published: 1, featured: 1 } })
      .limit(500)
      .toArray(),
    db
      .collection<CategoryVisibilityDocument>(MOTOLUXE_COLLECTIONS.categories)
      .find({}, { projection: { slug: 1, published: 1 } })
      .limit(250)
      .toArray(),
  ]);

  return {
    products: products.map((product) => ({
      slug: product.slug,
      category: product.category,
      published: product.published !== false,
      featured: product.featured === true,
    })),
    categories: categories.map((category) => ({
      slug: category.slug,
      published: category.published !== false,
    })),
  };
}
