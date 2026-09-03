import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";

export const Route = createFileRoute("/admin/media")({
  head: () => ({
    meta: [
      { title: "Media Library — Motoluxe Admin" },
      {
        name: "description",
        content: "Manage Motoluxe product and catalog images stored in Cloudinary.",
      },
    ],
  }),
  component: AdminMediaPage,
});

type MediaKind = "product" | "category" | "brand" | "review";

type MediaAsset = {
  id: string;
  secureUrl: string;
  publicId: string;
  assetId: string;
  folder: string;
  kind: MediaKind;
  section: string;
  originalName: string;
  mimeType: string;
  bytes: number;
  createdAt: string;
};

const kinds: Array<{ value: "" | MediaKind; label: string }> = [
  { value: "", label: "All media" },
  { value: "product", label: "Products" },
  { value: "category", label: "Categories" },
  { value: "brand", label: "Brands" },
  { value: "review", label: "Reviews" },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function AdminMediaPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"" | MediaKind>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadKind, setUploadKind] = useState<MediaKind>("product");
  const [section, setSection] = useState("chain-care");
  const [publicId, setPublicId] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (kind) params.set("kind", kind);
      const response = await fetch(`/api/admin/media?${params.toString()}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        assets?: MediaAsset[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "We could not load the media library.");
      setAssets(payload.assets ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "We could not load the media library.",
      );
    } finally {
      setLoading(false);
    }
  }, [kind, query]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  async function uploadAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose an image before uploading.");
      return;
    }
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const payload = new FormData();
      payload.append("file", file);
      payload.append("kind", uploadKind);
      if (section.trim()) payload.append("section", section.trim());
      if (publicId.trim()) payload.append("publicId", publicId.trim());
      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        credentials: "same-origin",
        body: payload,
      });
      const result = (await response.json().catch(() => ({}))) as {
        asset?: MediaAsset;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "We could not upload that image.");
      setFile(null);
      setPublicId("");
      setNotice("Image uploaded to Cloudinary and recorded in MongoDB.");
      await loadAssets();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "We could not upload that image.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function removeAsset(asset: MediaAsset) {
    if (!window.confirm(`Remove ${asset.originalName} from Cloudinary?`)) return;
    setWorkingId(asset.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/media/${asset.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "We could not remove that image.");
      setNotice("Image removed from Cloudinary and MongoDB.");
      await loadAssets();
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : "We could not remove that image.",
      );
    } finally {
      setWorkingId("");
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Cloudinary URL copied.");
    } catch {
      setError("Your browser did not allow copying the URL.");
    }
  }

  return (
    <div className="grid gap-8">
      <header className="border-b border-border pb-7">
        <span className="eyebrow text-primary">Content operations</span>
        <h1 className="mt-2 text-3xl font-medium sm:text-4xl">Media library.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Keep images in Cloudinary and catalog metadata in MongoDB. Product uploads are grouped
          under Motoluxe / Products / category.
        </p>
      </header>

      {(error || notice) && (
        <div
          className={`border px-4 py-3 text-sm ${
            error
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-accent/40 bg-accent/10 text-accent"
          }`}
          role="status"
        >
          {error || notice}
        </div>
      )}

      <section className="border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="eyebrow text-accent">Cloudinary upload</span>
            <h2 className="mt-2 text-2xl font-medium">Add a media asset.</h2>
          </div>
          <span className="text-xs text-muted-foreground">Images up to 10 MB</span>
        </div>
        <form onSubmit={uploadAsset} className="mt-6 grid gap-4 lg:grid-cols-4">
          <label className="grid gap-2 text-xs text-muted-foreground">
            File
            <input
              required
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-2 file:font-display file:text-[10px] file:uppercase file:tracking-[0.12em] file:text-primary-foreground"
            />
          </label>
          <label className="grid gap-2 text-xs text-muted-foreground">
            Media type
            <select
              value={uploadKind}
              onChange={(event) => setUploadKind(event.target.value as MediaKind)}
              className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {kinds
                .filter((item) => item.value)
                .map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs text-muted-foreground">
            Section / folder
            <input
              value={section}
              onChange={(event) => setSection(event.target.value)}
              placeholder="chain-care"
              className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="grid gap-2 text-xs text-muted-foreground">
            Public ID (optional)
            <input
              value={publicId}
              onChange={(event) => setPublicId(event.target.value)}
              placeholder="product-slug"
              className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={working}
            className="w-fit bg-primary px-5 py-3 font-display text-xs uppercase tracking-[0.14em] text-primary-foreground disabled:opacity-60 lg:col-span-4"
          >
            {working ? "Uploading…" : "Upload to Cloudinary"}
          </button>
        </form>
      </section>

      <section className="grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow text-muted-foreground">Stored assets</span>
            <p className="mt-2 text-sm text-muted-foreground">
              {assets.length} asset{assets.length === 1 ? "" : "s"} in this view
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search file, folder, public ID"
              className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as "" | MediaKind)}
              className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            >
              {kinds.map((item) => (
                <option key={item.value || "all"} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="border border-border bg-card p-8 text-sm text-muted-foreground">
            Loading media…
          </div>
        ) : assets.length === 0 ? (
          <div className="border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">No media assets match this view.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {assets.map((asset) => (
              <article key={asset.id} className="overflow-hidden border border-border bg-card">
                <div className="aspect-[4/3] bg-background">
                  <img
                    src={asset.secureUrl}
                    alt={asset.originalName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="grid gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{asset.originalName}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{asset.folder}</p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="uppercase">{asset.kind}</span>
                    <span>{formatBytes(asset.bytes)}</span>
                    <span>{formatDate(asset.createdAt)}</span>
                  </div>
                  <div className="flex gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => void copyUrl(asset.secureUrl)}
                      className="flex-1 border border-border px-2 py-2 text-[10px] uppercase tracking-[0.1em] text-muted-foreground hover:border-accent hover:text-accent"
                    >
                      Copy URL
                    </button>
                    <button
                      type="button"
                      disabled={workingId === asset.id}
                      onClick={() => void removeAsset(asset)}
                      className="border border-primary/40 px-2 py-2 text-[10px] uppercase tracking-[0.1em] text-primary hover:bg-primary/10 disabled:opacity-60"
                    >
                      {workingId === asset.id ? "…" : "Remove"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
