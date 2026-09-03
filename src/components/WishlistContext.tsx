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
import { useCustomerAuth } from "./CustomerAuthContext";

const STORAGE_KEY = "motoluxe-wishlist";

type WishlistContextValue = {
  wishlist: Product[];
  wishlistCount: number;
  isWishlisted: (productSlug: string) => boolean;
  toggleWishlist: (product: Product) => void;
  removeFromWishlist: (productSlug: string) => void;
  error: string;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

function validSlugs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (slug): slug is string => typeof slug === "string" && Boolean(getProduct(slug)),
  );
}

function readStoredSlugs() {
  if (typeof window === "undefined") return [];

  try {
    return validSlugs(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { authenticated, checking, customer } = useCustomerAuth();
  const [wishlistSlugs, setWishlistSlugs] = useState<string[]>([]);
  const [mode, setMode] = useState<"unknown" | "guest" | "customer">("unknown");
  const [error, setError] = useState("");

  useEffect(() => {
    if (checking) return;
    let cancelled = false;

    if (!authenticated || !customer) {
      setMode("guest");
      setWishlistSlugs(readStoredSlugs());
      setError("");
      return () => {
        cancelled = true;
      };
    }

    setMode("customer");
    setWishlistSlugs([]);
    setError("");
    fetch("/api/account/me", { credentials: "same-origin" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          wishlistSlugs?: unknown;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "We could not load your wishlist.");
        return payload;
      })
      .then((payload) => {
        if (!cancelled) setWishlistSlugs(validSlugs(payload.wishlistSlugs));
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your wishlist.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, checking, customer]);

  useEffect(() => {
    if (mode === "guest") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlistSlugs));
    }
  }, [mode, wishlistSlugs]);

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

  const toggleWishlist = useCallback(
    async (product: Product) => {
      const previousSlugs = wishlistSlugs;
      const nextSlugs = previousSlugs.includes(product.slug)
        ? previousSlugs.filter((slug) => slug !== product.slug)
        : [...previousSlugs, product.slug];
      setWishlistSlugs(nextSlugs);
      if (mode !== "customer") return;

      try {
        const response = await fetch("/api/account/wishlist", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ wishlistSlugs: nextSlugs }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          wishlistSlugs?: unknown;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "We could not save your wishlist.");
        setWishlistSlugs(validSlugs(payload.wishlistSlugs));
        setError("");
      } catch (requestError) {
        setWishlistSlugs(previousSlugs);
        setError(
          requestError instanceof Error ? requestError.message : "We could not save your wishlist.",
        );
      }
    },
    [mode, wishlistSlugs],
  );

  const removeFromWishlist = useCallback(
    async (productSlug: string) => {
      const product = getProduct(productSlug);
      if (product) await toggleWishlist(product);
    },
    [toggleWishlist],
  );

  const value = useMemo(
    () => ({
      wishlist,
      wishlistCount: wishlist.length,
      isWishlisted,
      toggleWishlist,
      removeFromWishlist,
      error,
    }),
    [error, isWishlisted, removeFromWishlist, toggleWishlist, wishlist],
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
