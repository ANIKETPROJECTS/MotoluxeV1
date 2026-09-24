import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getProduct, type Category, type Product } from "@/data/catalog";
import {
  CATALOG_VISIBILITY_EVENT,
  CATALOG_VISIBILITY_STORAGE_KEY,
} from "@/lib/catalog-visibility-events";

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
  products: Product[];
  isCategoryPublished: (slug: string) => boolean;
  isProductPublished: (slug: string) => boolean;
  isProductFeatured: (slug: string) => boolean;
  filterCategories: <T extends Category>(items: T[]) => T[];
  filterProducts: <T extends Product>(items: T[]) => T[];
  filterFeaturedProducts: <T extends Product>(items: T[]) => T[];
};

type ProductPayload = {
  products?: Product[];
};

const StorefrontCatalogContext = createContext<StorefrontCatalogContextValue | null>(null);

export function StorefrontCatalogProvider({ children }: { children: ReactNode }) {
  const [categoryVisibility, setCategoryVisibility] = useState<Record<string, boolean>>({});
  const [productVisibility, setProductVisibility] = useState<Record<string, VisibilityProduct>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let controller: AbortController | null = null;
    let disposed = false;

    async function refreshVisibility() {
      controller?.abort();
      controller = new AbortController();
      setLoading(true);
      try {
        const [visibilityResponse, productsResponse] = await Promise.all([
          fetch("/api/catalog/visibility", {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch("/api/catalog/products", {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);
        const [payload, productsPayload] = (await Promise.all([
          visibilityResponse.json().catch(() => ({})),
          productsResponse.json().catch(() => ({})),
        ])) as [VisibilityPayload, ProductPayload];
        if (!visibilityResponse.ok || !productsResponse.ok) throw new Error("Catalog unavailable.");
        if (disposed) return;
        setProducts(Array.isArray(productsPayload.products) ? productsPayload.products : []);
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
      } catch {
        // Keep the last known visibility when a background refresh is unavailable.
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    const refresh = () => void refreshVisibility();
    const onStorage = (event: StorageEvent) => {
      if (event.key === CATALOG_VISIBILITY_STORAGE_KEY) refresh();
    };

    void refreshVisibility();
    const interval = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(CATALOG_VISIBILITY_EVENT, refresh);
    window.addEventListener("motoluxe:inventory-updated", refresh);
    window.addEventListener("storage", onStorage);

    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(CATALOG_VISIBILITY_EVENT, refresh);
      window.removeEventListener("motoluxe:inventory-updated", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo<StorefrontCatalogContextValue>(
    () => ({
      loading,
      products,
      isCategoryPublished: (slug) => categoryVisibility[slug] !== false,
      isProductPublished: (slug) => {
        const product = productVisibility[slug];
        const catalogProduct = products.find((item) => item.slug === slug);
        const category =
          product?.category ?? catalogProduct?.category ?? getProduct(slug)?.category;
        return (
          product?.published !== false &&
          catalogProduct?.published !== false &&
          (category ? categoryVisibility[category] !== false : true)
        );
      },
      isProductFeatured: (slug) =>
        productVisibility[slug]?.featured === true ||
        products.find((item) => item.slug === slug)?.featured === true,
      filterCategories: (items) => items.filter((item) => categoryVisibility[item.slug] !== false),
      filterProducts: (items) =>
        items.filter((item) => {
          const product = products.find((candidate) => candidate.slug === item.slug);
          const category = productVisibility[item.slug]?.category ?? product?.category;
          return (
            Boolean(product) &&
            product?.published !== false &&
            productVisibility[item.slug]?.published !== false &&
            (category ? categoryVisibility[category] !== false : true)
          );
        }),
      filterFeaturedProducts: (items) =>
        items.filter((item) => {
          return (
            productVisibility[item.slug]?.featured === true ||
            products.find((product) => product.slug === item.slug)?.featured === true
          );
        }),
    }),
    [categoryVisibility, loading, productVisibility, products],
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
