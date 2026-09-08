import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  CategoryEditor,
  categoryToForm,
  type AdminCategory,
  type CategoryForm,
} from "./admin.categories";

export const Route = createFileRoute("/admin/categories/$categoryId")({
  head: () => ({ meta: [{ title: "Edit Category — Motoluxe Admin" }] }),
  component: EditCategoryPage,
});

function EditCategoryPage() {
  const { categoryId } = useParams({ from: "/admin/categories/$categoryId" });
  const navigate = useNavigate();
  const [form, setForm] = useState<CategoryForm | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/categories/${categoryId}`, { credentials: "same-origin" }),
      fetch("/api/admin/categories", { credentials: "same-origin" }),
    ])
      .then(async ([categoryResponse, categoriesResponse]) => {
        const categoryPayload = (await categoryResponse.json().catch(() => ({}))) as {
          category?: AdminCategory;
          error?: string;
        };
        const categoriesPayload = (await categoriesResponse.json().catch(() => ({}))) as {
          categories?: AdminCategory[];
        };
        if (!categoryResponse.ok || !categoryPayload.category) {
          throw new Error(categoryPayload.error ?? "We could not load the category.");
        }
        setForm(categoryToForm(categoryPayload.category));
        setCategories(categoriesPayload.categories ?? []);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : "We could not load the category.",
        );
      })
      .finally(() => setLoading(false));
  }, [categoryId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ...form,
          parentId: form.parentId || null,
          displayOrder: Number(form.displayOrder),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not update the category.");
      await navigate({ to: "/admin/categories" });
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "We could not update the category.",
      );
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
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> Loading category
        </div>
      ) : (
        <CategoryEditor
          form={form}
          editing
          categories={categories}
          working={working}
          onChange={setForm}
          onSubmit={save}
          onCancel={() => void navigate({ to: "/admin/categories" })}
        />
      )}
    </div>
  );
}
