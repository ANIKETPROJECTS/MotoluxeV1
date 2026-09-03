import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Heart,
  LoaderCircle,
  LogOut,
  Mail,
  Package,
  Phone,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Product } from "@/data/catalog";
import { useCustomerAuth, type Customer } from "@/components/CustomerAuthContext";
import { useWishlist } from "@/components/WishlistContext";

type AccountOrder = {
  id: string;
  status: string;
  createdAt: string;
  itemCount: number;
  items: Array<{
    productName: string;
    quantity: number;
    price: string;
  }>;
};

type AccountResponse = {
  customer: Customer;
  orders: AccountOrder[];
  wishlistSlugs: string[];
  error?: string;
};

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Motoluxe" },
      {
        name: "description",
        content: "View your Motoluxe customer details, orders and saved products.",
      },
    ],
  }),
  component: ProfilePage,
});

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function ProfilePage() {
  const { customer, checking, authenticated, openAuth, logout } = useCustomerAuth();
  const { wishlist, wishlistCount, removeFromWishlist, error: wishlistError } = useWishlist();
  const [activeTab, setActiveTab] = useState<"orders" | "wishlist">("orders");
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (checking || !authenticated) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/account/me", { credentials: "same-origin" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as AccountResponse;
        if (!response.ok) throw new Error(payload.error ?? "We could not load your account.");
        return payload;
      })
      .then((payload) => {
        if (!cancelled) setAccount(payload);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "We could not load your account.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, checking]);

  if (checking || loading) {
    return (
      <section className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center px-5 py-20">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
          Loading your account…
        </div>
      </section>
    );
  }

  if (!authenticated || !customer) {
    return (
      <section className="mx-auto flex min-h-[65vh] max-w-2xl items-center justify-center px-5 py-20">
        <div className="w-full border border-border bg-card p-8 text-center sm:p-14">
          <UserRound className="mx-auto h-10 w-10 text-primary" />
          <span className="eyebrow mt-6 block text-accent">Motoluxe customer account</span>
          <h1 className="mt-3 text-4xl font-bold">Your profile is waiting.</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Sign in with your name and phone number to view your details, orders and saved products.
          </p>
          <button
            type="button"
            onClick={() => openAuth()}
            className="mt-8 inline-flex items-center gap-2 bg-primary px-6 py-4 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground"
          >
            Sign in to continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    );
  }

  const orders = account?.orders ?? [];
  const profileCustomer = account?.customer ?? customer;
  const savedProducts: Product[] = wishlist;

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <div className="border-b border-border pb-8">
        <span className="eyebrow flex items-center gap-3 text-primary">
          <span className="h-px w-8 bg-primary" />
          Customer profile
        </span>
        <h1 className="mt-4 text-5xl font-bold sm:text-6xl">Welcome back.</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Your Motoluxe details, orders and saved products in one place.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-12">
        <aside className="h-fit border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center gap-4 border-b border-border pb-6">
            <div className="grid h-14 w-14 place-items-center bg-primary/15 text-primary">
              <UserRound className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold">
                {profileCustomer.name ?? "Customer"}
              </h2>
              <span className="eyebrow text-muted-foreground">Motoluxe account</span>
            </div>
          </div>

          <div className="space-y-5 py-6">
            <div className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <span className="eyebrow text-muted-foreground">Phone number</span>
                <p className="mt-1 text-sm text-foreground">+91 {profileCustomer.phone}</p>
              </div>
            </div>
            {profileCustomer.email && (
              <div className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <span className="eyebrow text-muted-foreground">Email address</span>
                  <p className="mt-1 break-all text-sm text-foreground">{profileCustomer.email}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-px border border-border bg-border">
            <div className="bg-surface p-4">
              <span className="eyebrow text-muted-foreground">Orders</span>
              <p className="mt-2 font-display text-2xl text-foreground">{orders.length}</p>
            </div>
            <div className="bg-surface p-4">
              <span className="eyebrow text-muted-foreground">Wishlist</span>
              <p className="mt-2 font-display text-2xl text-foreground">{wishlistCount}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </aside>

        <div>
          <div className="flex border-b border-border" role="tablist" aria-label="Account sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "orders"}
              onClick={() => setActiveTab("orders")}
              className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 font-display text-xs uppercase tracking-[0.18em] transition-colors ${
                activeTab === "orders"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="h-4 w-4" />
              Orders ({orders.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "wishlist"}
              onClick={() => setActiveTab("wishlist")}
              className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 font-display text-xs uppercase tracking-[0.18em] transition-colors ${
                activeTab === "wishlist"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className="h-4 w-4" />
              Wishlist ({wishlistCount})
            </button>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-6 border border-primary/40 bg-primary/10 px-4 py-3 text-xs text-primary"
            >
              {error}
            </p>
          )}
          {wishlistError && activeTab === "wishlist" && (
            <p
              role="alert"
              className="mt-6 border border-primary/40 bg-primary/10 px-4 py-3 text-xs text-primary"
            >
              {wishlistError}
            </p>
          )}

          {activeTab === "orders" ? (
            <div className="mt-6 grid gap-4">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <article key={order.id} className="border border-border bg-card p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                      <div>
                        <span className="eyebrow text-primary">Order reference</span>
                        <p className="mt-1 break-all font-display text-sm tracking-[0.08em] text-foreground">
                          {order.id}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="eyebrow text-muted-foreground">
                          {formatOrderDate(order.createdAt)}
                        </span>
                        <p className="mt-1 font-display text-xs uppercase tracking-[0.12em] text-accent">
                          {formatStatus(order.status)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {order.items.map((item) => (
                          <span key={`${order.id}-${item.productName}`}>
                            {item.productName} × {item.quantity}
                          </span>
                        ))}
                      </div>
                      <span className="font-display text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="border border-border bg-card p-8">
                  <Package className="h-8 w-8 text-primary" />
                  <h2 className="mt-5 text-2xl font-semibold">No orders yet.</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Your confirmed Motoluxe orders will appear here.
                  </p>
                  <Link
                    to="/category/$category"
                    params={{ category: "chain-care" }}
                    className="mt-6 inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.18em] text-accent"
                  >
                    Browse products <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {savedProducts.length > 0 ? (
                savedProducts.map((product) => (
                  <article
                    key={product.slug}
                    className="flex gap-4 border border-border bg-card p-4"
                  >
                    <Link
                      to="/product/$product"
                      params={{ product: product.slug }}
                      className="h-24 w-20 shrink-0 overflow-hidden bg-background"
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        width={80}
                        height={96}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <span className="eyebrow text-primary">{product.price}</span>
                      <Link
                        to="/product/$product"
                        params={{ product: product.slug }}
                        className="mt-1 block font-display text-lg uppercase tracking-[0.06em] text-foreground transition-colors hover:text-primary"
                      >
                        {product.name}
                      </Link>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <Link
                          to="/product/$product"
                          params={{ product: product.slug }}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          View product
                        </Link>
                        <button
                          type="button"
                          aria-label={`Remove ${product.name} from wishlist`}
                          onClick={() => void removeFromWishlist(product.slug)}
                          className="p-1 text-muted-foreground transition-colors hover:text-primary"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="border border-border bg-card p-8 sm:col-span-2">
                  <Heart className="h-8 w-8 text-primary" />
                  <h2 className="mt-5 text-2xl font-semibold">Your wishlist is empty.</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Tap the heart on a product to save it for later.
                  </p>
                  <Link
                    to="/category/$category"
                    params={{ category: "chain-care" }}
                    className="mt-6 inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.18em] text-accent"
                  >
                    Find a product <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
