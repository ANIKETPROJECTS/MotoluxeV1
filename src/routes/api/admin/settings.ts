import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import {
  getStorefrontSettings,
  updateStorefrontSettings,
  validateSettingsInput,
} from "@/lib/server/admin-settings";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          return Response.json({ settings: await getStorefrontSettings() });
        } catch (error) {
          console.error("Admin settings unavailable", error);
          return jsonError("Settings are temporarily unavailable.", 503);
        }
      },
      PUT: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const parsed = validateSettingsInput(
            (await readJson(request)) as Record<string, unknown>,
          );
          if ("error" in parsed) return jsonError(parsed.error, 400);
          return Response.json({
            settings: await updateStorefrontSettings(parsed.input),
          });
        } catch (error) {
          console.error("Admin settings update unavailable", error);
          return jsonError("Settings could not be saved right now.", 503);
        }
      },
    },
  },
});
