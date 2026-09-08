import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, FileDown, LoaderCircle, Printer, Share2 } from "lucide-react";
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

function pdfMoney(value: number | null) {
  return value === null
    ? "Request price"
    : `INR ${new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 0,
      }).format(value)}`;
}

function pdfFileName(order: AdminOrderDetail) {
  return `${order.number.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-invoice.pdf`;
}

async function createInvoicePdf(order: AdminOrderDetail) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "mm", format: "a4" });
  const left = 18;
  const right = 192;
  const muted = [100, 100, 100] as const;
  const dark = [30, 30, 34] as const;
  const red = [214, 35, 35] as const;
  const yellow = [228, 183, 16] as const;

  document.setProperties({
    title: `Motoluxe Invoice ${order.number}`,
    subject: "Motoluxe customer invoice",
  });
  document.setTextColor(...dark);
  document.setFont("helvetica", "bold");
  document.setFontSize(22);
  document.text("MOTOLUXE", left, 22);
  document.setDrawColor(...red);
  document.setLineWidth(1.4);
  document.line(left, 27, left + 13, 27);

  document.setTextColor(...red);
  document.setFontSize(8);
  document.text("TAX INVOICE", right, 17, { align: "right" });
  document.setTextColor(...dark);
  document.setFontSize(20);
  document.text("INVOICE", right, 25, { align: "right" });
  document.setFontSize(9);
  document.text(order.number, right, 32, { align: "right" });
  document.setFont("helvetica", "normal");
  document.setTextColor(...muted);
  document.setFontSize(8);
  document.text(formatDate(order.createdAt), right, 38, { align: "right" });

  document.setDrawColor(195, 195, 195);
  document.setLineWidth(0.3);
  document.line(left, 47, right, 47);

  const address = [
    order.delivery.addressLine1,
    order.delivery.addressLine2,
    order.delivery.address,
    [order.delivery.city, order.delivery.state].filter(Boolean).join(", "),
    order.delivery.postalCode,
  ].filter(Boolean);
  const addText = (text: string, x: number, y: number, maxWidth: number, lineHeight = 4) => {
    const lines = document.splitTextToSize(text || "—", maxWidth) as string[];
    document.text(lines, x, y, { lineHeightFactor: lineHeight / 4 });
    return y + lines.length * lineHeight;
  };

  document.setFont("helvetica", "bold");
  document.setFontSize(7);
  document.setTextColor(...muted);
  document.text("BILLED TO", left, 58);
  document.text("DELIVER TO", 108, 58);
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(...dark);
  let billY = 66;
  billY = addText(order.delivery.name || "Customer", left, billY, 78);
  document.setTextColor(...muted);
  billY = addText(order.delivery.phone, left, billY + 1, 78);
  addText(order.delivery.email, left, billY + 1, 78);
  document.setTextColor(...dark);
  addText(address.join("\n"), 108, 66, 84, 4.2);

  document.setDrawColor(195, 195, 195);
  document.line(left, 94, right, 94);
  document.setFont("helvetica", "bold");
  document.setFontSize(7);
  document.setTextColor(...muted);
  document.text("ITEM", left, 102);
  document.text("QTY", 142, 102, { align: "right" });
  document.text("UNIT PRICE", 168, 102, { align: "right" });
  document.text("AMOUNT", right, 102, { align: "right" });
  document.line(left, 106, right, 106);

  let itemY = 114;
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  for (const item of order.items) {
    const nameLines = document.splitTextToSize(
      item.productName || "Motoluxe product",
      92,
    ) as string[];
    if (itemY > 250) {
      document.addPage();
      itemY = 24;
    }
    document.setTextColor(...dark);
    document.text(nameLines, left, itemY);
    document.setTextColor(...muted);
    document.text(String(item.quantity), 142, itemY, { align: "right" });
    document.text(
      item.lineTotal === null || item.quantity < 1
        ? "Request price"
        : pdfMoney(item.lineTotal / item.quantity),
      168,
      itemY,
      { align: "right" },
    );
    document.setTextColor(...dark);
    document.text(pdfMoney(item.lineTotal), right, itemY, { align: "right" });
    itemY += Math.max(8, nameLines.length * 4) + 5;
    document.setDrawColor(225, 225, 225);
    document.line(left, itemY - 3, right, itemY - 3);
  }

  const totalsY = Math.min(itemY + 7, 258);
  document.setDrawColor(195, 195, 195);
  document.line(112, totalsY - 4, right, totalsY - 4);
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(...muted);
  document.text("Subtotal", 112, totalsY + 4);
  document.text(pdfMoney(order.pricing.subtotal), right, totalsY + 4, { align: "right" });
  document.text("Shipping", 112, totalsY + 12);
  document.text(pdfMoney(order.pricing.shipping), right, totalsY + 12, { align: "right" });
  let totalY = totalsY + 20;
  if (order.pricing.discount !== null && order.pricing.discount > 0) {
    document.setTextColor(...yellow);
    document.text("Discount", 112, totalY);
    document.text(`-${pdfMoney(order.pricing.discount)}`, right, totalY, { align: "right" });
    totalY += 8;
  }
  document.setDrawColor(195, 195, 195);
  document.line(112, totalY + 3, right, totalY + 3);
  document.setFont("helvetica", "bold");
  document.setTextColor(...dark);
  document.text("Total", 112, totalY + 11);
  document.text(pdfMoney(order.total), right, totalY + 11, { align: "right" });

  document.setDrawColor(195, 195, 195);
  document.line(left, 282, right, 282);
  document.setFont("helvetica", "normal");
  document.setFontSize(8);
  document.setTextColor(...muted);
  document.text(`Payment: ${formatStatus(order.paymentStatus)}`, left, 290);
  document.text("Thank you for choosing Motoluxe.", right, 290, { align: "right" });

  return new File([document.output("blob")], pdfFileName(order), { type: "application/pdf" });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function AdminInvoicePage() {
  const { orderId } = useParams({ from: "/admin/orders/$orderId" });
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [sharing, setSharing] = useState(false);

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
    void (async () => {
      setSharing(true);
      setError("");
      setShareNotice("");
      try {
        const file = await createInvoicePdf(order);
        const shareData = {
          title: `Motoluxe Invoice ${order.number}`,
          text: invoiceMessage(order),
          files: [file],
        };
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share(shareData);
          setShareNotice("Invoice PDF is ready in the share sheet.");
          return;
        }

        downloadFile(file);
        const phone = whatsappNumber(order.delivery.phone);
        if (phone) {
          const url = `https://wa.me/${phone}?text=${encodeURIComponent(invoiceMessage(order))}`;
          window.open(url, "_blank", "noopener,noreferrer");
        }
        setShareNotice("Invoice PDF downloaded. Attach it in WhatsApp using the paperclip button.");
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === "AbortError") return;
        setError(
          shareError instanceof Error ? shareError.message : "We could not prepare the invoice.",
        );
      } finally {
        setSharing(false);
      }
    })();
  }

  function downloadInvoice() {
    if (!order) return;
    void (async () => {
      setSharing(true);
      setError("");
      setShareNotice("");
      try {
        downloadFile(await createInvoicePdf(order));
        setShareNotice("Invoice PDF downloaded.");
      } catch (downloadError) {
        setError(
          downloadError instanceof Error
            ? downloadError.message
            : "We could not create the invoice PDF.",
        );
      } finally {
        setSharing(false);
      }
    })();
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
            onClick={downloadInvoice}
            disabled={sharing}
            className="inline-flex items-center gap-2 border border-border px-4 py-3 font-display text-[10px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileDown className="h-3.5 w-3.5" /> Download PDF
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={sharing}
            className="inline-flex items-center gap-2 border border-border px-4 py-3 font-display text-[10px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Printer className="h-3.5 w-3.5" /> Print invoice
          </button>
          <button
            type="button"
            onClick={shareOnWhatsApp}
            disabled={!phone || sharing}
            title={
              phone
                ? "Share the invoice PDF and message with WhatsApp"
                : "Customer phone unavailable"
            }
            className="inline-flex items-center gap-2 border border-accent bg-accent px-4 py-3 font-display text-[10px] uppercase tracking-[0.14em] text-accent-foreground transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" />{" "}
            {sharing ? "Preparing invoice..." : "Share on WhatsApp"}
          </button>
        </div>
      </div>
      {shareNotice && (
        <div
          className="border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent print:hidden"
          role="status"
        >
          {shareNotice}
        </div>
      )}

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
          <div className="min-w-0">
            <span className="eyebrow text-muted-foreground">Billed to</span>
            <p className="mt-3 font-medium text-foreground">{order.delivery.name || "Customer"}</p>
            {order.delivery.phone && (
              <p className="mt-1 text-sm text-muted-foreground">{order.delivery.phone}</p>
            )}
            {order.delivery.email && (
              <p className="mt-1 break-all text-sm text-muted-foreground">{order.delivery.email}</p>
            )}
          </div>
          <div className="min-w-0 border-t border-border pt-8 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <span className="eyebrow text-muted-foreground">Deliver to</span>
            <p className="mt-3 break-words text-sm leading-relaxed text-foreground">
              {address.length > 0
                ? address.map((line, index) => (
                    <span key={`${line}-${index}`} className="block break-words">
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
