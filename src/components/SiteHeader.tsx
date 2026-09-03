import { ChevronDown, Heart, ShoppingCart, X } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { categories, getProductsByCategory, type CategorySlug } from "@/data/catalog";
import { Logo } from "./Logo";
import { CartPanel, useCart } from "./CartContext";
import { AccountIcon, useCustomerAuth } from "./CustomerAuthContext";
import { useWishlist } from "./WishlistContext";

const linkBase =
  "shrink-0 font-display uppercase tracking-[0.16em] text-[11px] text-muted-foreground transition-colors hover:text-foreground";

function CategoriesMenu() {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategorySlug | null>(null);

  return (
    <div
      className="relative flex h-full items-center"
      onMouseEnter={() => {
        setOpen(true);
        setActiveCategory((current) => current ?? "chain-care");
      }}
      onMouseLeave={() => {
        setOpen(false);
        setActiveCategory(null);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setActiveCategory(null);
        }
      }}
    >
      <Link
        to="/categories"
        className={`${linkBase} inline-flex items-center gap-1 py-6`}
        aria-expanded={open}
        aria-haspopup="true"
        onFocus={() => {
          setOpen(true);
          setActiveCategory((current) => current ?? "chain-care");
        }}
      >
        Categories
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </Link>

      <div
        className={`absolute left-2 top-full z-50 w-[min(35rem,calc(100vw-2rem))] border border-border bg-surface/95 p-2 shadow-2xl backdrop-blur-xl transition-all duration-200 ${
          open
            ? "pointer-events-auto visible translate-y-0 opacity-100"
            : "invisible pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <div className="mb-3 border-b border-border pb-3">
          <span className="eyebrow text-accent">Browse the product tree</span>
          <p className="mt-1.5 font-display text-lg uppercase tracking-[0.08em] text-foreground">
            Categories
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="grid gap-1 sm:w-44 sm:shrink-0">
            {categories.map((category) => {
              const isActive = activeCategory === category.slug;

              return (
                <Link
                  key={category.slug}
                  to="/category/$category"
                  params={{ category: category.slug }}
                  onMouseEnter={() => setActiveCategory(category.slug)}
                  onFocus={() => setActiveCategory(category.slug)}
                  onClick={() => {
                    setOpen(false);
                    setActiveCategory(null);
                  }}
                  className={`group/category flex items-center justify-between border border-transparent px-2.5 py-2.5 font-display text-xs uppercase tracking-[0.1em] transition-colors ${
                    isActive
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "text-foreground hover:border-border hover:bg-background"
                  }`}
                >
                  <span>
                    <span className="mr-2 text-accent">{category.index}</span>
                    {category.name}
                  </span>
                  <ChevronDown className="h-3 w-3 -rotate-90 transition-transform group-hover/category:translate-x-1" />
                </Link>
              );
            })}
          </div>

          <div className="min-h-36 flex-1 border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            {activeCategory ? (
              (() => {
                const category = categories.find((item) => item.slug === activeCategory);
                if (!category) return null;

                return (
                  <>
                    <Link
                      to="/category/$category"
                      params={{ category: category.slug }}
                      onClick={() => {
                        setOpen(false);
                        setActiveCategory(null);
                      }}
                      className="group/category flex items-center justify-between border-b border-border pb-2 font-display text-xs uppercase tracking-[0.12em] text-foreground transition-colors hover:text-primary"
                    >
                      <span>
                        <span className="mr-2 text-accent">{category.index}</span>
                        {category.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground transition-colors group-hover/category:text-primary">
                        View all
                      </span>
                    </Link>
                    <div className="mt-2 grid gap-1">
                      {getProductsByCategory(category.slug).map((product) => (
                        <Link
                          key={product.slug}
                          to="/product/$product"
                          params={{ product: product.slug }}
                          onClick={() => {
                            setOpen(false);
                            setActiveCategory(null);
                          }}
                          className="border border-transparent px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-background hover:text-foreground"
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
                  </>
                );
              })()
            ) : (
              <p className="text-xs text-muted-foreground">Hover a category to browse products.</p>
            )}
          </div>
        </div>

        <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
          Hover a category for its products, or click a category to view the full collection.
        </p>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { itemCount, openCart } = useCart();
  const { customer, authenticated, openAuth } = useCustomerAuth();
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
      <Link to="/about" className={linkBase} activeProps={{ className: "text-foreground" }}>
        About Us
      </Link>
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
            {authenticated ? (
              <Link
                to="/profile"
                aria-label="Open your profile"
                className="flex items-center gap-2 border border-border bg-surface px-2 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:text-primary sm:px-3"
              >
                <AccountIcon />
                <span className="hidden max-w-[7rem] truncate sm:block">
                  {customer?.name ?? "Profile"}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                aria-label="Sign in"
                onClick={() => openAuth()}
                className="flex items-center gap-2 border border-border bg-surface px-2 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:text-primary sm:px-3"
              >
                <AccountIcon />
                <span className="hidden sm:block">Sign in</span>
              </button>
            )}
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
