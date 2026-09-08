import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";
import { categories } from "@/data/catalog";
import { Logo } from "./Logo";
import { useStorefrontCatalog } from "./StorefrontCatalogContext";
import { StorefrontCategoryLink } from "./StorefrontCatalogLink";

export function SiteFooter() {
  const { filterCategories, isCategoryPublished } = useStorefrontCatalog();

  return (
    <footer className="relative mt-8 border-t border-border bg-surface">
      <div className="h-1.5 hazard-stripes opacity-70" />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo size="lg" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Premium autocare and bike care formulations, engineered to German specification and
            blended for Indian roads, dust and monsoon.
          </p>
          <div className="mt-6 flex gap-2">
            <span className="slash-tag bg-primary px-3 py-1 pr-5 font-display text-[11px] uppercase tracking-[0.2em] text-primary-foreground">
              ISO 9001
            </span>
            <span className="slash-tag bg-accent px-3 py-1 pr-5 font-display text-[11px] uppercase tracking-[0.2em] text-accent-foreground">
              German Formulated
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold tracking-[0.2em]">Range</h4>
          <ul className="mt-4 space-y-2.5">
            {filterCategories(categories).map((c) => (
              <li key={c.slug}>
                <StorefrontCategoryLink
                  slug={c.slug}
                  available={isCategoryPublished(c.slug)}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {c.name}
                </StorefrontCategoryLink>
              </li>
            ))}
            <li>
              <Link
                to="/contact"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Contact Us
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold tracking-[0.2em]">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              care@motoluxe.in
            </li>
            <li className="flex gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              +91 98200 44120
            </li>
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Unit 14, MIDC Industrial Estate, Pune 411019
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Motoluxe Autocare.</span>
          <span className="eyebrow">Built for high performance</span>
        </div>
      </div>
    </footer>
  );
}
