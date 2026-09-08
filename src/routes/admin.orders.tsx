import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FilterX, LoaderCircle, Package, RefreshCw, Search, Truck } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [rowWorkingId, setRowWorkingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  async function updateOrderRow(
    order: OrderListItem,
    field: "status" | "paymentStatus",
    value: string,
  ) {
    if (
      field === "status" &&
      value === "cancelled" &&
      order.status !== "cancelled" &&
      !window.confirm("Cancel this order? This status change will be recorded.")
    ) {
      return;
    }
    setRowWorkingId(order.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          [field]: value,
          note:
            field === "status"
              ? `Order status changed to ${labelFor(statusOptions, value)} from the order list.`
              : "",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "We could not update this order.");
      setNotice(field === "status" ? "Order status updated." : "Payment status updated.");
      await loadOrders();
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "We could not update this order.",
      );
    } finally {
      setRowWorkingId(null);
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
          className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(240px,1.5fr)_repeat(5,minmax(130px,1fr))_auto]"
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

      <div>
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
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4 font-normal sm:px-7">Order</th>
                    <th className="px-4 py-4 font-normal">Customer</th>
                    <th className="px-4 py-4 font-normal">Items</th>
                    <th className="px-4 py-4 font-normal">Total</th>
                    <th className="px-4 py-4 font-normal">Status</th>
                    <th className="px-4 py-4 font-normal">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-0">
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
                        <select
                          value={order.status}
                          disabled={rowWorkingId === order.id}
                          onChange={(event) =>
                            void updateOrderRow(order, "status", event.target.value)
                          }
                          aria-label={`Update status for ${order.number}`}
                          className={`min-w-40 border px-3 py-2 text-xs outline-none disabled:opacity-60 ${statusClass(order.status)}`}
                        >
                          {statusOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={order.paymentStatus}
                            disabled={rowWorkingId === order.id}
                            onChange={(event) =>
                              void updateOrderRow(order, "paymentStatus", event.target.value)
                            }
                            aria-label={`Update payment for ${order.number}`}
                            className={`min-w-32 border px-3 py-2 text-xs outline-none disabled:opacity-60 ${statusClass(order.paymentStatus)}`}
                          >
                            {paymentOptions.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <Link
                            to="/admin/orders/$orderId"
                            params={{ orderId: order.id }}
                            className="inline-flex items-center border border-primary px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                          >
                            Invoice
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
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
