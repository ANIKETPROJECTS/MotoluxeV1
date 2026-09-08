import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, type FormEvent } from "react";
import { BrandEditor, blankBrand, type BrandForm } from "./admin.categories";

export const Route = createFileRoute("/admin/brands/new")({
  head: () => ({ meta: [{ title: "Add Brand — Motoluxe Admin" }] }),
  component: NewBrandPage,
});

function NewBrandPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<BrandForm>(blankBrand);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...form, displayOrder: Number(form.displayOrder) }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not create the brand.");
      await navigate({ to: "/admin/categories" });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not create the brand.");
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
      <BrandEditor
        form={form}
        editing={false}
        working={working}
        onChange={setForm}
        onSubmit={save}
        onCancel={() => void navigate({ to: "/admin/categories" })}
      />
    </div>
  );
}
