import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Coupon } from "@/lib/coupon-types";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Motoluxe Admin" },
      {
        name: "description",
        content: "Configure Motoluxe storefront and operational settings.",
      },
    ],
  }),
  component: AdminSettingsPage,
});

type Settings = {
  storeName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  address: string;
  announcement: string;
  ordersEnabled: boolean;
  customerReviewsEnabled: boolean;
  coupons: Coupon[];
  updatedAt: string | null;
};

const defaults: Settings = {
  storeName: "",
  tagline: "",
  supportEmail: "",
  supportPhone: "",
  whatsappNumber: "",
  address: "",
  announcement: "",
  ordersEnabled: true,
  customerReviewsEnabled: true,
  coupons: [],
  updatedAt: null,
};

function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/settings", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          settings?: Settings;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "We could not load settings.");
        setSettings({ ...defaults, ...payload.settings });
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "We could not load settings.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateCoupon(index: number, patch: Partial<Coupon>) {
    setSettings((current) => ({
      ...current,
      coupons: current.coupons.map((coupon, couponIndex) =>
        couponIndex === index ? { ...coupon, ...patch } : coupon,
      ),
    }));
  }

  function addCoupon() {
    setSettings((current) => ({
      ...current,
      coupons: [
        ...current.coupons,
        {
          id: `coupon-${Date.now()}`,
          code: "",
          description: "",
          discountType: "percentage",
          discountValue: 10,
          minimumOrderValue: 399,
          expiresAt: null,
          active: true,
        },
      ],
    }));
  }

  function removeCoupon(index: number) {
    setSettings((current) => ({
      ...current,
      coupons: current.coupons.filter((_, couponIndex) => couponIndex !== index),
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        settings?: Settings;
        error?: string;
      };
      if (!response.ok || !payload.settings) {
        throw new Error(payload.error ?? "We could not save settings.");
      }
      setSettings(payload.settings);
      window.dispatchEvent(new Event("motoluxe:coupons-updated"));
      window.localStorage.setItem("motoluxe:coupons-updated", String(Date.now()));
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("motoluxe-coupons-updated");
        channel.postMessage({ updatedAt: Date.now() });
        channel.close();
      }
      setNotice("Settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not save settings.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <div className="border border-border bg-card p-8 text-sm text-muted-foreground">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <header className="border-b border-border pb-7">
        <span className="eyebrow text-primary">Control room</span>
        <h1 className="mt-2 text-3xl font-medium sm:text-4xl">Settings.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Keep the storefront identity and operational switches in one place. Changes are stored in
          the Motoluxe MongoDB database.
        </p>
      </header>

      {(error || notice) && (
        <div
          className={`border px-4 py-3 text-sm ${
            error
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-accent/40 bg-accent/10 text-accent"
          }`}
          role={error ? "alert" : "status"}
        >
          {error || notice}
        </div>
      )}

      <form onSubmit={save} className="grid gap-5">
        <section className="border border-border bg-card p-5 sm:p-7">
          <div className="border-b border-border pb-5">
            <span className="eyebrow text-accent">Storefront identity</span>
            <h2 className="mt-2 text-2xl font-medium">How Motoluxe shows up.</h2>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Field label="Store name">
              <input
                required
                value={settings.storeName}
                onChange={(event) => update("storeName", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Tagline">
              <input
                required
                value={settings.tagline}
                onChange={(event) => update("tagline", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Announcement" wide>
              <textarea
                rows={3}
                value={settings.announcement}
                onChange={(event) => update("announcement", event.target.value)}
                placeholder="Optional message shown to your team or customers."
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        <section className="border border-border bg-card p-5 sm:p-7">
          <div className="border-b border-border pb-5">
            <span className="eyebrow text-accent">Support details</span>
            <h2 className="mt-2 text-2xl font-medium">Where customers can reach you.</h2>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Field label="Support email">
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(event) => update("supportEmail", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Support phone">
              <input
                value={settings.supportPhone}
                onChange={(event) => update("supportPhone", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="WhatsApp number">
              <input
                value={settings.whatsappNumber}
                onChange={(event) => update("whatsappNumber", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Business address" wide>
              <textarea
                rows={3}
                value={settings.address}
                onChange={(event) => update("address", event.target.value)}
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        <section className="border border-border bg-card p-5 sm:p-7">
          <div className="border-b border-border pb-5">
            <span className="eyebrow text-accent">Operations</span>
            <h2 className="mt-2 text-2xl font-medium">Control customer activity.</h2>
          </div>
          <div className="mt-6 grid gap-4">
            <Toggle
              checked={settings.ordersEnabled}
              onChange={(value) => update("ordersEnabled", value)}
              title="Accept new orders"
              description="When disabled, signed-in customers receive a clear pause message from the order API."
            />
            <Toggle
              checked={settings.customerReviewsEnabled}
              onChange={(value) => update("customerReviewsEnabled", value)}
              title="Accept customer reviews"
              description="Keep this enabled to let customers submit reviews from their order history for moderation."
            />
          </div>
        </section>

        <section className="border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <span className="eyebrow text-accent">Coupons & offers</span>
              <h2 className="mt-2 text-2xl font-medium">Reward the right basket.</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Active coupons appear in the customer cart and are checked again when an order is
                placed.
              </p>
            </div>
            <button
              type="button"
              onClick={addCoupon}
              className="border border-accent px-4 py-3 font-display text-xs uppercase tracking-[0.14em] text-accent hover:bg-accent hover:text-accent-foreground"
            >
              Add coupon
            </button>
          </div>
          <div className="mt-6 grid gap-4">
            {settings.coupons.length === 0 ? (
              <div className="border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
                No coupons yet. Add an offer such as <span className="text-foreground">RIDE10</span>{" "}
                for 10% off orders above ₹399.
              </div>
            ) : (
              settings.coupons.map((coupon, index) => (
                <div key={coupon.id} className="border border-border bg-background p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="eyebrow text-primary">Coupon {index + 1}</span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Customers see this offer only when it is active and not expired.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCoupon(index)}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <label className="grid gap-2 text-xs text-muted-foreground">
                      Code
                      <input
                        required
                        value={coupon.code}
                        onChange={(event) =>
                          updateCoupon(index, { code: event.target.value.toUpperCase() })
                        }
                        placeholder="RIDE10"
                        className={inputClass}
                      />
                    </label>
                    <label className="grid gap-2 text-xs text-muted-foreground">
                      Discount type
                      <select
                        value={coupon.discountType}
                        onChange={(event) =>
                          updateCoupon(index, {
                            discountType: event.target.value as Coupon["discountType"],
                          })
                        }
                        className={inputClass}
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed amount</option>
                      </select>
                    </label>
                    <label className="grid gap-2 text-xs text-muted-foreground">
                      Discount value
                      <input
                        required
                        type="number"
                        min="1"
                        max={coupon.discountType === "percentage" ? "100" : undefined}
                        value={coupon.discountValue}
                        onChange={(event) =>
                          updateCoupon(index, { discountValue: Number(event.target.value) })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="grid gap-2 text-xs text-muted-foreground">
                      Minimum order value
                      <input
                        required
                        type="number"
                        min="0"
                        value={coupon.minimumOrderValue}
                        onChange={(event) =>
                          updateCoupon(index, { minimumOrderValue: Number(event.target.value) })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="grid gap-2 text-xs text-muted-foreground md:col-span-2">
                      Customer-facing description
                      <input
                        value={coupon.description}
                        onChange={(event) =>
                          updateCoupon(index, { description: event.target.value })
                        }
                        placeholder="10% off your next ride-care order"
                        className={inputClass}
                      />
                    </label>
                    <label className="grid gap-2 text-xs text-muted-foreground">
                      Expiry date
                      <input
                        type="date"
                        value={coupon.expiresAt ?? ""}
                        onChange={(event) =>
                          updateCoupon(index, { expiresAt: event.target.value || null })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="flex items-center gap-3 border border-border px-4 py-3 text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={coupon.active}
                        onChange={(event) => updateCoupon(index, { active: event.target.checked })}
                        className="h-4 w-4 accent-[var(--primary)]"
                      />
                      Active for customers
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
          <p className="text-xs text-muted-foreground">
            {settings.updatedAt
              ? `Last saved ${new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(settings.updatedAt))}`
              : "Using default settings until the first save."}
          </p>
          <button
            type="submit"
            disabled={working}
            className="bg-primary px-6 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-60"
          >
            {working ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`grid gap-2 text-xs text-muted-foreground ${wide ? "lg:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 border border-border bg-background p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--primary)]"
      />
      <span>
        <span className="block text-sm text-foreground">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

const inputClass =
  "w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary";
const textareaClass = `${inputClass} resize-y`;
