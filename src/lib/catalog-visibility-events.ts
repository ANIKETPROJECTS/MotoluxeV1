export const CATALOG_VISIBILITY_EVENT = "motoluxe:catalog-visibility-updated";
export const CATALOG_VISIBILITY_STORAGE_KEY = "motoluxe-catalog-visibility-updated";

export function announceCatalogVisibilityChanged() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(CATALOG_VISIBILITY_EVENT));
  window.localStorage.setItem(CATALOG_VISIBILITY_STORAGE_KEY, String(Date.now()));
}
