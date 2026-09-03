import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowUpRight, ChevronRight, ShieldCheck } from "lucide-react";
import { getCategory, getProductsByCategory } from "@/data/catalog";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/category/$category")({
  loader: ({ params }) => {
    const category = getCategory(params.category);
    if (!category) throw notFound();
    return { category, products: getProductsByCategory(params.category) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Category not found — Motoluxe" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.category.name} — Motoluxe`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.category.blurb },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.category.blurb },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category, products } = Route.useLoaderData();

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-border">
        <img
          src={category.image}
          alt={category.name}
          width={960}
          height={720}
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,11,0.98)_0%,rgba(8,9,11,0.78)_55%,rgba(8,9,11,0.3)_100%)]" />
        <div className="absolute inset-0 grid-lines opacity-20" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1fr_300px] lg:items-end lg:py-28">
          <div>
            <nav className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/" className="transition-colors hover:text-primary">
                Home
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{category.name}</span>
            </nav>
            <span className="mt-12 block font-display text-7xl font-bold text-primary/50">
              {category.index}
            </span>
            <span className="eyebrow mt-2 block text-accent">{category.short}</span>
            <h1 className="mt-4 text-5xl font-bold sm:text-7xl">
              {category.name}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              {category.blurb}
            </p>
          </div>
          <div className="border border-white/15 bg-background/50 p-5 backdrop-blur-md">
            <div className="flex items-center gap-3 text-accent">
              <ShieldCheck className="h-5 w-5" />
              <span className="eyebrow">The Motoluxe standard</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Practical care products, clear application and support when you
              need a better answer than guesswork.
            </p>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 hazard-stripes" />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-6">
          <div>
            <span className="eyebrow text-primary">Select your essential</span>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              {products.length} product{products.length === 1 ? "" : "s"} for
              this routine
            </h2>
          </div>
          <Link
            to="/contact"
            className="group inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.2em] text-accent"
          >
            Buying for a workshop?
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
    </>
  );
}