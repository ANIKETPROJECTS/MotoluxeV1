import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  blankCategory,
  CategoryEditor,
  type AdminCategory,
  type CategoryForm,
} from "./admin.categories";

export const Route = createFileRoute("/admin/categories/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    parentId: typeof search["parentId"] === "string" ? search["parentId"] : "",
  }),
  head: () => ({ meta: [{ title: "Add Category — Motoluxe Admin" }] }),
  component: NewCategoryPage,
});

function NewCategoryPage() {
  const navigate = useNavigate();
  const { parentId } = useSearch({ from: "/admin/categories/new" });
  const [form, setForm] = useState<CategoryForm>({ ...blankCategory, parentId });
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/categories", { credentials: "same-origin" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          categories?: AdminCategory[];
        };
        if (response.ok) setCategories(payload.categories ?? []);
      })
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ...form,
          parentId: form.parentId || null,
          displayOrder: Number(form.displayOrder),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not create the category.");
      await navigate({ to: "/admin/categories" });
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "We could not create the category.",
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
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Categories
      </Link>
      {error && (
        <div
          className="border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary"
          role="alert"
        >
          {error}
        </div>
      )}
      <CategoryEditor
        form={form}
        editing={false}
        categories={categories}
        working={working}
        onChange={setForm}
        onSubmit={save}
        onCancel={() => void navigate({ to: "/admin/categories" })}
      />
    </div>
  );
}
