import { ChevronDown, Heart, LogOut, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { categories, getProductsByCategory } from "@/data/catalog";
import { Logo } from "./Logo";
import { CartPanel, useCart } from "./CartContext";
import { AccountIcon, useCustomerAuth } from "./CustomerAuthContext";
import { useWishlist } from "./WishlistContext";

const linkBase =
  "shrink-0 font-display uppercase tracking-[0.16em] text-[11px] text-muted-foreground transition-colors hover:text-foreground";

function CategoriesMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative flex h-full items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={`${linkBase} inline-flex items-center gap-1 py-6`}
        aria-expanded={open}
        aria-haspopup="true"
        onFocus={() => setOpen(true)}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        Categories
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`absolute left-1/2 top-full z-50 w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-xl transition-all duration-200 ${
          open
            ? "pointer-events-auto visible translate-y-0 opacity-100"
            : "invisible pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <div className="mb-4 border-b border-border pb-3">
          <span className="eyebrow text-accent">Browse the product tree</span>
          <p className="mt-1.5 font-display text-xl uppercase tracking-[0.08em] text-foreground">
            Care essentials by routine
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {categories.map((category) => {
            const categoryProducts = getProductsByCategory(category.slug);

            return (
              <section key={category.slug}>
                <Link
                  to="/category/$category"
                  params={{ category: category.slug }}
                  className="group/category flex items-center justify-between border-b border-border pb-1.5 font-display text-xs uppercase tracking-[0.12em] text-foreground transition-colors hover:text-primary"
                  onClick={() => setOpen(false)}
                >
                  <span>
                    <span className="mr-2 text-accent">{category.index}</span>
                    {category.name}
                  </span>
                  <ChevronDown className="h-3 w-3 -rotate-90 transition-transform group-hover/category:translate-x-1" />
                </Link>
                <div className="mt-1.5 grid gap-0.5">
                  {categoryProducts.map((product) => (
                    <Link
                      key={product.slug}
                      to="/product/$product"
                      params={{ product: product.slug }}
                      className="border border-transparent px-1.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-background hover:text-foreground"
                      onClick={() => setOpen(false)}
                    >
                      <span className="block font-display uppercase tracking-[0.08em]">
                        {product.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug">
                        {product.tagline}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
          Select a category to view all products, or choose an individual product to see its
          details.
        </p>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { itemCount, openCart } = useCart();
  const { customer, authenticated, openAuth, logout } = useCustomerAuth();
  const { wishlist, wishlistCount, removeFromWishlist } = useWishlist();
  const [wishlistOpen, setWishlistOpen] = useState(false);

  const nav = () => (
    <>
      <Link
        to="/"
        className={linkBase}
        activeProps={{ className: "text-foreground" }}
        activeOptions={{ exact: true }}
      >
        Home
      </Link>
      <CategoriesMenu />
      <Link to="/contact" className={linkBase} activeProps={{ className: "text-foreground" }}>
        Contact Us
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

          <nav className="hidden h-full items-center gap-8 whitespace-nowrap md:flex">{nav()}</nav>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              aria-label={authenticated ? "Sign out" : "Sign in"}
              onClick={() => (authenticated ? void logout() : openAuth())}
              className="hidden items-center gap-2 border border-border bg-surface px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:text-primary sm:flex"
            >
              {authenticated ? <LogOut className="h-3.5 w-3.5" /> : <AccountIcon />}
              <span className="max-w-[7rem] truncate">
                {authenticated ? (customer?.name ?? "Account") : "Sign in"}
              </span>
            </button>
            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setWishlistOpen(false);
                }
              }}
            >
              <button
                type="button"
                aria-label={`Open wishlist, ${wishlistCount} item${wishlistCount === 1 ? "" : "s"}`}
                aria-expanded={wishlistOpen}
                onClick={() => setWishlistOpen((isOpen) => !isOpen)}
                className={`relative grid h-10 w-10 place-items-center border bg-surface text-foreground transition-colors hover:border-primary hover:text-primary ${
                  wishlistOpen ? "border-primary text-primary" : "border-border"
                }`}
              >
                <Heart className={`h-4 w-4 ${wishlistCount > 0 ? "fill-current" : ""}`} />
                <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center bg-accent font-display text-[10px] text-accent-foreground">
                  {wishlistCount}
                </span>
              </button>

              {wishlistOpen && (
                <div className="absolute right-0 top-full z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <span className="eyebrow text-accent">Saved for later</span>
                      <p className="mt-1 font-display text-lg uppercase tracking-[0.08em]">
                        Your wishlist
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close wishlist"
                      onClick={() => setWishlistOpen(false)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {wishlist.length > 0 ? (
                    <div className="grid gap-1">
                      {wishlist.map((product) => (
                        <div
                          key={product.slug}
                          className="flex items-center gap-3 border border-transparent p-2 hover:border-border hover:bg-background"
                        >
                          <Link
                            to="/product/$product"
                            params={{ product: product.slug }}
                            onClick={() => setWishlistOpen(false)}
                            className="flex min-w-0 flex-1 items-center gap-3"
                          >
                            <img
                              src={product.image}
                              alt=""
                              width={44}
                              height={44}
                              className="h-11 w-11 shrink-0 object-cover"
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-display text-sm uppercase tracking-[0.08em]">
                                {product.name}
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {product.tagline}
                              </span>
                            </span>
                          </Link>
                          <button
                            type="button"
                            aria-label={`Remove ${product.name} from wishlist`}
                            onClick={() => removeFromWishlist(product.slug)}
                            className="shrink-0 p-1 text-muted-foreground transition-colors hover:text-primary"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-5 text-sm leading-relaxed text-muted-foreground">
                      Your wishlist is empty. Tap the heart on any product to save it here.
                    </p>
                  )}
                </div>
              )}
            </div>
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
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
            {nav()}
          </nav>
        </div>
      </header>
      <CartPanel />
    </>
  );
}
