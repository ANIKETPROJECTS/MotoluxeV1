import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Check,
  Edit3,
  LoaderCircle,
  PackageSearch,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { categories, type CategorySlug } from "@/data/catalog";
import type { ProductForm } from "@/components/admin/ProductEditor";
import type { AdminCatalogProduct } from "@/lib/server/admin-catalog";
import { announceCatalogVisibilityChanged } from "@/lib/catalog-visibility-events";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [
      { title: "Products & Catalog — Motoluxe Admin" },
      { name: "description", content: "Manage the Motoluxe product catalog and stock." },
    ],
  }),
  component: AdminProductsPage,
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function stockLabel(stock: number) {
  if (stock === 0) return "Out of stock";
  if (stock <= 5) return "Low stock";
  return "In stock";
}

function stockClass(stock: number) {
  if (stock === 0) return "text-primary";
  if (stock <= 5) return "text-accent";
  return "text-foreground";
}

function AdminProductsPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [products, setProducts] = useState<AdminCatalogProduct[]>([]);
  const [needsSeed, setNeedsSeed] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("all");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProducts = useCallback(
    async (nextSearch = search, nextCategory = category, nextStock = stock) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (nextSearch.trim()) params.set("search", nextSearch.trim());
        if (nextCategory) params.set("category", nextCategory);
        if (nextStock !== "all") params.set("stock", nextStock);
        const response = await fetch(`/api/admin/products?${params.toString()}`, {
          credentials: "same-origin",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          products?: AdminCatalogProduct[];
          needsSeed?: boolean;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "We could not load products.");
        setProducts(payload.products ?? []);
        setNeedsSeed(Boolean(payload.needsSeed));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "We could not load products.");
      } finally {
        setLoading(false);
      }
    },
    [category, search, stock],
  );

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  if (pathname !== "/admin/products" && pathname !== "/admin/products/") {
    return <Outlet />;
  }

  async function importStarterCatalog() {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "seed" }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        imported?: number;
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error ?? "We could not import the starter catalog.");
      setNotice(
        payload.imported
          ? `${payload.imported} starter product${payload.imported === 1 ? "" : "s"} imported.`
          : "The starter catalog is already present.",
      );
      await loadProducts();
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "We could not import the catalog.");
    } finally {
      setWorking(false);
    }
  }

  async function toggleProduct(product: AdminCatalogProduct, field: "published" | "featured") {
    setWorkingId(product.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ...product,
          [field]: !product[field],
          benefits: product.benefits,
          usage: product.usage,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not update the product.");
      setNotice(
        `${product.name} ${field === "published" ? "visibility" : "featured status"} updated.`,
      );
      announceCatalogVisibilityChanged();
      await loadProducts();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : "We could not update the product.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function deleteProduct(product: AdminCatalogProduct) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    setWorkingId(product.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not delete the product.");
      setNotice(`${product.name} deleted.`);
      await loadProducts();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "We could not delete the product.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="eyebrow text-primary">Module 02 · Products &amp; catalog</span>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Product control.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Manage the catalog that powers Motoluxe. Every record is stored in MongoDB with
            visibility, merchandising, and stock state.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/"
            target="_blank"
            className="inline-flex items-center gap-2 border border-border px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Storefront <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => void navigate({ to: "/admin/products/new" })}
            className="inline-flex items-center gap-2 bg-primary px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add product
          </button>
        </div>
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

      {needsSeed && !loading && (
        <section className="border border-accent/40 bg-accent/10 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <span className="eyebrow text-accent">Catalog is empty</span>
              <h2 className="mt-2 text-2xl font-semibold">Import the Motoluxe starter catalog.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                This is a deliberate, insert-only import of the five products already defined for
                the storefront. It sets stock to zero and will not overwrite later admin edits.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void importStarterCatalog()}
              disabled={working}
              className="inline-flex shrink-0 items-center gap-2 bg-accent px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-accent-foreground disabled:opacity-60"
            >
              {working ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PackageSearch className="h-3.5 w-3.5" />
              )}
              Import starter catalog
            </button>
          </div>
        </section>
      )}

      <section className="border border-border bg-card p-5 sm:p-7">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loadProducts();
          }}
          className="grid gap-3 lg:grid-cols-[1fr_190px_170px_auto]"
        >
          <label className="sr-only" htmlFor="product-search">
            Search products
          </label>
          <input
            id="product-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by product name, slug, or tagline"
            className="border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            className="border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="all">All stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 border border-primary px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
          >
            {loading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </form>
      </section>

      <section className="border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
          <div>
            <span className="eyebrow text-primary">Live catalog records</span>
            <h2 className="mt-2 text-2xl font-semibold">{products.length} product records</h2>
          </div>
          <span className="font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            MongoDB source
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> Loading products
          </div>
        ) : products.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <PackageSearch className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              No products match the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-4 font-normal sm:px-7">Product</th>
                  <th className="px-4 py-4 font-normal">Category</th>
                  <th className="px-4 py-4 font-normal">Price</th>
                  <th className="px-4 py-4 font-normal">Stock</th>
                  <th className="px-4 py-4 font-normal">Visibility</th>
                  <th className="px-4 py-4 text-right font-normal">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const categoryName =
                    categories.find((item) => item.slug === product.category)?.name ??
                    product.category;
                  const busy = workingId === product.id;
                  return (
                    <tr key={product.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-5 sm:px-7">
                        <div className="flex items-center gap-4">
                          <img
                            src={product.image}
                            alt=""
                            className="h-14 w-12 border border-border object-cover"
                          />
                          <div>
                            <p className="font-medium text-foreground">{product.name}</p>
                            <p className="mt-1 font-display text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                              {product.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-muted-foreground">{categoryName}</td>
                      <td className="px-4 py-5 text-muted-foreground">{product.price}</td>
                      <td className={`px-4 py-5 ${stockClass(product.stock)}`}>
                        <span className="block font-medium">{product.stock}</span>
                        <span className="mt-1 block text-xs">{stockLabel(product.stock)}</span>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void toggleProduct(product, "published")}
                            className={`inline-flex items-center gap-1 border px-2 py-1 text-[10px] capitalize transition-colors ${
                              product.published
                                ? "border-accent/40 bg-accent/10 text-accent"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {product.published && <Check className="h-3 w-3" />}
                            {product.published ? "Published" : "Hidden"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void toggleProduct(product, "featured")}
                            className={`border px-2 py-1 text-[10px] capitalize transition-colors ${
                              product.featured
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {product.featured ? "Featured" : "Standard"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void navigate({
                                to: "/admin/products/$productId",
                                params: { productId: product.id },
                              })
                            }
                            className="inline-flex items-center gap-1 border border-border px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void deleteProduct(product)}
                            className="inline-flex items-center gap-1 border border-border px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                        <p className="mt-2 text-right text-[10px] text-muted-foreground">
                          Updated {formatDate(product.updatedAt)}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ProductEditor({
  form,
  editing,
  working,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: ProductForm;
  editing: boolean;
  working: boolean;
  onChange: (form: ProductForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");

  function update<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    onChange({ ...form, [key]: value });
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingImage(true);
    setUploadError("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("kind", "product");
      payload.append("section", form.category);
      if (form.slug.trim()) payload.append("publicId", form.slug.trim());
      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        credentials: "same-origin",
        body: payload,
      });
      const result = (await response.json().catch(() => ({}))) as {
        asset?: { secureUrl?: string };
        error?: string;
      };
      if (!response.ok || !result.asset?.secureUrl) {
        throw new Error(result.error ?? "We could not upload the image.");
      }
      update("image", result.asset.secureUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "We could not upload the image.");
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <section className="border border-primary/40 bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="eyebrow text-primary">{editing ? "Edit record" : "New record"}</span>
          <h2 className="mt-2 text-2xl font-semibold">
            {editing ? "Update product." : "Add a product."}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            All fields are validated again on the server before MongoDB is changed.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-7 grid gap-5 lg:grid-cols-2">
        <Field label="Product name">
          <input
            required
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Stable slug">
          <input
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            value={form.slug}
            onChange={(event) => update("slug", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Tagline">
          <input
            required
            value={form.tagline}
            onChange={(event) => update("tagline", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Category">
          <select
            value={form.category}
            onChange={(event) => update("category", event.target.value as CategorySlug)}
            className={inputClass}
          >
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price or pricing label">
          <input
            required
            value={form.price}
            onChange={(event) => update("price", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Size or pack format">
          <input
            required
            value={form.size}
            onChange={(event) => update("size", event.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-2">
          <label className="text-xs text-muted-foreground">Product image</label>
          <div className="flex flex-wrap gap-3">
            <input
              required
              value={form.image}
              onChange={(event) => update("image", event.target.value)}
              placeholder="Cloudinary secure URL"
              className={`${inputClass} min-w-0 flex-1`}
            />
            <label className="inline-flex cursor-pointer items-center border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent hover:bg-accent/20">
              {uploadingImage ? "Uploading…" : "Upload to Cloudinary"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={uploadImage}
                disabled={uploadingImage}
                className="sr-only"
              />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Stored in Cloudinary under Motoluxe / Products / {form.category || "uncategorized"}.
          </p>
          {uploadError && <p className="text-xs text-primary">{uploadError}</p>}
        </div>
        <Field label="Badge (optional)">
          <input
            value={form.badge}
            onChange={(event) => update("badge", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Stock quantity">
          <input
            required
            min="0"
            step="1"
            type="number"
            value={form.stock}
            onChange={(event) => update("stock", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Description" wide>
          <textarea
            required
            rows={4}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className={textareaClass}
          />
        </Field>
        <Field label="Benefits (one per line)">
          <textarea
            rows={5}
            value={form.benefits}
            onChange={(event) => update("benefits", event.target.value)}
            className={textareaClass}
          />
        </Field>
        <Field label="Usage steps (one per line)">
          <textarea
            rows={5}
            value={form.usage}
            onChange={(event) => update("usage", event.target.value)}
            className={textareaClass}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-5 lg:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) => update("published", event.target.checked)}
            />
            Published on storefront
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => update("featured", event.target.checked)}
            />
            Featured product
          </label>
        </div>
        <div className="flex justify-end gap-3 border-t border-border pt-5 lg:col-span-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-border px-5 py-3 text-xs text-muted-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={working || uploadingImage}
            className="inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-60"
          >
            {working && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {editing ? "Save changes" : "Create product"}
          </button>
        </div>
      </form>
    </section>
  );
}

const inputClass =
  "w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary";
const textareaClass = `${inputClass} resize-y`;

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "lg:col-span-2" : ""}>
      <span className="eyebrow mb-2 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
