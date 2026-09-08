import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type CatalogLinkProps = {
  slug: string;
  available: boolean;
  className?: string;
  children: ReactNode;
};

export function StorefrontProductLink({ slug, available, className, children }: CatalogLinkProps) {
  if (!available) {
    return (
      <div
        aria-disabled="true"
        title="Not available"
        className={`${className ?? ""} cursor-not-allowed opacity-75`}
      >
        {children}
      </div>
    );
  }

  return (
    <Link to="/product/$product" params={{ product: slug }} className={className}>
      {children}
    </Link>
  );
}

export function StorefrontCategoryLink({ slug, available, className, children }: CatalogLinkProps) {
  if (!available) {
    return (
      <div
        aria-disabled="true"
        title="Not available"
        className={`${className ?? ""} cursor-not-allowed opacity-75`}
      >
        {children}
      </div>
    );
  }

  return (
    <Link to="/category/$category" params={{ category: slug }} className={className}>
      {children}
    </Link>
  );
}
