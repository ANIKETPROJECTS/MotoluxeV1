import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartContext";
import { CATALOG_VISIBILITY_EVENT } from "@/lib/catalog-visibility-events";

type PaymentStatusPayload = {
  found?: boolean;
  state?: string;
  orderNumber?: string;
  inventoryIssue?: string;
  error?: string;
};

export const Route = createFileRoute("/order/return")({
  validateSearch: (search: Record<string, unknown>) => ({
    merchantOrderId: typeof search["merchantOrderId"] === "string" ? search["merchantOrderId"] : "",
  }),
  head: () => ({
    meta: [{ title: "Confirming payment — Motoluxe" }, { name: "robots", content: "noindex" }],
  }),
  component: PaymentReturnPage,
});

function PaymentReturnPage() {
  const { merchantOrderId } = Route.useSearch();
  const { clearCart } = useCart();
  const [state, setState] = useState<"checking" | "pending" | "failed" | "complete" | "error">(
    "checking",
  );
  const [orderNumber, setOrderNumber] = useState("");
  const [inventoryIssue, setInventoryIssue] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!/^MO[a-f0-9]{32}$/.test(merchantOrderId)) {
      setState("error");
      setMessage("This payment reference is missing or invalid.");
      return;
    }

    let stopped = false;
    let retryTimer = 0;
    let checks = 0;

    async function checkPayment() {
      try {
        const response = await fetch(
          `/api/payments/phonepe/status?merchantOrderId=${encodeURIComponent(merchantOrderId)}`,
          { credentials: "same-origin", cache: "no-store" },
        );
        const payload = (await response.json().catch(() => ({}))) as PaymentStatusPayload;
        if (!response.ok) {
          if (response.status === 503 && checks < 30) {
            checks += 1;
            retryTimer = window.setTimeout(checkPayment, 3_000);
            return;
          }
          throw new Error(payload.error ?? "We could not verify this payment.");
        }
        if (payload.state === "COMPLETED" && payload.orderNumber) {
          if (stopped) return;
          setOrderNumber(payload.orderNumber);
          setInventoryIssue(payload.inventoryIssue ?? "");
          setState("complete");
          clearCart();
          window.dispatchEvent(new Event("motoluxe:inventory-updated"));
          window.dispatchEvent(new Event(CATALOG_VISIBILITY_EVENT));
          return;
        }
        if (payload.state === "FAILED" || payload.state === "EXPIRED") {
          if (stopped) return;
          setState("failed");
          setMessage("PhonePe did not complete this payment. Your cart is still available.");
          return;
        }
        if (checks >= 30) {
          if (stopped) return;
          setState("pending");
          setMessage(
            "PhonePe has not returned a final status yet. Your cart is unchanged; refresh this page in a moment.",
          );
          return;
        }
        checks += 1;
        if (!stopped) retryTimer = window.setTimeout(checkPayment, 3_000);
      } catch (error) {
        if (stopped) return;
        setState("error");
        setMessage(error instanceof Error ? error.message : "We could not verify this payment.");
      }
    }

    void checkPayment();
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
    };
  }, [clearCart, merchantOrderId]);

  const completed = state === "complete";

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-5 py-20">
      <div className="w-full border border-border bg-card p-8 text-center sm:p-14">
        <div
          className={`mx-auto grid h-16 w-16 place-items-center ${
            completed
              ? "bg-accent/15 text-accent"
              : state === "failed" || state === "error"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {completed ? (
            <Check className="h-8 w-8" />
          ) : state === "failed" || state === "error" ? (
            <X className="h-8 w-8" />
          ) : (
            <LoaderCircle className="h-8 w-8 animate-spin" />
          )}
        </div>
        <span className="eyebrow mt-7 block text-primary">
          {completed
            ? "Payment confirmed"
            : state === "failed"
              ? "Payment not completed"
              : state === "error"
                ? "Payment status unavailable"
                : "PhonePe"}
        </span>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
          {completed
            ? "Thank you."
            : state === "failed"
              ? "Your cart is saved."
              : state === "error"
                ? "We couldn't verify payment."
                : state === "pending"
                  ? "Payment still pending."
                  : "Checking your payment…"}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
          {completed
            ? "Your verified order is now available in your Motoluxe account and the Admin Orders screen."
            : message || "We are checking the payment status directly with PhonePe."}
        </p>
        {completed && orderNumber && (
          <p className="mt-5 border border-accent/30 bg-accent/10 px-4 py-3 font-display text-xs uppercase tracking-[0.14em] text-accent">
            Reference: {orderNumber}
          </p>
        )}
        {inventoryIssue && (
          <p className="mt-4 border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
            Payment was confirmed, but stock needs administrator attention. Motoluxe has been
            notified with your order.
          </p>
        )}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {completed ? (
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 bg-primary px-5 py-4 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground"
            >
              View your order <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/order"
              className="inline-flex items-center gap-2 border border-border px-5 py-4 font-display text-xs uppercase tracking-[0.16em] text-muted-foreground"
            >
              Return to checkout
            </Link>
          )}
          <Link
            to="/"
            className="inline-flex items-center border border-border px-5 py-4 font-display text-xs uppercase tracking-[0.16em] text-muted-foreground"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}
