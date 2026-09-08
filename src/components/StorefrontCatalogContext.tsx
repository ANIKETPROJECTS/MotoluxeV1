import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getProduct, type Category, type Product } from "@/data/catalog";

type VisibilityProduct = {
  category: string;
  published: boolean;
  featured: boolean;
};

type VisibilityPayload = {
  products?: Array<{
    slug: string;
    category: string;
    published: boolean;
    featured: boolean;
  }>;
  categories?: Array<{
    slug: string;
    published: boolean;
  }>;
};

type StorefrontCatalogContextValue = {
  loading: boolean;
  isCategoryPublished: (slug: string) => boolean;
  isProductPublished: (slug: string) => boolean;
  isProductFeatured: (slug: string) => boolean;
  filterCategories: <T extends Category>(items: T[]) => T[];
  filterProducts: <T extends Product>(items: T[]) => T[];
  filterFeaturedProducts: <T extends Product>(items: T[]) => T[];
};

const StorefrontCatalogContext = createContext<StorefrontCatalogContextValue | null>(null);

export function StorefrontCatalogProvider({ children }: { children: ReactNode }) {
  const [categoryVisibility, setCategoryVisibility] = useState<Record<string, boolean>>({});
  const [productVisibility, setProductVisibility] = useState<Record<string, VisibilityProduct>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog/visibility", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as VisibilityPayload;
        if (!response.ok) throw new Error("Catalog visibility unavailable.");
        return payload;
      })
      .then((payload) => {
        setCategoryVisibility(
          Object.fromEntries(
            (payload.categories ?? []).map((category) => [category.slug, category.published]),
          ),
        );
        setProductVisibility(
          Object.fromEntries(
            (payload.products ?? []).map((product) => [
              product.slug,
              {
                category: product.category,
                published: product.published,
                featured: product.featured,
              },
            ]),
          ),
        );
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const value = useMemo<StorefrontCatalogContextValue>(
    () => ({
      loading,
      isCategoryPublished: (slug) => categoryVisibility[slug] !== false,
      isProductPublished: (slug) => {
        const product = productVisibility[slug];
        const category = product?.category ?? getProduct(slug)?.category;
        return (
          product?.published !== false && (category ? categoryVisibility[category] !== false : true)
        );
      },
      isProductFeatured: (slug) => productVisibility[slug]?.featured !== false,
      filterCategories: (items) => items.filter((item) => categoryVisibility[item.slug] !== false),
      filterProducts: (items) =>
        items.filter((item) => {
          const visibility = productVisibility[item.slug];
          const category = visibility?.category ?? item.category;
          return visibility?.published !== false && categoryVisibility[category] !== false;
        }),
      filterFeaturedProducts: (items) =>
        items.filter((item) => {
          const visibility = productVisibility[item.slug];
          const category = visibility?.category ?? item.category;
          return (
            visibility?.published !== false &&
            visibility?.featured !== false &&
            categoryVisibility[category] !== false
          );
        }),
    }),
    [categoryVisibility, loading, productVisibility],
  );

  return (
    <StorefrontCatalogContext.Provider value={value}>{children}</StorefrontCatalogContext.Provider>
  );
}

export function useStorefrontCatalog() {
  const context = useContext(StorefrontCatalogContext);
  if (!context)
    throw new Error("useStorefrontCatalog must be used inside StorefrontCatalogProvider");
  return context;
}
