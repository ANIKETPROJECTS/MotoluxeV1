import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { AdminCatalogProduct } from "@/lib/server/admin-catalog";
import {
  blankProduct,
  ProductEditor,
  productFormInput,
  productToForm,
  type ProductForm,
} from "@/components/admin/ProductEditor";
import { announceCatalogVisibilityChanged } from "@/lib/catalog-visibility-events";

export const Route = createFileRoute("/admin/products/$productId")({
  head: () => ({ meta: [{ title: "Edit Product — Motoluxe Admin" }] }),
  component: EditProductPage,
});

function EditProductPage() {
  const { productId } = useParams({ from: "/admin/products/$productId" });
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductForm>(blankProduct);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/products/${productId}`, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          product?: AdminCatalogProduct;
          error?: string;
        };
        if (!response.ok || !payload.product)
          throw new Error(payload.error ?? "We could not load the product.");
        setForm(productToForm(payload.product));
      })
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "We could not load the product.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [productId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(productFormInput(form)),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not update the product.");
      announceCatalogVisibilityChanged();
      await navigate({ to: "/admin/products" });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not update the product.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/products"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Products &amp; Catalog
      </Link>
      {error && (
        <div
          className="border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary"
          role="alert"
        >
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 border border-border bg-card text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> Loading product
        </div>
      ) : (
        <ProductEditor
          form={form}
          editing
          working={working}
          onChange={setForm}
          onSubmit={save}
          onBack={() => void navigate({ to: "/admin/products" })}
        />
      )}
    </div>
  );
}
