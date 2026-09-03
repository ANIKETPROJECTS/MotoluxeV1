import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { AdminReview, ReviewStatus } from "@/lib/server/admin-reviews";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews & Questions — Motoluxe Admin" },
      {
        name: "description",
        content: "Moderate customer reviews before they appear on the Motoluxe storefront.",
      },
    ],
  }),
  component: AdminReviewsPage,
});

type ReviewProduct = { slug: string; name: string };

type ReviewForm = {
  productSlug: string;
  reviewerName: string;
  rating: string;
  title: string;
  body: string;
  status: ReviewStatus;
  media: string;
};

const statuses: Array<{ value: ReviewStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const blankReview: ReviewForm = {
  productSlug: "",
  reviewerName: "",
  rating: "5",
  title: "",
  body: "",
  status: "pending",
  media: "",
};

function reviewToForm(review: AdminReview): ReviewForm {
  return {
    productSlug: review.productSlug,
    reviewerName: review.reviewerName,
    rating: String(review.rating),
    title: review.title,
    body: review.body,
    status: review.status,
    media: review.media.map((item) => `${item.type}|${item.url}`).join("\n"),
  };
}

function formPayload(form: ReviewForm) {
  const media = form.media
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [type, ...urlParts] = line.split("|");
      return {
        type: type === "video" ? "video" : "image",
        url: (urlParts.length ? urlParts.join("|") : (type ?? "")).trim(),
      };
    });
  return {
    productSlug: form.productSlug,
    reviewerName: form.reviewerName,
    rating: Number(form.rating),
    title: form.title,
    body: form.body,
    status: form.status,
    media,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClass(status: ReviewStatus) {
  if (status === "approved") return "border-accent/40 bg-accent/10 text-accent";
  if (status === "rejected") return "border-primary/40 bg-primary/10 text-primary";
  return "border-border bg-background text-muted-foreground";
}

function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [products, setProducts] = useState<ReviewProduct[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState("");
  const [editor, setEditor] = useState<ReviewForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadReviews = useCallback(async (nextSearch = "", nextStatus = "", nextRating = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextStatus) params.set("status", nextStatus);
      if (nextRating) params.set("rating", nextRating);
      const response = await fetch(`/api/admin/reviews?${params.toString()}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        reviews?: AdminReview[];
        products?: ReviewProduct[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "We could not load reviews.");
      setReviews(payload.reviews ?? []);
      setProducts(payload.products ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We could not load reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  function openCreate() {
    setError("");
    setNotice("");
    setEditingId(null);
    setEditor({ ...blankReview, productSlug: products[0]?.slug ?? "" });
  }

  function openEdit(review: AdminReview) {
    setError("");
    setNotice("");
    setEditingId(review.id);
    setEditor(reviewToForm(review));
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        editingId ? `/api/admin/reviews/${editingId}` : "/api/admin/reviews",
        {
          method: editingId ? "PATCH" : "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formPayload(editor)),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not save the review.");
      setEditor(null);
      setEditingId(null);
      setNotice(editingId ? "Review updated." : "Review added.");
      await loadReviews(search, status, rating);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not save the review.");
    } finally {
      setWorking(false);
    }
  }

  async function updateStatus(review: AdminReview, nextStatus: ReviewStatus) {
    setWorkingId(review.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reviewToForm(review), status: nextStatus }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not update moderation.");
      setNotice(`Review ${nextStatus}.`);
      await loadReviews(search, status, rating);
    } catch (statusError) {
      setError(
        statusError instanceof Error ? statusError.message : "We could not update moderation.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteReview(review: AdminReview) {
    if (!window.confirm(`Delete the review “${review.title}”? This cannot be undone.`)) return;
    setWorkingId(review.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not delete the review.");
      setNotice("Review deleted.");
      await loadReviews(search, status, rating);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "We could not delete the review.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="eyebrow text-primary">Module 07 · Reviews &amp; questions</span>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Trust, moderated.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Keep customer feedback useful and safe. Only approved reviews are available to the
            public storefront.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={products.length === 0}
          className="border border-primary bg-primary px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add review
        </button>
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

      {products.length === 0 && !loading && (
        <section className="border border-accent/40 bg-accent/10 p-6 text-sm text-muted-foreground">
          Import products in Products &amp; Catalog before adding a review. Review product
          references are validated against the MongoDB catalog.
        </section>
      )}

      {editor && (
        <section className="border border-primary/40 bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="eyebrow text-primary">
                {editingId ? "Edit record" : "New record"}
              </span>
              <h2 className="mt-2 text-2xl font-semibold">
                {editingId ? "Update review." : "Add a review."}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Use <span className="font-medium">image|URL</span> or{" "}
                <span className="font-medium">video|URL</span> on each media line. Removing all
                lines removes attached media.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditor(null);
                setEditingId(null);
              }}
              className="border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={saveReview} className="mt-7 grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2 text-xs text-muted-foreground">
              Product
              <select
                required
                value={editor.productSlug}
                onChange={(event) => setEditor({ ...editor, productSlug: event.target.value })}
                className="border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.slug} value={product.slug}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs text-muted-foreground">
              Reviewer display name
              <input
                required
                value={editor.reviewerName}
                onChange={(event) => setEditor({ ...editor, reviewerName: event.target.value })}
                className="border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-2 text-xs text-muted-foreground">
              Rating
              <select
                value={editor.rating}
                onChange={(event) => setEditor({ ...editor, rating: event.target.value })}
                className="border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} / 5
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs text-muted-foreground">
              Moderation status
              <select
                value={editor.status}
                onChange={(event) =>
                  setEditor({ ...editor, status: event.target.value as ReviewStatus })
                }
                className="border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              >
                {statuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-xs text-muted-foreground lg:col-span-2">
              Review title
              <input
                required
                value={editor.title}
                onChange={(event) => setEditor({ ...editor, title: event.target.value })}
                className="border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-2 text-xs text-muted-foreground lg:col-span-2">
              Review body
              <textarea
                required
                rows={5}
                value={editor.body}
                onChange={(event) => setEditor({ ...editor, body: event.target.value })}
                className="resize-y border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-2 text-xs text-muted-foreground lg:col-span-2">
              Attached photos/videos
              <textarea
                rows={3}
                value={editor.media}
                onChange={(event) => setEditor({ ...editor, media: event.target.value })}
                placeholder="image|https://example.com/photo.jpg"
                className="resize-y border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <div className="flex gap-3 lg:col-span-2">
              <button
                type="submit"
                disabled={working}
                className="bg-primary px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-60"
              >
                {working ? "Saving…" : editingId ? "Save changes" : "Add review"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditor(null);
                  setEditingId(null);
                }}
                className="border border-border px-4 py-3 text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="border border-border bg-card p-5 sm:p-7">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loadReviews(search, status, rating);
          }}
          className="grid gap-3 lg:grid-cols-[1fr_180px_140px_auto]"
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reviewer, product, title, or review text"
            className="border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">All moderation</option>
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            className="border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} stars
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading}
            className="border border-primary px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </form>
      </section>

      <section className="border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
          <div>
            <span className="eyebrow text-primary">Live review records</span>
            <h2 className="mt-2 text-2xl font-semibold">{reviews.length} reviews</h2>
          </div>
          <span className="font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            MongoDB source
          </span>
        </div>
        {loading ? (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">
            Loading reviews…
          </div>
        ) : reviews.length === 0 ? (
          <div className="px-5 py-14 text-center text-sm text-muted-foreground">
            No reviews match the current filters.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {reviews.map((review) => {
              const busy = workingId === review.id;
              return (
                <article
                  key={review.id}
                  className="grid gap-5 px-5 py-6 sm:px-7 lg:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`border px-2 py-1 text-[10px] uppercase tracking-[0.12em] ${statusClass(review.status)}`}
                      >
                        {review.status}
                      </span>
                      <span className="text-accent" aria-label={`${review.rating} out of 5 stars`}>
                        {"★".repeat(review.rating)}
                        <span className="text-border">{"★".repeat(5 - review.rating)}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold">{review.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {review.body}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {review.reviewerName} · {review.productName}
                      {review.media.length
                        ? ` · ${review.media.length} attachment${review.media.length === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                    {review.status !== "approved" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateStatus(review, "approved")}
                        className="border border-accent/40 px-3 py-2 text-xs text-accent hover:bg-accent/10 disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                    {review.status !== "rejected" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateStatus(review, "rejected")}
                        className="border border-primary/40 px-3 py-2 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => openEdit(review)}
                      className="border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteReview(review)}
                      className="border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
