import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Exports — Motoluxe Admin" },
      {
        name: "description",
        content: "Review Motoluxe store performance and export operational reports.",
      },
    ],
  }),
  component: AdminReportsPage,
});

type Report = {
  filters: { from: string; to: string };
  metrics: {
    orders: number;
    customers: number;
    products: number;
    revenue: number;
    pricedOrders: number;
    averageOrderValue: number | null;
  };
  statuses: Array<{ status: string; name: string; count: number }>;
  topProducts: Array<{ productId: string; name: string; units: number; revenue: number }>;
  topCategories: Array<{ category: string; name: string; units: number; revenue: number }>;
  trend: Array<{ date: string; orders: number; revenue: number }>;
};

function formatMoney(value: number | null) {
  if (value === null) return "Awaiting pricing";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T00:00:00Z`));
}

function AdminReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const response = await fetch(`/api/admin/reports?${params.toString()}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as Report & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not load reports.");
      setReport(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We could not load reports.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadReport();
  }

  function exportCsv() {
    const params = new URLSearchParams({ format: "csv" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.location.assign(`/api/admin/reports?${params.toString()}`);
  }

  const maxStatus = Math.max(...(report?.statuses.map((item) => item.count) ?? []), 1);
  const maxProductUnits = Math.max(...(report?.topProducts.map((item) => item.units) ?? []), 1);
  const maxCategoryUnits = Math.max(...(report?.topCategories.map((item) => item.units) ?? []), 1);

  return (
    <div className="grid gap-8">
      <header className="border-b border-border pb-7">
        <span className="eyebrow text-primary">Business intelligence</span>
        <h1 className="mt-2 text-3xl font-medium sm:text-4xl">Reports & exports.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Make decisions from recorded catalog, customer, and order data. Revenue is shown only when
          an order has a real price.
        </p>
      </header>

      <section className="border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="eyebrow text-accent">Report window</span>
            <h2 className="mt-2 text-2xl font-medium">Choose a date range.</h2>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!report}
            className="border border-accent/50 px-4 py-3 font-display text-xs uppercase tracking-[0.14em] text-accent hover:bg-accent/10 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
        <form onSubmit={applyFilters} className="mt-6 flex flex-wrap items-end gap-4">
          <label className="grid gap-2 text-xs text-muted-foreground">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="grid gap-2 text-xs text-muted-foreground">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            className="bg-primary px-4 py-3 font-display text-xs uppercase tracking-[0.14em] text-primary-foreground"
          >
            Apply range
          </button>
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="border border-border px-4 py-3 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          >
            Clear
          </button>
        </form>
      </section>

      {error && (
        <div
          className="border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="border border-border bg-card p-8 text-sm text-muted-foreground">
          Building report from live store data…
        </div>
      ) : report ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Orders" value={String(report.metrics.orders)} />
            <Metric label="Customers" value={String(report.metrics.customers)} />
            <Metric label="Products" value={String(report.metrics.products)} />
            <Metric label="Recorded revenue" value={formatMoney(report.metrics.revenue)} accent />
            <Metric
              label="Average priced order"
              value={formatMoney(report.metrics.averageOrderValue)}
            />
          </section>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="border border-border bg-card p-5 sm:p-7">
              <span className="eyebrow text-primary">Order status</span>
              <h2 className="mt-2 text-2xl font-medium">Operational pulse.</h2>
              <div className="mt-7 grid gap-5">
                {report.statuses.length ? (
                  report.statuses.map((item) => (
                    <div key={item.status}>
                      <div className="flex justify-between gap-4 text-sm">
                        <span className="text-foreground">{item.name}</span>
                        <span className="font-display text-xs text-accent">{item.count}</span>
                      </div>
                      <div className="mt-2 h-2 bg-border">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(item.count / maxStatus) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No orders in this report window.</p>
                )}
              </div>
            </section>

            <section className="border border-border bg-card p-5 sm:p-7">
              <span className="eyebrow text-primary">Recorded revenue</span>
              <h2 className="mt-2 text-2xl font-medium">Daily activity.</h2>
              <div className="mt-7 space-y-3">
                {report.trend.length ? (
                  report.trend.slice(-10).map((item) => (
                    <div key={item.date} className="flex items-center gap-3 text-xs">
                      <span className="w-14 shrink-0 text-muted-foreground">
                        {formatDate(item.date)}
                      </span>
                      <div className="h-2 flex-1 bg-border">
                        <div
                          className="h-full bg-accent"
                          style={{
                            width: `${Math.max((item.revenue / Math.max(report.metrics.revenue, 1)) * 100, item.orders ? 8 : 2)}%`,
                          }}
                        />
                      </div>
                      <span className="w-12 text-right text-muted-foreground">
                        {item.orders} ord.
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No dated activity in this window.</p>
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <SalesTable
              title="Top products"
              eyebrow="Units sold"
              rows={report.topProducts.map((item) => ({
                name: item.name,
                units: item.units,
                revenue: item.revenue,
              }))}
              maxUnits={maxProductUnits}
            />
            <SalesTable
              title="Category performance"
              eyebrow="Units sold"
              rows={report.topCategories.map((item) => ({
                name: item.name,
                units: item.units,
                revenue: item.revenue,
              }))}
              maxUnits={maxCategoryUnits}
            />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {report.metrics.pricedOrders} of {report.metrics.orders} orders have recorded pricing.
            Unpriced request orders remain visible in operational counts but are excluded from
            revenue totals.
          </p>
        </>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`border border-border bg-card p-5 ${accent ? "border-primary/50" : ""}`}>
      <span className={`eyebrow ${accent ? "text-primary" : "text-muted-foreground"}`}>
        {label}
      </span>
      <p className="mt-5 truncate font-display text-2xl text-foreground">{value}</p>
    </div>
  );
}

function SalesTable({
  title,
  eyebrow,
  rows,
  maxUnits,
}: {
  title: string;
  eyebrow: string;
  rows: Array<{ name: string; units: number; revenue: number }>;
  maxUnits: number;
}) {
  return (
    <section className="border border-border bg-card p-5 sm:p-7">
      <span className="eyebrow text-primary">{eyebrow}</span>
      <h2 className="mt-2 text-2xl font-medium">{title}.</h2>
      <div className="mt-6 grid gap-4">
        {rows.length ? (
          rows.map((row) => (
            <div key={row.name}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="truncate text-foreground">{row.name}</span>
                <span className="shrink-0 font-display text-xs text-accent">
                  {row.units} · {formatMoney(row.revenue)}
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-border">
                <div
                  className="h-full bg-primary/80"
                  style={{ width: `${(row.units / maxUnits) * 100}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No sales data in this report window.</p>
        )}
      </div>
    </section>
  );
}
