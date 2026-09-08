/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArrowUpRight,
  Check,
  Edit3,
  ExternalLink,
  FolderTree,
  Globe2,
  LoaderCircle,
  Plus,
  RefreshCw,
  Tags,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({
    meta: [
      { title: "Categories & Brands — Motoluxe Admin" },
      {
        name: "description",
        content: "Manage Motoluxe catalog categories, subcategories, and brands.",
      },
    ],
  }),
  component: AdminCategoriesPage,
});

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  image: string;
  displayOrder: number;
  published: boolean;
  featured: boolean;
  childCount: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  website: string;
  active: boolean;
  displayOrder: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryForm = {
  name: string;
  slug: string;
  parentId: string;
  description: string;
  image: string;
  displayOrder: string;
  published: boolean;
  featured: boolean;
};

export type BrandForm = {
  name: string;
  slug: string;
  logo: string;
  description: string;
  website: string;
  displayOrder: string;
  active: boolean;
};

export const blankCategory: CategoryForm = {
  name: "",
  slug: "",
  parentId: "",
  description: "",
  image: "",
  displayOrder: "0",
  published: true,
  featured: false,
};

export const blankBrand: BrandForm = {
  name: "",
  slug: "",
  logo: "",
  description: "",
  website: "",
  displayOrder: "0",
  active: true,
};

export function categoryToForm(category: AdminCategory): CategoryForm {
  return {
    name: category.name,
    slug: category.slug,
    parentId: category.parentId ?? "",
    description: category.description,
    image: category.image,
    displayOrder: String(category.displayOrder),
    published: category.published,
    featured: category.featured,
  };
}

export function brandToForm(brand: AdminBrand): BrandForm {
  return {
    name: brand.name,
    slug: brand.slug,
    logo: brand.logo,
    description: brand.description,
    website: brand.website,
    displayOrder: String(brand.displayOrder),
    active: brand.active,
  };
}

function AdminCategoriesPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"categories" | "brands">("categories");
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [categoryEditor, setCategoryEditor] = useState<CategoryForm | null>(null);
  const [categoryEditingId, setCategoryEditingId] = useState<string | null>(null);
  const [brandEditor, setBrandEditor] = useState<BrandForm | null>(null);
  const [brandEditingId, setBrandEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [needsSeed, setNeedsSeed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadCategories(
    nextSearch = categorySearch,
    nextPublished = publishedFilter,
    showSpinner = true,
  ) {
    if (showSpinner) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextPublished !== "all") params.set("published", nextPublished);
      const response = await fetch(`/api/admin/categories?${params.toString()}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        categories?: AdminCategory[];
        needsSeed?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "We could not load categories.");
      setCategories(payload.categories ?? []);
      setNeedsSeed(Boolean(payload.needsSeed));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We could not load categories.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function loadBrands(nextSearch = brandSearch, nextActive = activeFilter) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextActive !== "all") params.set("active", nextActive);
      const response = await fetch(`/api/admin/brands?${params.toString()}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        brands?: AdminBrand[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "We could not load brands.");
      setBrands(payload.brands ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We could not load brands.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    setError("");
    await Promise.all([
      loadCategories(categorySearch, publishedFilter, false),
      loadBrands(brandSearch, activeFilter),
    ]);
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
    // The initial load intentionally captures the default filters once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCategoryCreate(parentId = "") {
    void navigate({
      to: "/admin/categories/new",
      search: { parentId },
    });
  }

  function openCategoryEdit(category: AdminCategory) {
    void navigate({
      to: "/admin/categories/$categoryId",
      params: { categoryId: category.id },
    });
  }

  function closeEditors() {
    setCategoryEditor(null);
    setCategoryEditingId(null);
    setBrandEditor(null);
    setBrandEditingId(null);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryEditor) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        categoryEditingId ? `/api/admin/categories/${categoryEditingId}` : "/api/admin/categories",
        {
          method: categoryEditingId ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            ...categoryEditor,
            parentId: categoryEditor.parentId || null,
            displayOrder: Number(categoryEditor.displayOrder),
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not save the category.");
      setNotice(categoryEditingId ? "Category updated." : "Category created.");
      closeEditors();
      await loadCategories();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not save the category.");
    } finally {
      setWorking(false);
    }
  }

  async function deleteCategory(category: AdminCategory) {
    if (
      !window.confirm(
        `Delete “${category.name}”? Categories with products or subcategories cannot be deleted.`,
      )
    )
      return;
    setWorkingId(category.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not delete the category.");
      setNotice("Category deleted.");
      await loadCategories();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "We could not delete the category.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function toggleCategory(category: AdminCategory) {
    setWorkingId(category.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          description: category.description,
          image: category.image,
          displayOrder: category.displayOrder,
          published: !category.published,
          featured: category.featured,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not update the category.");
      setNotice(category.published ? "Category moved to draft." : "Category published.");
      await loadCategories();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : "We could not update the category.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function seedCategories() {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "seed" }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        imported?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "We could not import categories.");
      setNotice(
        payload.imported
          ? `${payload.imported} starter categor${payload.imported === 1 ? "y" : "ies"} imported.`
          : "The starter categories are already present.",
      );
      await loadCategories();
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "We could not import categories.");
    } finally {
      setWorking(false);
    }
  }

  function openBrandCreate() {
    void navigate({ to: "/admin/brands/new" });
  }

  function openBrandEdit(brand: AdminBrand) {
    void navigate({ to: "/admin/brands/$brandId", params: { brandId: brand.id } });
  }

  async function saveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!brandEditor) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        brandEditingId ? `/api/admin/brands/${brandEditingId}` : "/api/admin/brands",
        {
          method: brandEditingId ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            ...brandEditor,
            displayOrder: Number(brandEditor.displayOrder),
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not save the brand.");
      setNotice(brandEditingId ? "Brand updated." : "Brand created.");
      closeEditors();
      await loadBrands();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "We could not save the brand.");
    } finally {
      setWorking(false);
    }
  }

  async function deleteBrand(brand: AdminBrand) {
    if (
      !window.confirm(
        `Delete “${brand.name}”? Brands assigned to products must be reassigned first.`,
      )
    )
      return;
    setWorkingId(brand.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/brands/${brand.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not delete the brand.");
      setNotice("Brand deleted.");
      await loadBrands();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "We could not delete the brand.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function toggleBrand(brand: AdminBrand) {
    setWorkingId(brand.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/brands/${brand.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: brand.name,
          slug: brand.slug,
          logo: brand.logo,
          description: brand.description,
          website: brand.website,
          displayOrder: brand.displayOrder,
          active: !brand.active,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not update the brand.");
      setNotice(brand.active ? "Brand deactivated." : "Brand activated.");
      await loadBrands();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : "We could not update the brand.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="eyebrow text-primary">Module 03 · Categories &amp; brands</span>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Organise the range.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Keep catalog navigation clear with MongoDB-backed category hierarchy and a reusable
            brand directory. Product relationships are checked before anything is deleted.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {view === "categories" && needsSeed && (
            <button
              type="button"
              onClick={() => void seedCategories()}
              disabled={working}
              className="inline-flex items-center gap-2 border border-accent px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-accent disabled:opacity-60"
            >
              {working ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              Import starter categories
            </button>
          )}
          <button
            type="button"
            onClick={() => (view === "categories" ? openCategoryCreate() : openBrandCreate())}
            className="inline-flex items-center gap-2 bg-primary px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add {view === "categories" ? "category" : "brand"}
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

      <div className="grid gap-2 border-b border-border sm:flex">
        <button
          type="button"
          onClick={() => {
            closeEditors();
            setView("categories");
            setError("");
          }}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 font-display text-xs uppercase tracking-[0.18em] ${
            view === "categories"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderTree className="h-4 w-4" /> Categories
        </button>
        <button
          type="button"
          onClick={() => {
            closeEditors();
            setView("brands");
            setError("");
          }}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 font-display text-xs uppercase tracking-[0.18em] ${
            view === "brands"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tags className="h-4 w-4" /> Brands
        </button>
      </div>

      {categoryEditor && (
        <CategoryEditor
          form={categoryEditor}
          editing={Boolean(categoryEditingId)}
          categories={categories}
          working={working}
          onChange={setCategoryEditor}
          onSubmit={saveCategory}
          onCancel={closeEditors}
        />
      )}
      {brandEditor && (
        <BrandEditor
          form={brandEditor}
          editing={Boolean(brandEditingId)}
          working={working}
          onChange={setBrandEditor}
          onSubmit={saveBrand}
          onCancel={closeEditors}
        />
      )}

      {view === "categories" ? (
        <section className="space-y-5">
          <FilterBar
            search={categorySearch}
            onSearch={setCategorySearch}
            filter={publishedFilter}
            onFilter={setPublishedFilter}
            filterLabel="Publication"
            options={[
              ["all", "All categories"],
              ["published", "Published"],
              ["draft", "Drafts"],
            ]}
            onRefresh={() => void loadCategories()}
            loading={loading}
            placeholder="Search category name, slug, or description"
          />
          <section className="border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
              <div>
                <span className="eyebrow text-primary">Live category records</span>
                <h2 className="mt-2 text-2xl font-semibold">{categories.length} categories</h2>
              </div>
              <span className="font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                MongoDB source · order is explicit
              </span>
            </div>
            {loading ? (
              <LoadingState label="Loading categories" />
            ) : categories.length === 0 ? (
              <EmptyState
                icon={FolderTree}
                title={needsSeed ? "Start with the Motoluxe categories." : "No categories found."}
                copy={
                  needsSeed
                    ? "Import the three existing storefront categories as editable MongoDB records, or create your own."
                    : "Try another search or add a new category."
                }
                action={
                  needsSeed ? (
                    <button
                      type="button"
                      onClick={() => void seedCategories()}
                      className="mt-5 inline-flex items-center gap-2 bg-accent px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-accent-foreground"
                    >
                      <Archive className="h-3.5 w-3.5" /> Import starter categories
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="divide-y divide-border">
                {categories
                  .filter(
                    (category) =>
                      !category.parentId ||
                      !categories.some((item) => item.id === category.parentId),
                  )
                  .map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      allCategories={categories}
                      depth={0}
                      workingId={workingId}
                      onAddChild={openCategoryCreate}
                      onEdit={openCategoryEdit}
                      onDelete={deleteCategory}
                      onToggle={toggleCategory}
                    />
                  ))}
              </div>
            )}
          </section>
        </section>
      ) : (
        <section className="space-y-5">
          <FilterBar
            search={brandSearch}
            onSearch={setBrandSearch}
            filter={activeFilter}
            onFilter={setActiveFilter}
            filterLabel="Status"
            options={[
              ["all", "All brands"],
              ["active", "Active"],
              ["inactive", "Inactive"],
            ]}
            onRefresh={() => void loadBrands()}
            loading={loading}
            placeholder="Search brand name, slug, or description"
          />
          <section className="border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
              <div>
                <span className="eyebrow text-primary">Brand directory</span>
                <h2 className="mt-2 text-2xl font-semibold">{brands.length} brands</h2>
              </div>
              <span className="font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                MongoDB source
              </span>
            </div>
            {loading ? (
              <LoadingState label="Loading brands" />
            ) : brands.length === 0 ? (
              <EmptyState
                icon={Tags}
                title="No brands have been added."
                copy="Create a brand record when you are ready to connect products to manufacturers or supplier lines."
                action={
                  <button
                    type="button"
                    onClick={openBrandCreate}
                    className="mt-5 inline-flex items-center gap-2 bg-primary px-4 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add first brand
                  </button>
                }
              />
            ) : (
              <div className="divide-y divide-border">
                {brands.map((brand) => {
                  const busy = workingId === brand.id;
                  return (
                    <article
                      key={brand.id}
                      className="flex flex-wrap items-start gap-4 px-5 py-5 sm:px-7"
                    >
                      {brand.logo ? (
                        <img
                          src={brand.logo}
                          alt=""
                          className="h-14 w-14 shrink-0 border border-border bg-background object-contain p-2"
                        />
                      ) : (
                        <div className="grid h-14 w-14 shrink-0 place-items-center border border-border bg-background text-primary">
                          <Tags className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold">{brand.name}</h3>
                          <StatusBadge
                            active={brand.active}
                            activeLabel="Active"
                            inactiveLabel="Inactive"
                          />
                        </div>
                        <p className="mt-1 font-display text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {brand.slug} · display order {brand.displayOrder}
                        </p>
                        {brand.description && (
                          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                            {brand.description}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>
                            {brand.productCount} assigned product
                            {brand.productCount === 1 ? "" : "s"}
                          </span>
                          {brand.website && (
                            <a
                              href={brand.website}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-accent hover:text-primary"
                            >
                              Website <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void toggleBrand(brand)}
                          className={`inline-flex items-center gap-1 border px-2.5 py-2 text-xs transition-colors ${
                            brand.active
                              ? "border-accent/40 text-accent hover:bg-accent/10"
                              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                          }`}
                        >
                          {brand.active && <Check className="h-3 w-3" />}
                          {brand.active ? "Active" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openBrandEdit(brand)}
                          className="inline-flex items-center gap-1 border border-border px-2.5 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void deleteBrand(brand)}
                          className="inline-flex items-center gap-1 border border-border px-2.5 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
          <p className="border border-accent/30 bg-accent/10 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Brand relationships are counted from product records using <code>brandId</code>. The
            current five starter products do not have a brand assignment yet, so this directory
            stays truthful until products are linked.
          </p>
        </section>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  allCategories,
  depth,
  workingId,
  onAddChild,
  onEdit,
  onDelete,
  onToggle,
}: {
  category: AdminCategory;
  allCategories: AdminCategory[];
  depth: number;
  workingId: string | null;
  onAddChild: (parentId: string) => void;
  onEdit: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
  onToggle: (category: AdminCategory) => void;
}) {
  const children = allCategories.filter((item) => item.parentId === category.id);
  const busy = workingId === category.id;

  return (
    <div>
      <article
        className={`flex flex-wrap items-start gap-4 px-5 py-5 sm:px-7 ${depth ? "border-l-2 border-primary/25 bg-background/30" : ""}`}
        style={{ marginLeft: depth ? `${Math.min(depth, 3) * 1.25}rem` : undefined }}
      >
        <img
          src={category.image}
          alt=""
          className="h-16 w-20 shrink-0 border border-border object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-xl font-bold text-primary/70">
              {String(category.displayOrder).padStart(2, "0")}
            </span>
            <h3 className="text-lg font-semibold">{category.name}</h3>
            <StatusBadge
              active={category.published}
              activeLabel="Published"
              inactiveLabel="Draft"
            />
            {category.featured && (
              <span className="border border-accent/40 bg-accent/10 px-2 py-1 text-[10px] text-accent">
                Featured
              </span>
            )}
          </div>
          <p className="mt-1 font-display text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {category.slug}
            {category.parentId ? " · subcategory" : " · parent category"}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {category.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              {category.productCount} assigned product{category.productCount === 1 ? "" : "s"}
            </span>
            <span>
              {category.childCount} subcategor{category.childCount === 1 ? "y" : "ies"}
            </span>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:max-w-[250px] sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggle(category)}
            className={`inline-flex items-center gap-1 border px-2.5 py-2 text-xs transition-colors ${
              category.published
                ? "border-accent/40 text-accent hover:bg-accent/10"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {category.published && <Check className="h-3 w-3" />}
            {category.published ? "Published" : "Publish"}
          </button>
          <button
            type="button"
            onClick={() => onAddChild(category.id)}
            className="inline-flex items-center gap-1 border border-border px-2.5 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" /> Subcategory
          </button>
          <button
            type="button"
            onClick={() => onEdit(category)}
            className="inline-flex items-center gap-1 border border-border px-2.5 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Edit3 className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(category)}
            className="inline-flex items-center gap-1 border border-border px-2.5 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </article>
      {children.map((child) => (
        <CategoryRow
          key={child.id}
          category={child}
          allCategories={allCategories}
          depth={depth + 1}
          workingId={workingId}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

export function CategoryEditor({
  form,
  editing,
  categories,
  working,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: CategoryForm;
  editing: boolean;
  categories: AdminCategory[];
  working: boolean;
  onChange: (form: CategoryForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  function update<K extends keyof CategoryForm>(key: K, value: CategoryForm[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <section className="border border-primary/40 bg-card p-5 sm:p-7">
      <EditorHeading
        eyebrow={editing ? "Edit category" : "New category"}
        title={editing ? "Update the category." : "Add a category."}
        copy="Use a stable slug and explicit order. All validation runs again on the server."
        onCancel={onCancel}
      />
      <form onSubmit={onSubmit} className="mt-7 grid gap-5 lg:grid-cols-2">
        <Field label="Category name">
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
        <Field label="Parent category (optional)">
          <select
            value={form.parentId}
            onChange={(event) => update("parentId", event.target.value)}
            className={inputClass}
          >
            <option value="">No parent — top level</option>
            {categories
              .filter((category) => category.id !== form.parentId)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Display order">
          <input
            required
            min="0"
            step="1"
            type="number"
            value={form.displayOrder}
            onChange={(event) => update("displayOrder", event.target.value)}
            className={inputClass}
          />
        </Field>
        <CloudinaryImageField
          label="Category image"
          kind="category"
          section={form.slug || form.name}
          publicId={form.slug}
          value={form.image}
          required
          onChange={(value) => update("image", value)}
        />
        <Field label="Description" wide>
          <textarea
            required
            minLength={10}
            rows={4}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
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
            Featured category
          </label>
        </div>
        <EditorActions working={working} editing={editing} onCancel={onCancel} label="category" />
      </form>
    </section>
  );
}

export function BrandEditor({
  form,
  editing,
  working,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: BrandForm;
  editing: boolean;
  working: boolean;
  onChange: (form: BrandForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  function update<K extends keyof BrandForm>(key: K, value: BrandForm[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <section className="border border-primary/40 bg-card p-5 sm:p-7">
      <EditorHeading
        eyebrow={editing ? "Edit brand" : "New brand"}
        title={editing ? "Update the brand." : "Add a brand."}
        copy="Keep brand identity separate from products so future assignments remain stable."
        onCancel={onCancel}
      />
      <form onSubmit={onSubmit} className="mt-7 grid gap-5 lg:grid-cols-2">
        <Field label="Brand name">
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
        <CloudinaryImageField
          label="Brand logo"
          kind="brand"
          section="brand-logos"
          publicId={form.slug}
          value={form.logo}
          onChange={(value) => update("logo", value)}
        />
        <Field label="Website (optional)">
          <input
            type="url"
            value={form.website}
            onChange={(event) => update("website", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Display order">
          <input
            required
            min="0"
            step="1"
            type="number"
            value={form.displayOrder}
            onChange={(event) => update("displayOrder", event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Description" wide>
          <textarea
            rows={4}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className={textareaClass}
          />
        </Field>
        <label className="inline-flex items-center gap-2 text-sm text-foreground lg:col-span-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => update("active", event.target.checked)}
          />
          Active in the brand directory
        </label>
        <EditorActions working={working} editing={editing} onCancel={onCancel} label="brand" />
      </form>
    </section>
  );
}

function CloudinaryImageField({
  label,
  kind,
  section,
  publicId,
  value,
  required = false,
  onChange,
}: {
  label: string;
  kind: "category" | "brand";
  section: string;
  publicId: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("kind", kind);
      payload.append("section", section);
      if (publicId.trim()) payload.append("publicId", publicId.trim());
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
      onChange(result.asset.secureUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "We could not upload the image.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-3">
        <input
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Cloudinary secure URL"
          className={`${inputClass} min-w-0 flex-1`}
        />
        <label className="inline-flex cursor-pointer items-center border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent hover:bg-accent/20">
          {uploading ? "Uploading…" : "Upload to Cloudinary"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={upload}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground">
        The uploaded image URL will be saved with this {kind} in MongoDB.
      </p>
      {error && <p className="text-xs text-primary">{error}</p>}
    </div>
  );
}

function EditorHeading({
  eyebrow,
  title,
  copy,
  onCancel,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <span className="eyebrow text-primary">{eyebrow}</span>
        <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        Back to categories & brands
      </button>
    </div>
  );
}

function EditorActions({
  working,
  editing,
  onCancel,
  label,
}: {
  working: boolean;
  editing: boolean;
  onCancel: () => void;
  label: string;
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-border pt-5 lg:col-span-2">
      <button
        type="button"
        onClick={onCancel}
        className="border border-border px-5 py-3 text-xs text-muted-foreground"
      >
        Back
      </button>
      <button
        type="submit"
        disabled={working}
        className="inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-60"
      >
        {working && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
        {editing ? "Save changes" : `Create ${label}`}
      </button>
    </div>
  );
}

function FilterBar({
  search,
  onSearch,
  filter,
  onFilter,
  filterLabel,
  options,
  onRefresh,
  loading,
  placeholder,
}: {
  search: string;
  onSearch: (value: string) => void;
  filter: string;
  onFilter: (value: string) => void;
  filterLabel: string;
  options: string[][];
  onRefresh: () => void;
  loading: boolean;
  placeholder: string;
}) {
  return (
    <section className="border border-border bg-card p-5 sm:p-7">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onRefresh();
        }}
        className="grid gap-3 lg:grid-cols-[1fr_190px_auto]"
      >
        <label className="sr-only" htmlFor={`${filterLabel}-search`}>
          Search {filterLabel.toLowerCase()}
        </label>
        <input
          id={`${filterLabel}-search`}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
        <select
          value={filter}
          onChange={(event) => onFilter(event.target.value)}
          className={inputClass}
        >
          {options.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
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
  );
}

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={`border px-2 py-1 text-[10px] ${
        active
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border bg-background text-muted-foreground"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground">
      <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> {label}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  copy,
  action,
}: {
  icon: typeof FolderTree;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-14 text-center">
      <Icon className="mx-auto h-7 w-7 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{copy}</p>
      {action}
    </div>
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
