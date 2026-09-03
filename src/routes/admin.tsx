import { Outlet, createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Archive,
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import { AdminAuthProvider, useAdminAuth } from "@/components/AdminAuthContext";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Products & catalog", icon: PackageSearch },
  { label: "Categories & brands", icon: Archive },
  { label: "Inventory", icon: Boxes },
  { label: "Orders", icon: ClipboardList },
  { label: "Customers", icon: Users },
  { label: "Reports & exports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
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

  useEffect(() => {
    if (pathname !== "/admin" && pathname !== "/admin/") return;
    if (!checking && !admin) void navigate({ to: "/admin/login", replace: true });
  }, [admin, checking, navigate, pathname]);

  if (pathname !== "/admin" && pathname !== "/admin/") {
    return <Outlet />;
  }

  if (checking || !admin) {
    return (
      <section className="flex min-h-[75vh] items-center justify-center px-5 py-20">
        <ShieldCheck className="h-5 w-5 animate-pulse text-primary" />
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-card p-5 lg:block">
          <Link to="/" className="flex items-center gap-2 border-b border-border pb-6">
            <Store className="h-5 w-5 text-primary" />
            <span className="font-display text-sm uppercase tracking-[0.14em]">Motoluxe Admin</span>
          </Link>
          <nav className="mt-6 grid gap-1" aria-label="Admin navigation">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 px-3 py-3 text-xs ${
                    item.active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {!item.active && (
                    <span className="ml-auto text-[9px] uppercase tracking-wider">Next</span>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="mt-8 border-t border-border pt-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center bg-primary/15 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">{admin.username}</p>
                <p className="font-display text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {admin.role.replaceAll("_", " ")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void logout().then(() => navigate({ to: "/admin/login" }))}
              className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
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
            <div className="grid gap-4 md:grid-cols-3">
              <FoundationCard
                icon={ShieldCheck}
                eyebrow="Foundation"
                title="Admin access is active"
                description="Your owner account uses a protected session and a strong password hash."
              />
              <FoundationCard
                icon={Store}
                eyebrow="Shared data"
                title="One storefront, one source"
                description="The next modules will read and write the same MongoDB data as the storefront."
              />
              <FoundationCard
                icon={ChevronRight}
                eyebrow="Next module"
                title="Products & catalog"
                description="Wire product management first, then connect orders, customers, and inventory."
              />
            </div>

            <div className="mt-8 border border-border bg-card p-6 sm:p-8">
              <span className="eyebrow text-primary">Admin build sequence</span>
              <h2 className="mt-2 text-2xl font-semibold">
                Operational modules, wired one by one.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Authentication is complete. This shell is ready for live catalog and order tools
                without changing the public Motoluxe experience.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  ["01", "Products & catalog", "Shared product data"],
                  ["02", "Orders", "Customer order operations"],
                  ["03", "Customers", "Account and support view"],
                  ["04", "Inventory", "Stock and movement control"],
                ].map(([number, title, description]) => (
                  <div key={title} className="flex items-center gap-4 border border-border p-4">
                    <span className="font-display text-sm text-accent">{number}</span>
                    <div>
                      <p className="font-display text-sm uppercase tracking-[0.08em] text-foreground">
                        {title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FoundationCard({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border border-border bg-card p-5">
      <Icon className="h-5 w-5 text-primary" />
      <span className="eyebrow mt-5 block text-muted-foreground">{eyebrow}</span>
      <h2 className="mt-2 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
