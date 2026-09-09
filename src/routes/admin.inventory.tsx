import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  CircleAlert,
  Edit3,
  FilterX,
  LoaderCircle,
  Minus,
  PackageSearch,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  Warehouse,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

export const Route = createFileRoute("/admin/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Motoluxe Admin" },
      {
        name: "description",
        content: "Monitor Motoluxe stock and record auditable inventory movements.",
      },
    ],
  }),
  component: AdminInventoryPage,
});

type InventoryProduct = {
  id: string;
  name: string;
  slug: string;
  stock: number;
  updatedAt?: string;
};

type InventoryMovement = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  eventType: string;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  relatedOrderNumber: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

type InventorySummary = {
  products: number;
  totalUnits: number;
  lowStock: number;
  outOfStock: number;
};

type InventoryForm = {
  productId: string;
  quantityChange: string;
  reason: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function stockLabel(stock: number) {
  if (stock === 0) return "Out of stock";
  if (stock <= 5) return "Low stock";
  return "In stock";
}

function stockClass(stock: number) {
  if (stock === 0) return "text-primary";
  if (stock <= 5) return "text-accent";
  return "text-foreground";
}

function changeClass(change: number) {
  return change < 0 ? "text-primary" : "text-accent";
}

function AdminInventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    products: 0,
    totalUnits: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [selectedHistoryProductId, setSelectedHistoryProductId] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [eventFilter, setEventFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [adjustment, setAdjustment] = useState<InventoryForm>({
    productId: "",
    quantityChange: "",
    reason: "",
  });
  const [quickAmounts, setQuickAmounts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingReason, setEditingReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [quickWorkingId, setQuickWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadInventory(
    nextProduct = selectedHistoryProductId ?? "",
    nextEvent = eventFilter,
    nextFrom = from,
    nextTo = to,
  ) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextProduct) params.set("productId", nextProduct);
      if (nextEvent) params.set("eventType", nextEvent);
      if (nextFrom) params.set("from", nextFrom);
      if (nextTo) params.set("to", nextTo);
      const response = await fetch(`/api/admin/inventory?${params.toString()}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        products?: InventoryProduct[];
        movements?: InventoryMovement[];
        summary?: InventorySummary;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "We could not load inventory.");
      setProducts(payload.products ?? []);
      setMovements(payload.movements ?? []);
      setSummary(payload.summary ?? { products: 0, totalUnits: 0, lowStock: 0, outOfStock: 0 });
      if (!adjustment.productId && payload.products?.[0]) {
        setAdjustment((current) => ({ ...current, productId: payload.products?.[0]?.id ?? "" }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We could not load inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The initial load intentionally captures the default filters once.
    void loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ...adjustment,
          quantityChange: Number(adjustment.quantityChange),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not adjust stock.");
      setNotice("Stock adjusted and movement recorded.");
      setAdjustment((current) => ({ ...current, quantityChange: "", reason: "" }));
      await loadInventory();
    } catch (adjustmentError) {
      setError(
        adjustmentError instanceof Error ? adjustmentError.message : "We could not adjust stock.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function quickAdjust(product: InventoryProduct, direction: "add" | "remove") {
    const amount = Number(quickAmounts[product.id] ?? "1");
    if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
      setError("Enter a whole-number quantity between 1 and 1,000,000.");
      setNotice("");
      return;
    }
    if (direction === "remove" && amount > product.stock) {
      setError(`You can remove at most ${product.stock} unit${product.stock === 1 ? "" : "s"}.`);
      setNotice("");
      return;
    }

    setQuickWorkingId(product.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          productId: product.id,
          quantityChange: direction === "add" ? amount : -amount,
          reason:
            direction === "add"
              ? "Quick stock increase from inventory list"
              : "Quick stock decrease from inventory list",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not update stock.");
      setNotice(`${product.name} stock updated.`);
      await loadInventory();
    } catch (quickAdjustError) {
      setError(
        quickAdjustError instanceof Error ? quickAdjustError.message : "We could not update stock.",
      );
    } finally {
      setQuickWorkingId(null);
    }
  }

  function startEdit(movement: InventoryMovement) {
    setEditingId(movement.id);
    setEditingReason(movement.reason);
    setError("");
    setNotice("");
  }

  async function saveMovement(movement: InventoryMovement) {
    setWorkingId(movement.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/inventory/${movement.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ reason: editingReason }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not update the movement.");
      setNotice("Movement reason updated.");
      setEditingId(null);
      await loadInventory();
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "We could not update the movement.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteMovement(movement: InventoryMovement) {
    if (
      !window.confirm(
        `Delete this manual adjustment for ${movement.productName}? The stock change will be reversed.`,
      )
    )
      return;
    setWorkingId(movement.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/inventory/${movement.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not delete the movement.");
      setNotice("Movement deleted and stock reversed.");
      await loadInventory();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "We could not delete the movement.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  function clearHistoryFilters() {
    setEventFilter("");
    setFrom("");
    setTo("");
    if (selectedHistoryProductId) void loadInventory(selectedHistoryProductId, "", "", "");
  }

  function openHistory(product: InventoryProduct) {
    setSelectedHistoryProductId(product.id);
    setEventFilter("");
    setFrom("");
    setTo("");
    setShowAdvancedFilters(false);
    void loadInventory(product.id, "", "", "");
  }

  function closeHistory() {
    setSelectedHistoryProductId(null);
    setMovements([]);
    setEventFilter("");
    setFrom("");
    setTo("");
    setShowAdvancedFilters(false);
  }

  const selectedHistoryProduct = products.find(
    (product) => product.id === selectedHistoryProductId,
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="eyebrow text-primary">Module 04 · Inventory</span>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Know what is moving.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Monitor current stock separately from its audit trail. Every manual adjustment is
            applied on the server and stored with stock-before and stock-after values.
          </p>
        </div>
        <div className="flex items-center gap-2 border border-accent/30 bg-accent/10 px-4 py-3 text-accent">
          <Warehouse className="h-4 w-4" />
          <span className="eyebrow">Live stock control</span>
        </div>
      </header>

      {(error || notice) && (
        <div
          className={`border px-4 py-3 text-sm ${
            error
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-accent/40 bg-accent/10 text-accent"
          }`}
          role={error ? "alert" : "status"}
        >
          {error || notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Catalog products" value={summary.products} />
        <MetricCard label="Units on hand" value={summary.totalUnits} />
        <MetricCard label="Low stock" value={summary.lowStock} accent />
        <MetricCard label="Out of stock" value={summary.outOfStock} danger />
      </div>

      <section className="border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="eyebrow text-accent">Current product stock</span>
            <h2 className="mt-2 text-2xl font-semibold">Add or remove stock quickly.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Choose a quantity, then add received stock or remove stock from the product list. Each
              quick change is still recorded in inventory history.
            </p>
          </div>
          <PackageSearch className="h-5 w-5 text-accent" />
        </div>
        {products.length === 0 ? (
          <p className="mt-6 border border-border bg-background px-4 py-5 text-sm text-muted-foreground">
            No products are available yet. Add products from Products &amp; catalog first.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto border-y border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-normal sm:px-5">Product</th>
                  <th className="px-4 py-3 font-normal">Current stock</th>
                  <th className="px-4 py-3 font-normal">Quantity</th>
                  <th className="px-4 py-3 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => {
                  const busy = quickWorkingId === product.id;
                  const amount = quickAmounts[product.id] ?? "1";
                  return (
                    <tr key={product.id} className="bg-background/30">
                      <td className="px-4 py-4 sm:px-5">
                        <span className="block font-medium">{product.name}</span>
                        <span className="mt-1 block font-display text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                          {product.slug}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`font-display text-lg font-bold ${stockClass(product.stock)}`}
                        >
                          {product.stock}
                        </span>
                        <span className={`ml-2 text-xs ${stockClass(product.stock)}`}>
                          {stockLabel(product.stock)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          aria-label={`Quantity for ${product.name}`}
                          min="1"
                          max="1000000"
                          step="1"
                          type="number"
                          value={amount}
                          onChange={(event) =>
                            setQuickAmounts((current) => ({
                              ...current,
                              [product.id]: event.target.value,
                            }))
                          }
                          className="w-24 border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openHistory(product)}
                            className="border border-border px-3 py-2 text-xs text-muted-foreground hover:border-accent hover:text-accent"
                          >
                            View history
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void quickAdjust(product, "add")}
                            className="inline-flex items-center gap-1 border border-accent px-3 py-2 text-xs text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busy ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                            Add
                          </button>
                          <button
                            type="button"
                            disabled={busy || product.stock === 0}
                            onClick={() => void quickAdjust(product, "remove")}
                            className="inline-flex items-center gap-1 border border-primary px-3 py-2 text-xs text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Minus className="h-3.5 w-3.5" /> Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border border-primary/40 bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="eyebrow text-primary">Manual adjustment</span>
            <h2 className="mt-2 text-2xl font-semibold">Update stock with a reason.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Use a positive number for received or found stock and a negative number for a
              correction, damage, or count reduction. Stock cannot go below zero.
            </p>
          </div>
          <CircleAlert className="h-5 w-5 text-accent" />
        </div>
        <form
          onSubmit={createAdjustment}
          className="mt-7 grid gap-5 lg:grid-cols-[1.3fr_180px_1.7fr_auto]"
        >
          <label>
            <span className="eyebrow mb-2 block text-muted-foreground">Product</span>
            <select
              required
              value={adjustment.productId}
              onChange={(event) =>
                setAdjustment((current) => ({ ...current, productId: event.target.value }))
              }
              className={inputClass}
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.stock} on hand
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="eyebrow mb-2 block text-muted-foreground">Quantity change</span>
            <input
              required
              type="number"
              step="1"
              value={adjustment.quantityChange}
              onChange={(event) =>
                setAdjustment((current) => ({ ...current, quantityChange: event.target.value }))
              }
              placeholder="+10 or -2"
              className={inputClass}
            />
          </label>
          <label>
            <span className="eyebrow mb-2 block text-muted-foreground">Reason</span>
            <input
              required
              minLength={3}
              value={adjustment.reason}
              onChange={(event) =>
                setAdjustment((current) => ({ ...current, reason: event.target.value }))
              }
              placeholder="Cycle count, supplier receipt, damaged stock..."
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={working || products.length === 0}
            className="inline-flex items-center justify-center gap-2 bg-primary px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {working ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Adjust stock
          </button>
        </form>
        {products.length === 0 && !loading && (
          <p className="mt-4 text-xs text-accent">
            No MongoDB product records are available yet. Import the starter catalog from Products
            &amp; catalog before adjusting stock.
          </p>
        )}
      </section>

      {selectedHistoryProductId && (
        <>
          <section className="border border-border bg-card p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <span className="eyebrow text-primary">Inventory history</span>
                <h2 className="mt-2 text-2xl font-semibold">
                  {selectedHistoryProduct?.name ?? "Selected product"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Review stock changes for this product without leaving the current inventory list.
                </p>
              </div>
              <button
                type="button"
                onClick={closeHistory}
                className="inline-flex items-center gap-2 border border-border px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-muted-foreground hover:border-primary hover:text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to stock
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HistorySummary
                label="Current stock"
                value={`${selectedHistoryProduct?.stock ?? 0}`}
              />
              <HistorySummary
                label="Stock status"
                value={stockLabel(selectedHistoryProduct?.stock ?? 0)}
                valueClass={stockClass(selectedHistoryProduct?.stock ?? 0)}
              />
              <HistorySummary
                label="Last updated"
                value={
                  selectedHistoryProduct?.updatedAt
                    ? formatDate(selectedHistoryProduct.updatedAt)
                    : "Not recorded"
                }
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <p className="text-xs text-muted-foreground">
                Showing up to 250 movements for this product.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((current) => !current)}
                  className={`inline-flex items-center gap-2 border px-3 py-2 text-xs ${
                    showAdvancedFilters
                      ? "border-accent text-accent"
                      : "border-border text-muted-foreground hover:border-accent hover:text-accent"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {showAdvancedFilters ? "Hide filters" : "Advanced filters"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadInventory()}
                  className="inline-flex items-center gap-2 border border-primary px-3 py-2 text-xs text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
                >
                  {loading ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Refresh
                </button>
              </div>
            </div>

            {showAdvancedFilters && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void loadInventory();
                }}
                className="mt-4 grid gap-3 border border-border bg-background/40 p-4 sm:grid-cols-[1fr_1fr_auto_auto_auto]"
              >
                <label>
                  <span className="eyebrow mb-2 block text-muted-foreground">Event type</span>
                  <select
                    value={eventFilter}
                    onChange={(event) => setEventFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">All event types</option>
                    <option value="manual_adjustment">Manual adjustment</option>
                    <option value="purchase">Purchase / sale</option>
                    <option value="return">Return</option>
                    <option value="cancellation_restore">Cancellation restore</option>
                    <option value="damaged_stock">Damaged stock</option>
                    <option value="supplier_receipt">Supplier receipt</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </label>
                <label>
                  <span className="eyebrow mb-2 block text-muted-foreground">From date</span>
                  <input
                    type="date"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className="eyebrow mb-2 block text-muted-foreground">To date</span>
                  <input
                    type="date"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="self-end border border-primary px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary disabled:opacity-60"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={clearHistoryFilters}
                  className="inline-flex items-center justify-center gap-2 self-end border border-border px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <FilterX className="h-3.5 w-3.5" /> Clear
                </button>
              </form>
            )}
          </section>
        </>
      )}

      {selectedHistoryProductId && (
        <section className="border border-border bg-card">
          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> Loading inventory
            </div>
          ) : movements.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <PackageSearch className="mx-auto h-7 w-7 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No inventory movements found.</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Adjust stock above to create the first auditable movement, or clear the filters to
                see the full history.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-border font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4 font-normal sm:px-7">Date</th>
                    <th className="px-4 py-4 font-normal">Change</th>
                    <th className="px-4 py-4 font-normal">Stock after</th>
                    <th className="px-4 py-4 font-normal">Reason / order</th>
                    <th className="px-4 py-4 text-right font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const busy = workingId === movement.id;
                    const editing = editingId === movement.id;
                    return (
                      <tr key={movement.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-5 text-xs text-muted-foreground sm:px-7">
                          {formatDate(movement.createdAt)}
                        </td>
                        <td
                          className={`px-4 py-5 font-display text-lg ${changeClass(movement.quantityChange)}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {movement.quantityChange < 0 ? (
                              <ArrowDownRight className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                            {movement.quantityChange > 0 ? "+" : ""}
                            {movement.quantityChange}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <span className="block text-foreground">
                            {movement.stockBefore} → {movement.stockAfter}
                          </span>
                          <span className={`mt-1 block text-xs ${stockClass(movement.stockAfter)}`}>
                            {stockLabel(movement.stockAfter)}
                          </span>
                        </td>
                        <td className="max-w-[420px] px-4 py-5">
                          {editing ? (
                            <div className="flex min-w-56 gap-2">
                              <input
                                autoFocus
                                value={editingReason}
                                onChange={(event) => setEditingReason(event.target.value)}
                                className={inputClass}
                              />
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void saveMovement(movement)}
                                className="border border-primary px-2 text-xs text-primary hover:bg-primary hover:text-primary-foreground"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="border border-border px-2 text-xs text-muted-foreground"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="block break-words text-foreground">
                                {movement.reason}
                              </span>
                              {movement.relatedOrderNumber && (
                                <span className="mt-1 block text-xs text-accent">
                                  Order {movement.relatedOrderNumber}
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex justify-end gap-2">
                            {movement.eventType === "manual_adjustment" && !editing && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(movement)}
                                  className="inline-flex items-center gap-1 border border-border px-2.5 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                                >
                                  <Edit3 className="h-3.5 w-3.5" /> Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void deleteMovement(movement)}
                                  className="inline-flex items-center gap-1 border border-border px-2.5 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function HistorySummary({
  label,
  value,
  valueClass = "text-foreground",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="border border-border bg-background/40 px-4 py-4">
      <span className="eyebrow text-muted-foreground">{label}</span>
      <p className={`mt-2 text-sm font-medium ${valueClass}`}>{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent = false,
  danger = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className={`border border-border bg-card p-5 ${danger ? "border-primary/50" : ""}`}>
      <span
        className={`eyebrow ${danger ? "text-primary" : accent ? "text-accent" : "text-muted-foreground"}`}
      >
        {label}
      </span>
      <p
        className={`mt-5 font-display text-4xl font-bold ${danger ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {danger ? "Needs replenishment" : accent ? "Review soon" : "Current live count"}
      </p>
    </div>
  );
}

const inputClass =
  "w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary";
