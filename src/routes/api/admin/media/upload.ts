import { createFileRoute } from "@tanstack/react-router";
import { uploadToCloudinary } from "@/lib/server/cloudinary";
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
          if (typeof kind !== "string" || !uploadKinds.includes(kind as (typeof uploadKinds)[number])) {
            return jsonError("Choose a valid upload section.", 400);
          }
          const result = await uploadToCloudinary({
            file,
            kind: kind as (typeof uploadKinds)[number],
            section: typeof section === "string" ? section : undefined,
            publicId: typeof publicId === "string" ? publicId : undefined,
          });
          return Response.json({ asset: result }, { status: 201 });
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