import { ArrowUpRight, ShoppingCart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { categories } from "@/data/catalog";
import { Logo } from "./Logo";

const linkBase =
  "shrink-0 font-display uppercase tracking-[0.16em] text-[11px] text-muted-foreground transition-colors hover:text-foreground";

export function SiteHeader() {
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
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="hazard-stripes h-1 opacity-80" />
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2 font-display text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="hidden sm:inline">
            Official Motoluxe care partner
          </span>
          <span className="text-accent">Dealer &amp; bulk enquiries open</span>
          <Link
            to="/contact"
            className="hidden items-center gap-1 text-foreground transition-colors hover:text-primary sm:flex"
          >
            Talk to the team <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-5 px-5">
        <Link to="/" className="flex shrink-0 items-center">
          <Logo size="lg" />
        </Link>

        <nav className="hidden items-center gap-6 overflow-x-auto md:flex lg:gap-8">
          {nav}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            to="/contact"
            className="hidden items-center gap-2 border border-border px-3 py-2 font-display text-[10px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:border-primary hover:text-primary lg:flex"
          >
            Get a quote
            <ArrowUpRight className="h-3 w-3" />
          </Link>
          <button
            type="button"
            aria-label="Cart — available after enquiry"
            className="relative grid h-10 w-10 place-items-center border border-border bg-surface text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center bg-accent font-display text-[10px] text-accent-foreground">
              0
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
  );
}