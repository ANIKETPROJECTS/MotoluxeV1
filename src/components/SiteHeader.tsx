import { ShoppingCart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { categories } from "@/data/catalog";
import { Logo } from "./Logo";
import { CartPanel, useCart } from "./CartContext";

const linkBase =
  "shrink-0 font-display uppercase tracking-[0.16em] text-[11px] text-muted-foreground transition-colors hover:text-foreground";

export function SiteHeader() {
  const { itemCount, openCart } = useCart();

  const nav = (
    <>
      <Link
        to="/"
        className={linkBase}
        activeProps={{ className: "text-foreground" }}
        activeOptions={{ exact: true }}
      >
        Home
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          to="/category/$category"
          params={{ category: category.slug }}
          className={linkBase}
          activeProps={{ className: "text-foreground" }}
        >
          {category.name}
        </Link>
      ))}
      <Link
        to="/contact"
        className={linkBase}
        activeProps={{ className: "text-foreground" }}
      >
        Contact
      </Link>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="hazard-stripes h-1 opacity-80" />

        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-5 px-5">
          <Link to="/" className="flex shrink-0 items-center">
            <Logo size="lg" />
          </Link>

          <nav className="hidden items-center gap-6 overflow-x-auto md:flex lg:gap-8">
            {nav}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              aria-label={`Open cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
              onClick={openCart}
              className="relative grid h-10 w-10 place-items-center border border-border bg-surface text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center bg-accent font-display text-[10px] text-accent-foreground">
                {itemCount}
              </span>
            </button>
          </div>
        </div>

        <div className="border-t border-border bg-surface md:hidden">
          <nav className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-5 py-3">
            {nav}
          </nav>
        </div>
      </header>
      <CartPanel />
    </>
  );
}