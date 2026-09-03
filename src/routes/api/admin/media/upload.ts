import { createFileRoute } from "@tanstack/react-router";
import { uploadToCloudinary } from "@/lib/server/cloudinary";
import { recordMediaAsset } from "@/lib/server/admin-media";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import { jsonError } from "@/lib/server/http";

const uploadKinds = ["product", "category", "brand", "review"] as const;

export const Route = createFileRoute("/api/admin/media/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const form = await request.formData();
          const file = form.get("file");
          const kind = form.get("kind");
          const section = form.get("section");
          const publicId = form.get("publicId");
          if (!(file instanceof File)) return jsonError("Choose an image to upload.", 400);
          if (
            typeof kind !== "string" ||
            !uploadKinds.includes(kind as (typeof uploadKinds)[number])
          ) {
            return jsonError("Choose a valid upload section.", 400);
          }
          const uploadOptions = {
            file,
            kind: kind as (typeof uploadKinds)[number],
            ...(typeof section === "string" ? { section } : {}),
            ...(typeof publicId === "string" ? { publicId } : {}),
          } as const;
          const result = await uploadToCloudinary(uploadOptions);
          const asset = await recordMediaAsset({
            secureUrl: result.secureUrl,
            publicId: result.publicId,
            assetId: result.assetId,
            folder: result.folder,
            kind: kind as (typeof uploadKinds)[number],
            section: typeof section === "string" ? section : "",
            originalName: file.name,
            mimeType: file.type,
            bytes: file.size,
          });
          return Response.json({ asset }, { status: 201 });
        } catch (error) {
          console.error("Cloudinary media upload unavailable", error);
          return jsonError(
            error instanceof Error ? error.message : "Image upload is temporarily unavailable.",
            503,
          );
        }
      },
    },
  },
});
