import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getProduct, products, type Product } from "@/data/catalog";

const STORAGE_KEY = "motoluxe-wishlist";

type WishlistContextValue = {
  wishlist: Product[];
  wishlistCount: number;
  isWishlisted: (productSlug: string) => boolean;
  toggleWishlist: (product: Product) => void;
  removeFromWishlist: (productSlug: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

function readStoredSlugs() {
  if (typeof window === "undefined") return [];

  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter(
      (slug): slug is string => typeof slug === "string" && Boolean(getProduct(slug)),
    );
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistSlugs, setWishlistSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setWishlistSlugs(readStoredSlugs());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlistSlugs));
    }
  }, [hydrated, wishlistSlugs]);

  const wishlist = useMemo(
    () =>
      wishlistSlugs
        .map((slug) => products.find((product) => product.slug === slug))
        .filter((product): product is Product => Boolean(product)),
    [wishlistSlugs],
  );

  const isWishlisted = useCallback(
    (productSlug: string) => wishlistSlugs.includes(productSlug),
    [wishlistSlugs],
  );

  const toggleWishlist = useCallback((product: Product) => {
    setWishlistSlugs((current) =>
      current.includes(product.slug)
        ? current.filter((slug) => slug !== product.slug)
        : [...current, product.slug],
    );
  }, []);

  const removeFromWishlist = useCallback((productSlug: string) => {
    setWishlistSlugs((current) => current.filter((slug) => slug !== productSlug));
  }, []);

  const value = useMemo(
    () => ({
      wishlist,
      wishlistCount: wishlist.length,
      isWishlisted,
      toggleWishlist,
      removeFromWishlist,
    }),
    [isWishlisted, removeFromWishlist, toggleWishlist, wishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }
  return context;
}
