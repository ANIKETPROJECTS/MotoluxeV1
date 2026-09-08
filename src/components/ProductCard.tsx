import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/catalog";
import { getCategory } from "@/data/catalog";
import { useStorefrontInventory } from "./StorefrontInventoryContext";

export function ProductCard({ product }: { product: Product }) {
  const category = getCategory(product.category);
  const { getStock } = useStorefrontInventory();
  const stock = getStock(product.slug);
  const outOfStock = stock === 0;

  return (
    <Link
      to="/product/$product"
      params={{ product: product.slug }}
      className="group relative flex h-full flex-col overflow-hidden border border-border bg-card transition-all duration-500 hover:-translate-y-1 hover:border-primary hover:shadow-[0_20px_55px_-28px_rgba(230,30,35,0.9)]"
    >
      <div className="relative overflow-hidden bg-background">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-4">
          <span className="slash-tag bg-primary px-3 py-1 pr-5 font-display text-[10px] uppercase tracking-[0.18em] text-primary-foreground">
            {product.badge ?? "Motoluxe original"}
          </span>
          <span className="bg-background/80 px-2 py-1 font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
            {category?.name}
          </span>
        </div>
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={640}
          height={800}
          className="aspect-4/5 w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-white/5 opacity-70" />
        {outOfStock && (
          <span className="absolute bottom-14 right-4 z-10 bg-primary px-3 py-2 font-display text-[10px] uppercase tracking-[0.16em] text-primary-foreground shadow-lg">
            Out of stock
          </span>
        )}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-white/80">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          Workshop tested care
        </div>
        <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between bg-primary px-4 py-3 font-display text-xs uppercase tracking-[0.22em] text-primary-foreground transition-transform duration-300 group-hover:translate-y-0">
          View product
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-1 flex-col border-t border-border p-5">
        <h3 className="text-xl font-semibold">{product.name}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {product.tagline}
        </p>
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4">
          <div>
            <span className="block font-display text-lg uppercase tracking-[0.04em] text-foreground">
              {product.price}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {outOfStock ? "Currently unavailable" : "Dealer &amp; bulk orders welcome"}
            </span>
          </div>
          <span className="eyebrow text-muted-foreground">{product.size}</span>
        </div>
      </div>
    </Link>
  );
}
