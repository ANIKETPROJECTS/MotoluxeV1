import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import { removeMediaAsset } from "@/lib/server/admin-media";
import { deleteFromCloudinary } from "@/lib/server/cloudinary";
import { jsonError } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/media/$mediaId")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const result = await removeMediaAsset(params.mediaId);
          if ("error" in result) return jsonError(result.error, 404);
          try {
            await deleteFromCloudinary(result.asset.publicId);
          } catch (cloudinaryError) {
            console.error("Cloudinary asset removal failed", cloudinaryError);
            return jsonError("The database record was found, but Cloudinary could not remove the image.", 502);
          }
          return Response.json({ asset: result.asset });
        } catch (error) {
          console.error("Media removal unavailable", error);
          return jsonError("Media removal is temporarily unavailable.", 503);
        }
      },
    },
  },
});