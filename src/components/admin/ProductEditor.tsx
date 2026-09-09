/* eslint-disable react-refresh/only-export-components */
import { LoaderCircle } from "lucide-react";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { categories, type CategorySlug } from "@/data/catalog";
import type { AdminCatalogProduct } from "@/lib/server/admin-catalog";

export type ProductForm = {
  slug: string;
  name: string;
  tagline: string;
  category: CategorySlug;
  price: string;
  size: string;
  image: string;
  badge: string;
  description: string;
  benefits: string;
  usage: string;
  published: boolean;
  featured: boolean;
  stock: string;
};

export const blankProduct: ProductForm = {
  slug: "",
  name: "",
  tagline: "",
  category: "chain-care",
  price: "Request price",
  size: "Retail pack",
  image: "",
  badge: "",
  description: "",
  benefits: "",
  usage: "",
  published: true,
  featured: false,
  stock: "0",
};

export function productToForm(product: AdminCatalogProduct): ProductForm {
  return {
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    category: product.category,
    price: product.price,
    size: product.size,
    image: product.image,
    badge: product.badge ?? "",
    description: product.description,
    benefits: product.benefits.join("\n"),
    usage: product.usage.join("\n"),
    published: product.published,
    featured: product.featured,
    stock: String(product.stock),
  };
}

export function productFormInput(form: ProductForm) {
  return {
    ...form,
    benefits: form.benefits
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    usage: form.usage
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    stock: Number(form.stock),
  };
}

export function ProductEditor({
  form,
  editing,
  working,
  onChange,
  onSubmit,
  onBack,
}: {
  form: ProductForm;
  editing: boolean;
  working: boolean;
  onChange: (form: ProductForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
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
      payload.append("productName", form.name.trim());
      payload.append("publicId", "img");
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
          <h1 className="mt-2 text-2xl font-semibold">
            {editing ? "Update product." : "Add a product."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            All fields are validated again on the server before MongoDB is changed.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Back to products
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
                disabled={uploadingImage || !form.name.trim()}
                className="sr-only"
              />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Stored in Cloudinary under Motoluxe / Products / {form.category || "uncategorized"} /{" "}
            {form.name.trim() || "product-name"} / img.
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
            onClick={onBack}
            className="border border-border px-5 py-3 text-xs text-muted-foreground"
          >
            Back
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
    <label className={wide ? "lg:col-span-2" : ""}>
      <span className="eyebrow mb-2 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary";
const textareaClass = `${inputClass} resize-y`;
