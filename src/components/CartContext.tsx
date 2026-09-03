import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/catalog";

type CartLine = {
  product: Product;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  isOpen: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  removeFromCart: (slug: string) => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: lines.reduce((count, line) => count + line.quantity, 0),
      isOpen,
      addToCart: (product, quantity = 1) => {
        setLines((currentLines) => {
          const existingLine = currentLines.find(
            (line) => line.product.slug === product.slug,
          );
          if (!existingLine) {
            return [...currentLines, { product, quantity }];
          }
          return currentLines.map((line) =>
            line.product.slug === product.slug
              ? { ...line, quantity: line.quantity + quantity }
              : line,
          );
        });
        setIsOpen(true);
      },
      updateQuantity: (slug, quantity) => {
        setLines((currentLines) =>
          currentLines.map((line) =>
            line.product.slug === slug
              ? { ...line, quantity: Math.max(1, quantity) }
              : line,
          ),
        );
      },
      removeFromCart: (slug) => {
        setLines((currentLines) =>
          currentLines.filter((line) => line.product.slug !== slug),
        );
      },
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }),
    [isOpen, lines],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}

export function CartPanel() {
  const {
    lines,
    itemCount,
    isOpen,
    updateQuantity,
    removeFromCart,
    closeCart,
  } = useCart();

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close cart"
          onClick={closeCart}
          className="fixed inset-0 z-[60] cursor-default bg-black/70 backdrop-blur-[2px]"
        />
      )}
      <aside
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
        className={`fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="hazard-stripes h-1 shrink-0" />
        <header className="flex items-center justify-between border-b border-border px-5 py-5">
          <div>
            <span className="eyebrow text-primary">Your selection</span>
            <h2 className="mt-2 text-2xl font-semibold">Cart</h2>
          </div>
          <button
            type="button"
            aria-label="Close cart"
            onClick={closeCart}
            className="grid h-10 w-10 place-items-center border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {lines.length === 0 ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
              <div className="grid h-16 w-16 place-items-center border border-primary/30 bg-primary/10 text-primary">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold">Your cart is empty</h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Add a Motoluxe essential from any product page and it will
                appear here.
              </p>
              <Link
                to="/category/$category"
                params={{ category: "chain-care" }}
                onClick={closeCart}
                className="mt-7 inline-flex items-center gap-2 bg-primary px-5 py-3 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground"
              >
                Browse products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {lines.map((line) => (
                <div
                  key={line.product.slug}
                  className="border border-border bg-card p-3"
                >
                  <div className="flex gap-3">
                    <img
                      src={line.product.image}
                      alt={line.product.name}
                      width={80}
                      height={96}
                      className="h-24 w-20 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="eyebrow text-primary">
                            Motoluxe
                          </span>
                          <h3 className="mt-1 text-lg font-semibold">
                            {line.product.name}
                          </h3>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${line.product.name}`}
                          onClick={() => removeFromCart(line.product.slug)}
                          className="text-muted-foreground transition-colors hover:text-primary"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center border border-border bg-surface">
                          <button
                            type="button"
                            aria-label={`Decrease ${line.product.name} quantity`}
                            onClick={() =>
                              updateQuantity(
                                line.product.slug,
                                line.quantity - 1,
                              )
                            }
                            className="grid h-8 w-8 place-items-center transition-colors hover:bg-surface-raised"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center font-display text-sm">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase ${line.product.name} quantity`}
                            onClick={() =>
                              updateQuantity(
                                line.product.slug,
                                line.quantity + 1,
                              )
                            }
                            className="grid h-8 w-8 place-items-center transition-colors hover:bg-surface-raised"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="font-display text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          {line.product.price}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {lines.length > 0 && (
          <footer className="border-t border-border bg-surface px-5 py-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-muted-foreground">
                {itemCount} item{itemCount === 1 ? "" : "s"} selected
              </span>
              <span className="font-display text-sm uppercase tracking-[0.12em] text-accent">
                Price on enquiry
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Send this selection to Motoluxe for current availability and
              dealer pricing.
            </p>
            <Link
              to="/contact"
              onClick={closeCart}
              className="group mt-5 flex items-center justify-center gap-2 bg-primary px-5 py-4 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground"
            >
              Continue to enquiry
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </footer>
        )}
      </aside>
    </>
  );
}