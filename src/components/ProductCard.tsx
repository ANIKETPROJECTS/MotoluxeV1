import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/catalog";
import { getCategory } from "@/data/catalog";
import { useStorefrontInventory } from "./StorefrontInventoryContext";
import { useStorefrontCatalog } from "./StorefrontCatalogContext";

export function ProductCard({ product }: { product: Product }) {
  const category = getCategory(product.category);
  const { getStock } = useStorefrontInventory();
  const { isProductPublished } = useStorefrontCatalog();
  const stock = getStock(product.slug);
  const outOfStock = stock === 0;
  const unavailable = !isProductPublished(product.slug);
  const cardContent = (
    <>
      <div className="product-card-image relative overflow-hidden border-b border-border">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3 sm:p-4">
          <span className="slash-tag bg-primary px-3 py-1 pr-5 font-display text-[10px] uppercase tracking-[0.14em] text-primary-foreground">
            {product.badge ?? "Motoluxe original"}
          </span>
          {stock !== undefined && stock > 0 && stock <= 5 ? (
            <span className="bg-card/90 px-2 py-1 font-display text-[10px] uppercase tracking-[0.1em] text-primary backdrop-blur">
              {stock} left
            </span>
          ) : null}
        </div>
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={640}
          height={800}
          className="aspect-[1/1.08] w-full object-contain p-5 transition-transform duration-500 group-hover:scale-[1.045] sm:p-7"
        />
        {(outOfStock || unavailable) && (
          <span className="absolute bottom-3 right-3 z-10 bg-foreground px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-background">
            {unavailable ? "Not available" : "Out of stock"}
          </span>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-card/85 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground backdrop-blur">
          <ShieldCheck className="h-3 w-3 text-primary" />
          Purpose-built care
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <span className="eyebrow text-muted-foreground">{category?.name}</span>
        <h3 className="mt-2 text-xl font-semibold leading-tight">{product.name}</h3>
        <p className="mt-2 min-h-10 flex-1 text-sm leading-relaxed text-muted-foreground">
          {product.tagline}
        </p>
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4">
          <div>
            <span className="block font-display text-2xl uppercase tracking-[0.02em] text-foreground">
              {product.price}
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {unavailable
                ? "Currently unavailable"
                : outOfStock
                  ? "Currently unavailable"
                  : "Dealer & bulk orders welcome"}
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 font-display text-[10px] uppercase tracking-[0.1em] text-primary transition-transform group-hover:translate-x-0.5">
            {unavailable ? "Unavailable" : "View"}
            {!unavailable && <ArrowUpRight className="h-3.5 w-3.5" />}
          </span>
        </div>
        <span className="mt-3 border-t border-border pt-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {product.size}
        </span>
      </div>
    </>
  );

  return unavailable ? (
    <div
      aria-disabled="true"
      className="group relative flex h-full flex-col overflow-hidden border border-border bg-card opacity-75"
    >
      {cardContent}
    </div>
  ) : (
    <Link
      to="/product/$product"
      params={{ product: product.slug }}
      className="focus-ring group relative flex h-full flex-col overflow-hidden border border-border bg-card transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-[0_18px_38px_-28px_var(--primary)]"
    >
      {cardContent}
    </Link>
  );
}
