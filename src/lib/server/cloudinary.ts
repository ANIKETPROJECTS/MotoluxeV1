import "@tanstack/react-start/server-only";

import { createHash } from "node:crypto";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

type CloudinaryUploadKind = "product" | "category" | "review";

function requiredSecret(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function cloudinaryCredentials() {
  const cloudinaryUrl = requiredSecret("CLOUDINARY_URL");
  let parsed: URL;
  try {
    parsed = new URL(cloudinaryUrl);
  } catch {
    throw new Error("CLOUDINARY_URL is not valid.");
  }
  if (
    parsed.protocol !== "cloudinary:" ||
    !parsed.hostname ||
    !parsed.username ||
    !parsed.password
  ) {
    throw new Error("CLOUDINARY_URL is not valid.");
  }

  return {
    cloudName: parsed.hostname,
    apiKey: decodeURIComponent(parsed.username),
    apiSecret: decodeURIComponent(parsed.password),
  };
}

function safePathSegment(value: string, fallback: string) {
  const segment = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return segment || fallback;
}

function uploadFolder(kind: CloudinaryUploadKind, section: string, productName = "") {
  if (kind === "product") {
    return `Motoluxe/Products/${safePathSegment(section, "uncategorized")}/${safePathSegment(productName, "untitled-product")}`;
  }
  if (kind === "category") return "Motoluxe/Categories";
  return "Motoluxe/Reviews";
}

function signatureFor(params: Record<string, string>, secret: string) {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${serialized}${secret}`).digest("hex");
}

export async function uploadToCloudinary(options: {
  file: File;
  kind: CloudinaryUploadKind;
  section?: string;
  productName?: string;
  publicId?: string;
}) {
  if (!options.file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }
  if (options.file.size === 0 || options.file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Images must be smaller than 10 MB.");
  }

  const { cloudName, apiKey, apiSecret } = cloudinaryCredentials();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = uploadFolder(options.kind, options.section ?? "", options.productName);
  const publicId =
    options.kind === "product"
      ? "img"
      : options.publicId
        ? safePathSegment(options.publicId, `asset-${timestamp}`)
        : "";
  const signedParams: Record<string, string> = {
    folder,
    timestamp,
    ...(publicId ? { public_id: publicId, overwrite: "true" } : {}),
  };

  const form = new FormData();
  form.append(
    "file",
    new Blob([await options.file.arrayBuffer()], { type: options.file.type }),
    options.file.name,
  );
  form.append("api_key", apiKey);
  for (const [key, value] of Object.entries(signedParams)) form.append(key, value);
  form.append("signature", signatureFor(signedParams, apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    secure_url?: string;
    public_id?: string;
    asset_id?: string;
    error?: { message?: string };
  };
  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message ?? "Cloudinary upload failed.");
  }

  return {
    secureUrl: payload.secure_url,
    publicId: payload.public_id ?? "",
    assetId: payload.asset_id ?? "",
    folder,
  };
}

export async function deleteFromCloudinary(publicId: string) {
  if (!publicId) return;
  const { cloudName, apiKey, apiSecret } = cloudinaryCredentials();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedParams = { public_id: publicId, timestamp };
  const form = new FormData();
  form.append("public_id", publicId);
  form.append("timestamp", timestamp);
  form.append("api_key", apiKey);
  form.append("signature", signatureFor(signedParams, apiSecret));

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: form,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    result?: string;
    error?: { message?: string };
  };
  if (!response.ok || (payload.result !== "ok" && payload.result !== "not found")) {
    throw new Error(payload.error?.message ?? "Cloudinary could not remove the image.");
  }
}
