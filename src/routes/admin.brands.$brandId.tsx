import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { BrandEditor, brandToForm, type AdminBrand, type BrandForm } from "./admin.categories";

export const Route = createFileRoute("/admin/brands/$brandId")({
  head: () => ({ meta: [{ title: "Edit Brand — Motoluxe Admin" }] }),
  component: EditBrandPage,
});

function EditBrandPage() {
  const { brandId } = useParams({ from: "/admin/brands/$brandId" });
  const navigate = useNavigate();
  const [form, setForm] = useState<BrandForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/brands/${brandId}`, { credentials: "same-origin" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          brand?: AdminBrand;
          error?: string;
        };
        if (!response.ok || !payload.brand)
          throw new Error(payload.error ?? "We could not load the brand.");
        setForm(brandToForm(payload.brand));
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "We could not load the brand.");
      })
      .finally(() => setLoading(false));
  }, [brandId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/brands/${brandId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...form, displayOrder: Number(form.displayOrder) }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not update the brand.");
      await navigate({ to: "/admin/categories" });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not update the brand.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/categories"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Categories &amp; Brands
      </Link>
      {error && (
        <div
          className="border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary"
          role="alert"
        >
          {error}
        </div>
      )}
      {loading || !form ? (
        <div className="flex min-h-48 items-center justify-center gap-3 border border-border bg-card text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> Loading brand
        </div>
      ) : (
        <BrandEditor
          form={form}
          editing
          working={working}
          onChange={setForm}
          onSubmit={save}
          onCancel={() => void navigate({ to: "/admin/categories" })}
        />
      )}
    </div>
  );
}
