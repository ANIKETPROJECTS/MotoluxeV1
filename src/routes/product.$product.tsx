import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Flame,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  ShieldCheck,
} from "lucide-react";
import {
  getCategory,
  getProduct,
  getProductsByCategory,
} from "@/data/catalog";
import { ProductCard } from "@/components/ProductCard";
import { useCart } from "@/components/CartContext";
import { useWishlist } from "@/components/WishlistContext";

export const Route = createFileRoute("/product/$product")({
  loader: ({ params }) => {
    const product = getProduct(params.product);
    if (!product) throw notFound();
    return {
      product,
      category: getCategory(product.category)!,
      related: getProductsByCategory(product.category).filter(
        (item) => item.slug !== product.slug,
      ),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Product not found — Motoluxe" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { product } = loaderData;
    const title = `${product.name} — Motoluxe`;
    const desc = `${product.tagline} ${product.description}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, category, related } = Route.useLoaderData();
  const { addToCart, removeFromCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const wishlisted = isWishlisted(product.slug);
  const frames = ["center", "top", "bottom"];

  function decreaseQuantity() {
    if (qty === 1) {
      removeFromCart(product.slug);
      setAdded(false);
    }
    setQty((value) => Math.max(0, value - 1));
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:py-14">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-primary">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          to="/category/$category"
          params={{ category: category.slug }}
          className="transition-colors hover:text-primary"
        >
          {category.name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-10 grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div>
          <div className="relative overflow-hidden border border-border bg-card">
            <img
              src={product.image}
              alt={product.name}
              width={640}
              height={800}
              className="aspect-4/5 w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
            />
            <div className="pointer-events-none absolute inset-0 bg-linear-to-tr from-black/30 via-transparent to-white/10" />
            <span className="slash-tag absolute left-0 top-5 bg-primary px-3.5 py-1.5 pr-6 font-display text-[11px] uppercase tracking-[0.24em] text-primary-foreground">
              {product.badge ?? "Motoluxe original"}
            </span>
            <span className="absolute bottom-5 right-5 flex items-center gap-2 bg-background/80 px-3 py-2 font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Workshop tested care
            </span>
            <button
              type="button"
              aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              aria-pressed={wishlisted}
              onClick={() => toggleWishlist(product)}
              className={`absolute right-5 top-5 grid h-11 w-11 place-items-center border backdrop-blur transition-colors ${
                wishlisted
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-white/20 bg-background/80 text-foreground hover:border-primary hover:text-primary"
              }`}
            >
              <Heart className={`h-5 w-5 ${wishlisted ? "fill-current" : ""}`} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {frames.map((position) => (
              <div
                key={position}
                className="overflow-hidden border border-border bg-card opacity-65 transition-all hover:border-primary hover:opacity-100"
              >
                <img
                  src={product.image}
                  alt={`${product.name} detail`}
                  loading="lazy"
                  width={640}
                  height={800}
                  className="aspect-square w-full object-cover transition-transform duration-500 hover:scale-110"
                  style={{ objectPosition: `center ${position}` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <span className="eyebrow text-primary">{category.name}</span>
          <h1 className="mt-4 max-w-2xl text-5xl font-bold sm:text-7xl">
            {product.name}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {product.tagline}
          </p>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-5 border-y border-border py-6">
            <div>
              <span className="block font-display text-4xl font-bold uppercase">
                {product.price}
              </span>
              <span className="mt-2 block text-xs text-muted-foreground">
                Select your quantity and continue to place your order.
              </span>
            </div>
            <span className="eyebrow text-muted-foreground">{product.size}</span>
          </div>

          <div className="mt-8 flex flex-wrap items-stretch gap-3">
            <div className="flex items-center border border-border bg-surface">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={decreaseQuantity}
                disabled={qty === 0}
                className="grid h-full w-11 place-items-center transition-colors hover:bg-surface-raised"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-display text-lg">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((value) => value + 1)}
                className="grid h-full w-11 place-items-center transition-colors hover:bg-surface-raised"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              disabled={qty === 0}
              onClick={() => {
                addToCart(product, qty);
                setAdded(true);
              }}
              className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 px-7 py-4 font-display text-sm uppercase tracking-[0.2em] transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none ${
                added
                  ? "bg-accent text-accent-foreground"
                  : "bg-primary text-primary-foreground hover:shadow-[0_16px_40px_-16px_rgba(230,30,35,0.95)]"
              }`}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" /> Added to cart
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" /> Add to cart
                </>
              )}
            </button>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-accent" />
            Frontend preview — checkout and payment are not wired up.
          </p>

          <div className="mt-10 grid gap-px border border-border bg-border sm:grid-cols-2">
            <div className="bg-card p-5">
              <span className="eyebrow text-primary">Best for</span>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Riders, detailers and workshops building a dependable care
                routine.
              </p>
            </div>
            <div className="bg-card p-5">
              <span className="eyebrow text-primary">Need support?</span>
              <Link
                to="/contact"
                className="group mt-3 inline-flex items-center gap-2 text-sm text-foreground"
              >
                Speak with Motoluxe
                <ArrowUpRight className="h-3.5 w-3.5 text-primary transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="mt-6 border border-border bg-card p-7">
            <h2 className="text-xl font-semibold">Why it belongs in your kit</h2>
            <ul className="mt-5 space-y-3">
              {product.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center bg-primary/15 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="leading-snug text-foreground/90">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 border border-border bg-card p-7">
            <h2 className="text-xl font-semibold">How to use</h2>
            <ol className="mt-5 space-y-4">
              {product.usage.map((step, index) => (
                <li key={step} className="flex gap-4 text-sm">
                  <span className="grid h-7 w-7 shrink-0 place-items-center border border-primary/40 font-display text-sm text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed text-muted-foreground">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24 border-t border-border pt-14">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <span className="eyebrow text-primary">Complete the routine</span>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                More from {category.name}
              </h2>
            </div>
            <Link
              to="/category/$category"
              params={{ category: category.slug }}
              className="inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.2em] text-accent"
            >
              View category <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}