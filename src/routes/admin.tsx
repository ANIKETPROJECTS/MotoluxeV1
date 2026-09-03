import { Outlet, createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminAuthProvider, useAdminAuth } from "@/components/AdminAuthContext";

const navigation = [
  { label: "Overview", to: "/admin" },
  { label: "Products & catalog", to: "/admin/products" },
  { label: "Categories & brands", to: "/admin/categories" },
  { label: "Inventory", to: "/admin/inventory" },
  { label: "Orders", to: "/admin/orders" },
  { label: "Customers" },
  { label: "Reports & exports" },
  { label: "Settings" },
];

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Control Room — Motoluxe" },
      { name: "description", content: "Motoluxe ecommerce administration." },
    ],
  }),
  component: AdminRouteComponent,
});

function AdminRouteComponent() {
  return (
    <AdminAuthProvider>
      <AdminPage />
    </AdminAuthProvider>
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { admin, checking, logout } = useAdminAuth();
  const isPublicAdminPath = pathname === "/admin/login" || pathname === "/admin/setup";

  useEffect(() => {
    if (isPublicAdminPath) return;
    if (!checking && !admin) void navigate({ to: "/admin/login", replace: true });
  }, [admin, checking, isPublicAdminPath, navigate]);

  if (pathname !== "/admin" && pathname !== "/admin/") {
    if (!isPublicAdminPath && (checking || !admin)) {
      return (
        <section className="admin-theme flex min-h-[75vh] items-center justify-center bg-background px-5 py-20 text-foreground">
          <span className="font-display text-xs uppercase tracking-[0.16em] text-primary">
            Checking access
          </span>
        </section>
      );
    }
    return (
      <section className="admin-theme min-h-screen bg-background text-foreground">
        <Outlet />
      </section>
    );
  }

  if (checking || !admin) {
    return (
      <section className="admin-theme flex min-h-[75vh] items-center justify-center bg-background px-5 py-20 text-foreground">
        <span className="font-display text-xs uppercase tracking-[0.16em] text-primary">
          Checking access
        </span>
      </section>
    );
  }

  return (
    <section className="admin-theme min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card p-5 lg:block">
          <Link to="/" className="block border-b border-border pb-6">
            <span className="font-display text-sm uppercase tracking-[0.14em]">Motoluxe Admin</span>
            <span className="mt-2 block h-1 w-12 bg-primary" />
          </Link>
          <nav className="mt-6 grid gap-1" aria-label="Admin navigation">
            {navigation.map((item) => {
              const active =
                item.to === pathname || (item.to === "/admin" && pathname === "/admin/");
              const className = `flex items-center justify-between px-3 py-3 text-xs ${
                active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
              }`;
              if (item.to) {
                return (
                  <Link key={item.label} to={item.to} className={className}>
                    {item.label}
                  </Link>
                );
              }
              return (
                <div key={item.label} className={className}>
                  {item.label}
                  <span className="ml-auto text-[9px] uppercase tracking-wider">Next</span>
                </div>
              );
            })}
          </nav>
          <div className="mt-8 border-t border-border pt-5">
            <div className="min-w-0">
              <p className="truncate text-sm text-foreground">{admin.username}</p>
              <p className="mt-1 font-display text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {admin.role.replaceAll("_", " ")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void logout().then(() => navigate({ to: "/admin/login" }))}
              className="mt-5 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-border bg-card px-5 py-6 sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <span className="eyebrow text-primary">Admin overview</span>
                <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Control room.</h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Your secure foundation for managing Motoluxe products, customers, and orders.
                </p>
              </div>
              <div className="border border-accent/30 bg-accent/10 px-4 py-3 text-right">
                <span className="eyebrow text-accent">Signed in as</span>
                <p className="mt-1 font-display text-sm uppercase tracking-[0.1em] text-foreground">
                  {admin.username}
                </p>
              </div>
            </div>
          </header>

          <div className="p-5 sm:p-8">
            <AdminOverview />
          </div>
        </div>
      </div>
    </section>
  );
}

type OverviewData = {
  metrics: {
    products: number;
    customers: number;
    orders: number;
    pendingOrders: number;
    revenue: number | null;
  };
  trend: Array<{ label: string; revenue: number; orders: number }>;
  statuses: Array<{ status: string; count: number }>;
  categoryMix: Array<{ name: string; count: number }>;
  recentOrders: Array<{
    id: string;
    number: string;
    customer: string;
    itemCount: number;
    total: number | null;
    status: string;
    createdAt: string | null;
  }>;
};

function formatMoney(value: number | null) {
  if (value === null) return "Awaiting pricing";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOverview() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/overview", { credentials: "same-origin" });
      const payload = (await response.json().catch(() => ({}))) as OverviewData & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "We could not load the overview.");
      setData(payload);
    } catch (overviewError) {
      setError(
        overviewError instanceof Error
          ? overviewError.message
          : "We could not load the admin overview.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center border border-border bg-card">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          Loading live store data…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-primary/40 bg-primary/10 p-6 sm:p-8">
        <span className="eyebrow text-primary">Overview unavailable</span>
        <h2 className="mt-2 text-2xl font-semibold">The control room could not load live data.</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {error || "Please try again when the database connection is available."}
        </p>
        <button
          type="button"
          onClick={() => void loadOverview()}
          className="mt-6 border border-primary px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.trend.map((month) => month.revenue), 1);
  const maxCategoryCount = Math.max(...data.categoryMix.map((category) => category.count), 1);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard eyebrow="Catalog" value={data.metrics.products} label="Products" />
        <MetricCard eyebrow="Community" value={data.metrics.customers} label="Customers" />
        <MetricCard eyebrow="Operations" value={data.metrics.orders} label="Orders" />
        <MetricCard
          eyebrow="Needs attention"
          value={data.metrics.pendingOrders}
          label="Pending orders"
          accent
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow text-primary">Revenue and order trend</span>
              <h2 className="mt-2 text-2xl font-semibold">The last six months.</h2>
            </div>
            <div className="text-right">
              <span className="eyebrow text-muted-foreground">Recorded revenue</span>
              <p className="mt-1 font-display text-sm uppercase tracking-[0.08em] text-foreground">
                {formatMoney(data.metrics.revenue)}
              </p>
            </div>
          </div>
          <div className="mt-8 grid h-48 grid-cols-6 items-end gap-3 border-b border-l border-border px-2 pb-0 pt-4">
            {data.trend.map((month) => (
              <div
                key={month.label}
                className="flex h-full flex-col items-center justify-end gap-2"
              >
                <span className="font-display text-[9px] text-muted-foreground">
                  {month.orders} {month.orders === 1 ? "order" : "orders"}
                </span>
                <div
                  className="w-full max-w-10 bg-primary/75 transition-all"
                  style={{
                    height: `${Math.max((month.revenue / maxRevenue) * 100, month.orders ? 10 : 3)}%`,
                  }}
                  title={`${month.label}: ${formatMoney(month.revenue)}`}
                />
                <span className="font-display text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {month.label}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Revenue bars stay empty until orders receive a real price. Current order totals are
            request-based and are not invented in the dashboard.
          </p>
        </section>

        <section className="border border-border bg-card p-5 sm:p-7">
          <span className="eyebrow text-primary">Order status</span>
          <h2 className="mt-2 text-2xl font-semibold">What needs action.</h2>
          <div className="mt-7 space-y-5">
            {data.statuses.length > 0 ? (
              data.statuses.map((item) => {
                const percentage = data.metrics.orders
                  ? (item.count / data.metrics.orders) * 100
                  : 0;
                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="capitalize text-foreground">
                        {formatStatus(item.status)}
                      </span>
                      <span className="font-display text-xs text-accent">{item.count}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-border">
                      <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No orders have been placed yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="border border-border bg-card p-5 sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow text-primary">Recent orders</span>
              <h2 className="mt-2 text-2xl font-semibold">Latest customer activity.</h2>
            </div>
            <span className="font-display text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {data.recentOrders.length} shown
            </span>
          </div>
          <div className="mt-6 overflow-x-auto">
            {data.recentOrders.length > 0 ? (
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-border font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="pb-3 pr-4 font-normal">Order</th>
                    <th className="pb-3 pr-4 font-normal">Customer</th>
                    <th className="pb-3 pr-4 font-normal">Date</th>
                    <th className="pb-3 pr-4 font-normal">Status</th>
                    <th className="pb-3 text-right font-normal">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-0">
                      <td className="py-4 pr-4 font-display text-xs tracking-[0.08em] text-accent">
                        #{order.number}
                      </td>
                      <td className="py-4 pr-4">
                        <span className="block text-foreground">{order.customer}</span>
                        <span className="text-xs text-muted-foreground">
                          {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-4 pr-4">
                        <span className="inline-flex border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] capitalize text-primary">
                          {formatStatus(order.status)}
                        </span>
                      </td>
                      <td className="py-4 text-right text-xs text-muted-foreground">
                        {formatMoney(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="border border-dashed border-border px-5 py-10 text-center">
                <p className="text-sm text-muted-foreground">No orders have been placed yet.</p>
              </div>
            )}
          </div>
        </section>

        <section className="border border-border bg-card p-5 sm:p-7">
          <span className="eyebrow text-primary">Catalog mix</span>
          <h2 className="mt-2 text-2xl font-semibold">Products by category.</h2>
          <div className="mt-7 space-y-5">
            {data.categoryMix.map((category) => (
              <div key={category.name}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-foreground">{category.name}</span>
                  <span className="font-display text-xs text-accent">{category.count}</span>
                </div>
                <div className="mt-2 h-1.5 bg-border">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${(category.count / maxCategoryCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  eyebrow,
  value,
  label,
  accent = false,
}: {
  eyebrow: string;
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className={`border border-border bg-card p-5 ${accent ? "border-primary/50" : ""}`}>
      <span className={`eyebrow ${accent ? "text-primary" : "text-muted-foreground"}`}>
        {eyebrow}
      </span>
      <p className="mt-5 font-display text-4xl font-bold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
