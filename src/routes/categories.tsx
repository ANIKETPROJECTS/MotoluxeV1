import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, ShieldCheck } from "lucide-react";
import { categories, getProductsByCategory } from "@/data/catalog";
import { ProductCard } from "@/components/ProductCard";
import { StorefrontCategoryLink } from "@/components/StorefrontCatalogLink";
import { useStorefrontCatalog } from "@/components/StorefrontCatalogContext";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories — Motoluxe Autocare" },
      {
        name: "description",
        content: "Explore Motoluxe categories for chain care, garage protection and interior care.",
      },
      { property: "og:title", content: "Categories — Motoluxe Autocare" },
      {
        property: "og:description",
        content: "Find the right Motoluxe care routine for every machine and surface.",
      },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { filterCategories, filterProducts, isCategoryPublished } = useStorefrontCatalog();
  const visibleCategories = filterCategories(categories);

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-lines opacity-20" />
        <div className="absolute right-0 top-0 h-full w-2/3 bg-linear-to-bl from-primary/15 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:py-28">
          <nav className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-primary">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Categories</span>
          </nav>
          <div className="mt-16 max-w-3xl">
            <span className="eyebrow flex items-center gap-3 text-primary">
              <span className="h-px w-8 bg-primary" />
              Browse the Motoluxe range
            </span>
            <h1 className="mt-5 text-6xl font-bold sm:text-8xl">
              Every job.
              <span className="block text-primary">A clearer start.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Start with the surface, space or routine in front of you. Each Motoluxe category
              brings together focused products, practical guidance and a better way to keep moving.
            </p>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 hazard-stripes" />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
          <div>
            <span className="eyebrow text-accent">Choose your routine</span>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Care, organised by need.</h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Explore the overview, then open a collection to see every related product in one place.
          </p>
        </div>

        <div className="mt-10 grid gap-px border border-border bg-border lg:grid-cols-3">
          {visibleCategories.map((category) => {
            const categoryProducts = filterProducts(getProductsByCategory(category.slug));
            const categoryAvailable = isCategoryPublished(category.slug);

            return (
              <article key={category.slug} className="group flex flex-col bg-card">
                <StorefrontCategoryLink
                  slug={category.slug}
                  available={categoryAvailable}
                  className="relative block overflow-hidden"
                >
                  <img
                    src={category.image}
                    alt={category.name}
                    width={960}
                    height={720}
                    className="aspect-[1.25] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />
                  <span className="absolute bottom-5 left-5 font-display text-6xl font-bold text-primary">
                    {category.index}
                  </span>
                  <ArrowUpRight className="absolute bottom-5 right-5 h-5 w-5 text-white transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </StorefrontCategoryLink>
                <div className="flex flex-1 flex-col p-6">
                  <span className="eyebrow text-accent">{category.short}</span>
                  <h3 className="mt-3 text-2xl font-semibold">{category.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {category.blurb}
                  </p>
                  <div className="mt-6 border-t border-border pt-5">
                    <span className="eyebrow text-muted-foreground">Inside this category</span>
                    <ul className="mt-3 space-y-2.5">
                      {category.details.map((detail) => (
                        <li
                          key={detail}
                          className="flex gap-2 text-xs leading-relaxed text-foreground/80"
                        >
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-7 flex items-center justify-between border-t border-border pt-4">
                    <span className="font-display text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                      {categoryProducts.length} related product
                      {categoryProducts.length === 1 ? "" : "s"}
                    </span>
                    <StorefrontCategoryLink
                      slug={category.slug}
                      available={categoryAvailable}
                      className="group/link inline-flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.16em] text-primary"
                    >
                      View collection
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-1" />
                    </StorefrontCategoryLink>
                  </div>
                </div>
              </article>
            );
          })}
          {visibleCategories.length === 0 && (
            <div className="bg-card px-6 py-12 text-center lg:col-span-3">
              <p className="font-display text-sm uppercase tracking-[0.18em] text-primary">
                No categories are currently published
              </p>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Motoluxe is preparing the next public care collections. Please check back soon.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="eyebrow text-primary">Related products</span>
              <h2 className="mt-3 text-4xl font-bold sm:text-5xl">The full care edit.</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Go deeper into each category and find the product built for the job you need to do
                next.
              </p>
            </div>
            <div className="flex items-center gap-3 text-accent">
              <ShieldCheck className="h-5 w-5" />
              <span className="eyebrow">Purpose-built essentials</span>
            </div>
          </div>

          <div className="mt-12 space-y-16">
            {visibleCategories.map((category) => {
              const categoryAvailable = isCategoryPublished(category.slug);

              return (
                <div key={category.slug} className="border-t border-border pt-6">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-2xl font-bold text-primary/70">
                        {category.index}
                      </span>
                      <h3 className="text-2xl font-semibold">{category.name}</h3>
                    </div>
                    <StorefrontCategoryLink
                      slug={category.slug}
                      available={categoryAvailable}
                      className="group inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.18em] text-accent"
                    >
                      Open category
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </StorefrontCategoryLink>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filterProducts(getProductsByCategory(category.slug)).map((product) => (
                      <ProductCard key={product.slug} product={product} />
                    ))}
                  </div>
                </div>
              );
            })}
            {visibleCategories.length === 0 && (
              <div className="border-t border-border pt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Product collections will appear here when they are published.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-20" />
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-8 px-5 py-20 lg:py-24">
          <div>
            <span className="eyebrow text-accent">Need a better answer?</span>
            <h2 className="mt-4 max-w-2xl text-4xl font-bold sm:text-6xl">
              Start with the job in front of you.
            </h2>
          </div>
          <Link
            to="/contact"
            className="group inline-flex items-center gap-2 border-b border-primary pb-2 font-display text-xs uppercase tracking-[0.2em] text-primary transition-colors hover:text-accent"
          >
            Talk to Motoluxe
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  );
}
