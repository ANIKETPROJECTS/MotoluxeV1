/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type StorefrontInventoryValue = {
  stocks: Record<string, number>;
  loading: boolean;
  getStock: (slug: string) => number | undefined;
  refresh: () => void;
};

const StorefrontInventoryContext = createContext<StorefrontInventoryValue | null>(null);
const INVENTORY_UPDATED_EVENT = "motoluxe:inventory-updated";
const INVENTORY_REFRESH_INTERVAL = 60_000;

export function StorefrontInventoryProvider({ children }: { children: ReactNode }) {
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch("/api/catalog/stock", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          stocks?: Record<string, number>;
        };
        if (response.ok && payload.stocks) {
          setStocks(payload.stocks);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const abortRequest = refresh();
    const interval = window.setInterval(refresh, INVENTORY_REFRESH_INTERVAL);
    const onFocus = () => refresh();
    const onInventoryUpdated = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener(INVENTORY_UPDATED_EVENT, onInventoryUpdated);

    return () => {
      abortRequest?.();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(INVENTORY_UPDATED_EVENT, onInventoryUpdated);
    };
  }, [refresh]);

  const value = useMemo<StorefrontInventoryValue>(
    () => ({
      stocks,
      loading,
      getStock: (slug) => stocks[slug],
      refresh,
    }),
    [loading, refresh, stocks],
  );

  return (
    <StorefrontInventoryContext.Provider value={value}>
      {children}
    </StorefrontInventoryContext.Provider>
  );
}

export function useStorefrontInventory() {
  const context = useContext(StorefrontInventoryContext);
  if (!context) {
    throw new Error("useStorefrontInventory must be used inside StorefrontInventoryProvider");
  }
  return context;
}
