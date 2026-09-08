import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  blankProduct,
  ProductEditor,
  productFormInput,
  type ProductForm,
} from "@/components/admin/ProductEditor";
import { announceCatalogVisibilityChanged } from "@/lib/catalog-visibility-events";

export const Route = createFileRoute("/admin/products/new")({
  head: () => ({ meta: [{ title: "Add Product — Motoluxe Admin" }] }),
  component: NewProductPage,
});

function NewProductPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductForm>(blankProduct);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(productFormInput(form)),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not create the product.");
      announceCatalogVisibilityChanged();
      await navigate({ to: "/admin/products" });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not create the product.");
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
      <ProductEditor
        form={form}
        editing={false}
        working={working}
        onChange={setForm}
        onSubmit={save}
        onBack={() => void navigate({ to: "/admin/products" })}
      />
    </div>
  );
}
