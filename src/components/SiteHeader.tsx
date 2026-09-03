import { ChevronDown, LogOut, ShoppingCart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { categories, getProductsByCategory, type Category } from "@/data/catalog";
import { Logo } from "./Logo";
import { CartPanel, useCart } from "./CartContext";
import { AccountIcon, useCustomerAuth } from "./CustomerAuthContext";

const linkBase =
  "shrink-0 font-display uppercase tracking-[0.16em] text-[11px] text-muted-foreground transition-colors hover:text-foreground";

function CategoriesMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="group relative flex h-full items-center"
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
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        Categories
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : "group-hover:rotate-180"}`}
        />
      </button>

      <div
        className={`absolute left-1/2 top-full z-50 w-[min(52rem,calc(100vw-2rem))] -translate-x-1/2 border border-border bg-surface/95 p-5 shadow-2xl backdrop-blur-xl transition-all duration-200 ${
          open
            ? "pointer-events-auto visible translate-y-0 opacity-100"
            : "invisible pointer-events-none translate-y-2 opacity-0 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
        }`}
      >
        <div className="mb-5 border-b border-border pb-4">
          <span className="eyebrow text-accent">Browse the product tree</span>
          <p className="mt-2 font-display text-2xl uppercase tracking-[0.08em] text-foreground">
            Care essentials by routine
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {categories.map((category) => {
            const categoryProducts = getProductsByCategory(category.slug);

            return (
              <section key={category.slug}>
                <Link
                  to="/category/$category"
                  params={{ category: category.slug }}
                  className="group/category flex items-center justify-between border-b border-border pb-2 font-display text-sm uppercase tracking-[0.12em] text-foreground transition-colors hover:text-primary"
                  onClick={() => setOpen(false)}
                >
                  <span>
                    <span className="mr-2 text-accent">{category.index}</span>
                    {category.name}
                  </span>
                  <ChevronDown className="h-3 w-3 -rotate-90 transition-transform group-hover/category:translate-x-1" />
                </Link>
                <div className="mt-2 grid gap-1">
                  {categoryProducts.map((product) => (
                    <Link
                      key={product.slug}
                      to="/product/$product"
                      params={{ product: product.slug }}
                      className="border border-transparent px-2 py-2 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-background hover:text-foreground"
                      onClick={() => setOpen(false)}
                    >
                      <span className="block font-display uppercase tracking-[0.08em]">
                        {product.name}
                      </span>
                      <span className="mt-1 block text-xs leading-snug">{product.tagline}</span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
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

  const desktopNav = (
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
        <CategoryMenu key={category.slug} category={category} />
      ))}
      <Link to="/contact" className={linkBase} activeProps={{ className: "text-foreground" }}>
        Contact
      </Link>
    </>
  );

  const mobileNav = (
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
      <Link to="/contact" className={linkBase} activeProps={{ className: "text-foreground" }}>
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

          <nav className="hidden h-full items-center gap-6 overflow-x-auto md:flex lg:gap-8">
            {desktopNav}
          </nav>

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
            {mobileNav}
          </nav>
        </div>
      </header>
      <CartPanel />
    </>
  );
}
