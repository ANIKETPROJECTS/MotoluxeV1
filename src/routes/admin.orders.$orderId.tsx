import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle, MessageCircle, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdminOrderDetail } from "@/lib/server/admin-orders";

export const Route = createFileRoute("/admin/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Invoice — Motoluxe Admin" },
      { name: "description", content: "View, print, and share a Motoluxe customer invoice." },
    ],
  }),
  component: AdminInvoicePage,
});

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
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) return digits.slice(2);
  return digits.length === 10 ? `91${digits}` : digits;
}

function invoiceMessage(order: AdminOrderDetail) {
  return [
    `Hello ${order.delivery.name || "there"},`,
    "",
    `Here is your Motoluxe invoice ${order.number}.`,
    `Total: ${formatMoney(order.total)}`,
    `Payment: ${formatStatus(order.paymentStatus)}`,
    "",
    "Thank you for choosing Motoluxe.",
  ].join("\n");
}

function AdminInvoicePage() {
  const { orderId } = useParams({ from: "/admin/orders/$orderId" });
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/orders/${orderId}`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          order?: AdminOrderDetail;
          error?: string;
        };
        if (!response.ok || !payload.order) {
          throw new Error(payload.error ?? "We could not load this invoice.");
        }
        setOrder(payload.order);
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(
          loadError instanceof Error ? loadError.message : "We could not load this invoice.",
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [orderId]);

  function shareOnWhatsApp() {
    if (!order) return;
    const phone = whatsappNumber(order.delivery.phone);
    if (!phone) return;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(invoiceMessage(order))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> Loading invoice
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
        </Link>
        <div
          className="border border-primary/40 bg-primary/10 p-6 text-sm text-primary"
          role="alert"
        >
          {error || "We could not load this invoice."}
        </div>
      </div>
    );
  }

  const phone = whatsappNumber(order.delivery.phone);
  const address = [
    order.delivery.addressLine1,
    order.delivery.addressLine2,
    order.delivery.address,
    [order.delivery.city, order.delivery.state].filter(Boolean).join(", "),
    order.delivery.postalCode,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          to="/admin/orders"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-border px-4 py-3 font-display text-[10px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Printer className="h-3.5 w-3.5" /> Print invoice
          </button>
          <button
            type="button"
            onClick={shareOnWhatsApp}
            disabled={!phone}
            title={
              phone
                ? "Open WhatsApp with a prefilled invoice message"
                : "Customer phone unavailable"
            }
            className="inline-flex items-center gap-2 border border-accent bg-accent px-4 py-3 font-display text-[10px] uppercase tracking-[0.14em] text-accent-foreground transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Share on WhatsApp
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-4xl border border-border bg-card p-6 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-8 border-b border-border pb-8">
          <div>
            <span className="font-display text-2xl uppercase tracking-[0.12em] text-foreground">
              Motoluxe
            </span>
            <span className="mt-2 block h-1 w-12 bg-primary" />
            <p className="mt-5 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Purpose-built care essentials for riders, workshops, and dealers.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="eyebrow text-primary">Tax invoice</span>
            <h1 className="mt-2 text-3xl font-bold">Invoice</h1>
            <p className="mt-3 font-display text-xs uppercase tracking-[0.1em] text-foreground">
              {order.number}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
          </div>
        </header>

        <div className="grid gap-8 border-b border-border py-8 sm:grid-cols-2">
          <div>
            <span className="eyebrow text-muted-foreground">Billed to</span>
            <p className="mt-3 font-medium text-foreground">{order.delivery.name || "Customer"}</p>
            {order.delivery.phone && (
              <p className="mt-1 text-sm text-muted-foreground">{order.delivery.phone}</p>
            )}
            {order.delivery.email && (
              <p className="mt-1 break-all text-sm text-muted-foreground">{order.delivery.email}</p>
            )}
          </div>
          <div className="sm:text-right">
            <span className="eyebrow text-muted-foreground">Deliver to</span>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {address.length > 0
                ? address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))
                : "Address not recorded"}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto py-8">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-border font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="pb-3 pr-4 font-normal">Item</th>
                <th className="pb-3 pr-4 text-right font-normal">Qty</th>
                <th className="pb-3 pr-4 text-right font-normal">Unit price</th>
                <th className="pb-3 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={`${item.productId}-${index}`} className="border-b border-border/70">
                  <td className="py-4 pr-4">
                    <span className="block font-medium text-foreground">{item.productName}</span>
                    {item.variant && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.variant}
                      </span>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-right text-muted-foreground">{item.quantity}</td>
                  <td className="py-4 pr-4 text-right text-muted-foreground">
                    {item.lineTotal === null || item.quantity < 1
                      ? "Request price"
                      : formatMoney(item.lineTotal / item.quantity)}
                  </td>
                  <td className="py-4 text-right font-medium text-foreground">
                    {formatMoney(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto max-w-sm space-y-3 border-t border-border pt-6 text-sm">
          <div className="flex justify-between gap-6 text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatMoney(order.pricing.subtotal)}</span>
          </div>
          <div className="flex justify-between gap-6 text-muted-foreground">
            <span>Shipping</span>
            <span>{formatMoney(order.pricing.shipping)}</span>
          </div>
          {order.pricing.discount !== null && order.pricing.discount > 0 && (
            <div className="flex justify-between gap-6 text-accent">
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
              <span>-{formatMoney(order.pricing.discount)}</span>
            </div>
          )}
          <div className="flex justify-between gap-6 border-t border-border pt-3 text-base font-semibold text-foreground">
            <span>Total</span>
            <span>{formatMoney(order.total)}</span>
          </div>
        </div>

        <footer className="mt-10 flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
          <span>Payment: {formatStatus(order.paymentStatus)}</span>
          <span>Thank you for choosing Motoluxe.</span>
        </footer>
      </article>
    </div>
  );
}
