import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Minus, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useCart } from "@/components/CartContext";
import { useCustomerAuth } from "@/components/CustomerAuthContext";

export const Route = createFileRoute("/order")({
  head: () => ({
    meta: [
      { title: "Place Your Order — Motoluxe" },
      {
        name: "description",
        content: "Review your Motoluxe products and submit your order details.",
      },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const {
    lines,
    itemCount,
    appliedCoupon,
    subtotal,
    discount,
    total,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { customer, checking, authenticated, openAuth } = useCustomerAuth();
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authenticated) {
      openAuth();
      return;
    }

    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/inventory/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          items: lines.map((line) => ({
            productId: line.product.slug,
            quantity: line.quantity,
          })),
          couponCode: appliedCoupon?.code,
          delivery: {
            name: formData.get("name"),
            email: formData.get("email"),
            address: formData.get("address"),
          },
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        orderId?: string;
        orderNumber?: string;
        error?: string;
      };
      if (!response.ok || !payload.orderId || !payload.orderNumber) {
        throw new Error(payload.error ?? "We could not place your order.");
      }
      setPlacedOrderId(payload.orderId);
      setPlacedOrderNumber(payload.orderNumber);
      clearCart();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "We could not place your order.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (placedOrderId) {
    return (
      <section className="relative mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-5 py-20">
        <div className="w-full border border-border bg-card p-8 text-center opacity-40 blur-[1px] sm:p-14">
          <div className="mx-auto grid h-16 w-16 place-items-center bg-accent/15 text-accent">
            <Check className="h-8 w-8" />
          </div>
          <span className="eyebrow mt-7 block text-primary">Order received</span>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Your order is ready</h1>
        </div>
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-foreground/70 px-5 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-success-title"
        >
          <div className="w-full max-w-lg border border-border bg-card shadow-2xl">
            <div className="hazard-stripes h-1" />
            <div className="p-7 text-center sm:p-10">
              <div className="mx-auto grid h-16 w-16 place-items-center bg-accent/15 text-accent">
                <Check className="h-8 w-8" />
              </div>
              <span className="eyebrow mt-7 block text-primary">Order placed</span>
              <h1 id="order-success-title" className="mt-3 text-4xl font-bold sm:text-5xl">
                Thank you.
              </h1>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                Your order details have been sent to the Motoluxe team and are now available in your
                account and the Admin Orders screen.
              </p>
              <p className="mt-5 border border-accent/30 bg-accent/10 px-4 py-3 font-display text-xs uppercase tracking-[0.14em] text-accent">
                Reference: <span>{placedOrderNumber}</span>
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <Link
                  to="/profile"
                  className="group inline-flex items-center justify-center gap-2 bg-primary px-5 py-4 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground"
                >
                  View order & write review
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center border border-border px-5 py-4 font-display text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  Continue shopping
                </Link>
              </div>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                After placing an order, open your profile and choose “Write a review” beside a
                purchased product. Your review goes to Admin Reviews & Questions for moderation.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:py-20">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Continue shopping
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <span className="eyebrow flex items-center gap-3 text-primary">
            <span className="h-px w-8 bg-primary" />
            Place an order
          </span>
          <h1 className="mt-4 max-w-2xl text-5xl font-bold sm:text-6xl">Order details</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Share your contact and delivery details. We will confirm availability and the next steps
            for your order.
          </p>

          {lines.length === 0 ? (
            <div className="mt-10 border border-border bg-card p-8">
              <h2 className="text-2xl font-semibold">Your cart is empty</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Add a Motoluxe product before placing an order.
              </p>
              <Link
                to="/category/$category"
                params={{ category: "chain-care" }}
                className="mt-7 inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground"
              >
                Browse products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : checking ? (
            <div className="mt-10 border border-border bg-card p-8">
              <p className="text-sm text-muted-foreground">Checking your customer account…</p>
            </div>
          ) : !authenticated ? (
            <div className="mt-10 border border-border bg-card p-8">
              <h2 className="text-2xl font-semibold">Sign in to place your order</h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Your selection is saved. Sign in with your name and phone number to continue to
                delivery details.
              </p>
              <button
                type="button"
                onClick={() => openAuth()}
                className="mt-7 inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground"
              >
                Sign in to continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-10 space-y-6">
              <div>
                <label htmlFor="order-name" className="eyebrow mb-2 block text-muted-foreground">
                  Name
                </label>
                <input
                  id="order-name"
                  name="name"
                  required
                  defaultValue={customer?.name ?? ""}
                  placeholder="Your full name"
                  className="w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="order-phone" className="eyebrow mb-2 block text-muted-foreground">
                  Phone
                </label>
                <input
                  id="order-phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="+91"
                  defaultValue={customer ? `+91 ${customer.phone}` : ""}
                  readOnly
                  className="w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
              <div>
                <label htmlFor="order-address" className="eyebrow mb-2 block text-muted-foreground">
                  Delivery details
                </label>
                <textarea
                  id="order-address"
                  name="address"
                  required
                  rows={5}
                  placeholder="Delivery address and any order notes"
                  className="w-full resize-none border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="group inline-flex items-center gap-2 bg-primary px-8 py-4 font-display text-sm uppercase tracking-[0.22em] text-primary-foreground transition-all hover:ember-glow disabled:cursor-wait disabled:opacity-60"
              >
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Saving order" : "Place order"}
                {!submitting && (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                )}
              </button>
              {error && (
                <p
                  role="alert"
                  className="border border-primary/40 bg-primary/10 px-4 py-3 text-xs leading-relaxed text-primary"
                >
                  {error}
                </p>
              )}
            </form>
          )}
        </div>

        <aside className="h-fit border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <span className="eyebrow text-primary">Your selection</span>
              <h2 className="mt-2 text-2xl font-semibold">Order summary</h2>
            </div>
            <span className="font-display text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
          </div>

          {lines.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">
              Your selected products will appear here.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {lines.map((line) => (
                <div key={line.product.slug} className="flex gap-4 py-5">
                  <img
                    src={line.product.image}
                    alt={line.product.name}
                    width={80}
                    height={96}
                    className="h-24 w-20 shrink-0 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="eyebrow text-primary">Motoluxe</span>
                        <h3 className="mt-1 text-lg font-semibold">{line.product.name}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(line.product.slug)}
                        className="text-xs text-muted-foreground transition-colors hover:text-primary"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex items-center border border-border bg-surface">
                        <button
                          type="button"
                          aria-label={`Decrease ${line.product.name} quantity`}
                          onClick={() => {
                            if (line.quantity === 1) {
                              removeFromCart(line.product.slug);
                            } else {
                              updateQuantity(line.product.slug, line.quantity - 1);
                            }
                          }}
                          className="grid h-8 w-8 place-items-center transition-colors hover:bg-surface-raised"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center font-display text-sm">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase ${line.product.name} quantity`}
                          onClick={() => updateQuantity(line.product.slug, line.quantity + 1)}
                          className="grid h-8 w-8 place-items-center transition-colors hover:bg-surface-raised"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="font-display text-xs uppercase tracking-[0.12em] text-muted-foreground">
                        {line.product.price}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {lines.length > 0 && (
            <div className="grid gap-3 border-t border-border pt-5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              {appliedCoupon && discount > 0 && (
                <div className="flex justify-between text-accent">
                  <span>Coupon · {appliedCoupon.code}</span>
                  <span>−₹{discount}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-lg text-foreground">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
