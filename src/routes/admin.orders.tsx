import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownUp,
  CheckCircle2,
  CircleAlert,
  Download,
  Eye,
  FilterX,
  LoaderCircle,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Motoluxe Admin" },
      {
        name: "description",
        content: "Review Motoluxe orders, payment state, and fulfillment progress.",
      },
    ],
  }),
  component: AdminOrdersPage,
});

const statusOptions = [
  ["pending_confirmation", "Pending confirmation"],
  ["approved", "Approved"],
  ["processing", "Processing"],
  ["shipped", "Shipped"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
  ["rejected", "Rejected"],
] as const;

const paymentOptions = [
  ["pending", "Pending"],
  ["paid", "Paid"],
  ["failed", "Failed"],
  ["refunded", "Refunded"],
  ["not_required", "Not required"],
] as const;

type OrderListItem = {
  id: string;
  number: string;
  customerName: string;
  phone: string;
  email: string;
  itemCount: number;
  total: number | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
};

type OrderDetail = OrderListItem & {
  customerId: string | null;
  delivery: {
    name: string;
    email: string;
    phone: string;
    address: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: string | number | null;
    image: string;
    variant: string;
    lineTotal: number | null;
  }>;
  pricing: {
    subtotal: number | null;
    shipping: number | null;
    discount: number | null;
    total: number | null;
    status: string;
  };
  couponCode: string | null;
  transactionReference: string;
  paymentNotes: string;
  statusHistory: Array<{ status: string; note: string; changedAt: string }>;
  manual: boolean;
};

type OrderSummary = {
  total: number;
  pending: number;
  approved: number;
  shipped: number;
  paid: number;
};

function formatMoney(value: number | null) {
  return value === null
    ? "Request price"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function labelFor(options: readonly (readonly [string, string])[], value: string) {
  return options.find(([option]) => option === value)?.[1] ?? value.replaceAll("_", " ");
}

function statusClass(value: string) {
  if (["delivered", "paid"].includes(value)) return "border-accent/40 bg-accent/10 text-accent";
  if (["cancelled", "rejected", "failed"].includes(value))
    return "border-primary/40 bg-primary/10 text-primary";
  return "border-border bg-background text-foreground";
}

function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [summary, setSummary] = useState<OrderSummary>({
    total: 0,
    pending: 0,
    approved: 0,
    shipped: 0,
    paid: 0,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [paymentDraft, setPaymentDraft] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadOrders(
    nextSearch = search,
    nextStatus = status,
    nextPaymentStatus = paymentStatus,
    nextFrom = from,
    nextTo = to,
    nextSort = sort,
  ) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextStatus) params.set("status", nextStatus);
      if (nextPaymentStatus) params.set("paymentStatus", nextPaymentStatus);
      if (nextFrom) params.set("from", nextFrom);
      if (nextTo) params.set("to", nextTo);
      params.set("sort", nextSort);
      const response = await fetch(`/api/admin/orders?${params.toString()}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        orders?: OrderListItem[];
        summary?: OrderSummary;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "We could not load orders.");
      setOrders(payload.orders ?? []);
      setSummary(payload.summary ?? { total: 0, pending: 0, approved: 0, shipped: 0, paid: 0 });
      if (selectedId && !(payload.orders ?? []).some((order) => order.id === selectedId)) {
        setSelectedId(null);
        setSelectedOrder(null);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We could not load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The initial load intentionally captures the default filters once.
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openOrder(order: OrderListItem) {
    setSelectedId(order.id);
    setSelectedOrder(null);
    setDetailLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, { credentials: "same-origin" });
      const payload = (await response.json().catch(() => ({}))) as {
        order?: OrderDetail;
        error?: string;
      };
      if (!response.ok || !payload.order)
        throw new Error(payload.error ?? "We could not load this order.");
      setSelectedOrder(payload.order);
      setStatusDraft(payload.order.status);
      setPaymentDraft(payload.order.paymentStatus);
      setNote("");
    } catch (detailError) {
      setError(
        detailError instanceof Error ? detailError.message : "We could not load this order.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder) return;
    if (
      statusDraft === "cancelled" &&
      selectedOrder.status !== "cancelled" &&
      !window.confirm("Cancel this order? This status change will be recorded in the timeline.")
    )
      return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          status: statusDraft,
          paymentStatus: paymentDraft,
          note,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        order?: OrderDetail;
        error?: string;
      };
      if (!response.ok || !payload.order)
        throw new Error(payload.error ?? "We could not update this order.");
      setSelectedOrder(payload.order);
      setStatusDraft(payload.order.status);
      setPaymentDraft(payload.order.paymentStatus);
      setNote("");
      setNotice("Order status updated.");
      await loadOrders();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not update this order.");
    } finally {
      setWorking(false);
    }
  }

  async function archiveOrder() {
    if (!selectedOrder) return;
    if (
      !window.confirm(
        `Archive ${selectedOrder.number}? It will be hidden from the active order queue.`,
      )
    )
      return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not archive this order.");
      setSelectedId(null);
      setSelectedOrder(null);
      setNotice("Order archived.");
      await loadOrders();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error ? archiveError.message : "We could not archive this order.",
      );
    } finally {
      setWorking(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatus("");
    setPaymentStatus("");
    setFrom("");
    setTo("");
    setSort("newest");
    void loadOrders("", "", "", "", "", "newest");
  }

  function exportPaidOrders() {
    const paid = orders.filter((order) => order.paymentStatus === "paid");
    const rows = [
      ["Order", "Customer", "Phone", "Email", "Items", "Total", "Status", "Created"],
      ...paid.map((order) => [
        order.number,
        order.customerName,
        order.phone,
        order.email,
        String(order.itemCount),
        order.total === null ? "" : String(order.total),
        order.status,
        order.createdAt,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "motoluxe-paid-orders.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="eyebrow text-primary">Module 05 · Orders</span>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Move every order forward.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Review customer requests, confirm payment, and move fulfillment through a visible,
            auditable lifecycle.
          </p>
        </div>
        <div className="flex items-center gap-2 border border-accent/30 bg-accent/10 px-4 py-3 text-accent">
          <Truck className="h-4 w-4" />
          <span className="eyebrow">Fulfillment desk</span>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Orders shown" value={summary.total} />
        <MetricCard label="Needs action" value={summary.pending} accent />
        <MetricCard label="Approved / processing" value={summary.approved} />
        <MetricCard label="Shipped" value={summary.shipped} />
        <MetricCard label="Paid" value={summary.paid} accent />
      </div>

      <section className="border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="eyebrow text-primary">Order queue</span>
            <h2 className="mt-2 text-2xl font-semibold">Search the pipeline.</h2>
          </div>
          <button
            type="button"
            onClick={exportPaidOrders}
            disabled={orders.every((order) => order.paymentStatus !== "paid")}
            className="inline-flex items-center gap-2 border border-accent px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-accent hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Export paid
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loadOrders();
          }}
          className="mt-6 grid gap-3 lg:grid-cols-[1.6fr_190px_170px_150px_150px_145px_auto]"
        >
          <label className="relative">
            <span className="sr-only">Search orders</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order, customer, phone, or email"
              className={`${inputClass} pl-10`}
            />
          </label>
          <label className="sr-only" htmlFor="order-status-filter">
            Order status
          </label>
          <select
            id="order-status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={inputClass}
          >
            <option value="">All order statuses</option>
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="order-payment-filter">
            Payment status
          </label>
          <select
            id="order-payment-filter"
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value)}
            className={inputClass}
          >
            <option value="">All payment statuses</option>
            {paymentOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="order-from">
            From date
          </label>
          <input
            id="order-from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={inputClass}
          />
          <label className="sr-only" htmlFor="order-to">
            To date
          </label>
          <input
            id="order-to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={inputClass}
          />
          <label className="sr-only" htmlFor="order-sort">
            Sort orders
          </label>
          <select
            id="order-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className={inputClass}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 border border-primary px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
          >
            {loading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </form>
        {(search || status || paymentStatus || from || to || sort !== "newest") && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
          >
            <FilterX className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </section>

      <div className={selectedOrder ? "grid gap-6 xl:grid-cols-[1.25fr_0.75fr]" : ""}>
        <section className="border border-border bg-card">
          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> Loading orders
            </div>
          ) : orders.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Package className="mx-auto h-7 w-7 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No orders found.</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                Try clearing the filters or wait for the next customer order.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-border font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4 font-normal sm:px-7">Order</th>
                    <th className="px-4 py-4 font-normal">Customer</th>
                    <th className="px-4 py-4 font-normal">Items</th>
                    <th className="px-4 py-4 font-normal">Total</th>
                    <th className="px-4 py-4 font-normal">Status</th>
                    <th className="px-4 py-4 font-normal">Payment</th>
                    <th className="px-4 py-4 text-right font-normal">View</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className={`border-b border-border last:border-0 ${selectedId === order.id ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-5 py-5 sm:px-7">
                        <span className="block font-display text-xs tracking-[0.1em] text-accent">
                          {order.number}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <span className="block font-medium">{order.customerName}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {order.phone || order.email || "No contact"}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-muted-foreground">{order.itemCount}</td>
                      <td className="px-4 py-5 font-medium">{formatMoney(order.total)}</td>
                      <td className="px-4 py-5">
                        <span
                          className={`border px-2 py-1 text-[10px] capitalize ${statusClass(order.status)}`}
                        >
                          {labelFor(statusOptions, order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <span
                          className={`border px-2 py-1 text-[10px] capitalize ${statusClass(order.paymentStatus)}`}
                        >
                          {labelFor(paymentOptions, order.paymentStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-right">
                        <button
                          type="button"
                          onClick={() => void openOrder(order)}
                          className="inline-flex items-center gap-1.5 border border-border px-2.5 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedId && (
          <OrderDetailPanel
            order={selectedOrder}
            detailLoading={detailLoading}
            statusDraft={statusDraft}
            paymentDraft={paymentDraft}
            note={note}
            working={working}
            onClose={() => {
              setSelectedId(null);
              setSelectedOrder(null);
            }}
            onStatusChange={setStatusDraft}
            onPaymentChange={setPaymentDraft}
            onNoteChange={setNote}
            onSave={saveOrder}
            onArchive={() => void archiveOrder()}
          />
        )}
      </div>
    </div>
  );
}

function OrderDetailPanel({
  order,
  detailLoading,
  statusDraft,
  paymentDraft,
  note,
  working,
  onClose,
  onStatusChange,
  onPaymentChange,
  onNoteChange,
  onSave,
  onArchive,
}: {
  order: OrderDetail | null;
  detailLoading: boolean;
  statusDraft: string;
  paymentDraft: string;
  note: string;
  working: boolean;
  onClose: () => void;
  onStatusChange: (value: string) => void;
  onPaymentChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onArchive: () => void;
}) {
  if (detailLoading || !order) {
    return (
      <aside className="flex min-h-80 items-center justify-center border border-border bg-card text-sm text-muted-foreground">
        <LoaderCircle className="mr-3 h-5 w-5 animate-spin text-primary" /> Loading order
      </aside>
    );
  }
  return (
    <aside className="h-fit border border-border bg-card">
      <div className="flex items-start justify-between border-b border-border p-5 sm:p-7">
        <div>
          <span className="eyebrow text-primary">Order detail</span>
          <h2 className="mt-2 font-display text-2xl tracking-[0.08em] text-accent">
            {order.number}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close order details"
          className="text-muted-foreground hover:text-primary"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-7 p-5 sm:p-7">
        <form onSubmit={onSave} className="space-y-4 border-b border-border pb-7">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="eyebrow mb-2 block text-muted-foreground">Order status</span>
              <select
                value={statusDraft}
                onChange={(event) => onStatusChange(event.target.value)}
                className={inputClass}
              >
                {statusOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="eyebrow mb-2 block text-muted-foreground">Payment status</span>
              <select
                value={paymentDraft}
                onChange={(event) => onPaymentChange(event.target.value)}
                className={inputClass}
              >
                {paymentOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <span className="eyebrow mb-2 block text-muted-foreground">
              Timeline note <span className="normal-case tracking-normal">(optional)</span>
            </span>
            <input
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              maxLength={500}
              placeholder="What changed?"
              className={inputClass}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={working}
              className="inline-flex items-center gap-2 bg-primary px-4 py-3 font-display text-xs uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-60"
            >
              {working ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}{" "}
              Save changes
            </button>
            {order.status !== "delivered" && (
              <button
                type="button"
                disabled={working}
                onClick={onArchive}
                className="inline-flex items-center gap-2 border border-border px-4 py-3 font-display text-xs uppercase tracking-[0.14em] text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
              >
                Archive
              </button>
            )}
          </div>
        </form>

        <DetailSection icon={<ShieldCheck className="h-4 w-4" />} title="Customer">
          <p className="font-medium">{order.delivery.name || order.customerName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.delivery.phone || "No phone recorded"}
          </p>
          {order.delivery.email && (
            <p className="mt-1 text-sm text-muted-foreground">{order.delivery.email}</p>
          )}
        </DetailSection>

        <DetailSection icon={<Truck className="h-4 w-4" />} title="Delivery">
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {order.delivery.addressLine1 ||
              order.delivery.address ||
              "No delivery address recorded"}
            {order.delivery.addressLine2 ? `\n${order.delivery.addressLine2}` : ""}
            {order.delivery.city || order.delivery.state || order.delivery.postalCode
              ? `\n${[order.delivery.city, order.delivery.state, order.delivery.postalCode].filter(Boolean).join(", ")}`
              : ""}
          </p>
        </DetailSection>

        <DetailSection icon={<Package className="h-4 w-4" />} title={`Items · ${order.itemCount}`}>
          <div className="divide-y divide-border">
            {order.items.map((item, index) => (
              <div
                key={`${item.productId}-${index}`}
                className="flex justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Qty {item.quantity}
                    {item.variant ? ` · ${item.variant}` : ""}
                  </p>
                </div>
                <p className="text-sm">
                  {item.lineTotal === null ? formatMoney(null) : formatMoney(item.lineTotal)}
                </p>
              </div>
            ))}
          </div>
        </DetailSection>

        <DetailSection icon={<ArrowDownUp className="h-4 w-4" />} title="Money & payment">
          <div className="space-y-2 text-sm">
            <MoneyRow label="Subtotal" value={formatMoney(order.pricing.subtotal)} />
            <MoneyRow label="Shipping" value={formatMoney(order.pricing.shipping)} />
            <MoneyRow label="Discount" value={formatMoney(order.pricing.discount)} />
            <MoneyRow label="Total" value={formatMoney(order.pricing.total)} strong />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Method: {order.paymentMethod}</p>
          {order.transactionReference && (
            <p className="mt-1 text-xs text-muted-foreground">
              Reference: {order.transactionReference}
            </p>
          )}
          {order.paymentNotes && (
            <p className="mt-1 text-xs text-muted-foreground">{order.paymentNotes}</p>
          )}
        </DetailSection>

        <DetailSection icon={<CircleAlert className="h-4 w-4" />} title="Status timeline">
          {order.statusHistory.length > 0 ? (
            <div className="space-y-4 border-l border-border pl-4">
              {order.statusHistory.map((entry, index) => (
                <div key={`${entry.changedAt}-${index}`} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="text-sm font-medium capitalize">
                    {labelFor(statusOptions, entry.status)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(entry.changedAt)}
                  </p>
                  {entry.note && <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>
          )}
        </DetailSection>
      </div>
    </aside>
  );
}

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 font-display text-xs uppercase tracking-[0.14em] text-accent">
        {icon}
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MoneyRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${strong ? "border-t border-border pt-3 font-semibold text-foreground" : "text-muted-foreground"}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="border border-border bg-card p-5">
      <span className={`eyebrow ${accent ? "text-accent" : "text-muted-foreground"}`}>{label}</span>
      <p className="mt-5 font-display text-4xl font-bold text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">Current queue</p>
    </div>
  );
}

const inputClass =
  "w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary";
