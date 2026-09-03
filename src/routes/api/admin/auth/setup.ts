import { createFileRoute } from "@tanstack/react-router";
import { createInitialAdmin } from "@/lib/server/admin-auth";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/auth/setup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readJson(request);
        const username = typeof body?.["username"] === "string" ? body["username"] : "";
        const password = typeof body?.["password"] === "string" ? body["password"] : "";
        const confirmation = typeof body?.["confirmation"] === "string" ? body["confirmation"] : "";

        if (password !== confirmation) {
          return jsonError("Passwords do not match.", 400);
        }
        try {
          const result = await createInitialAdmin(username, password);
          if ("error" in result) return jsonError(result.error, 400);
          return Response.json({ admin: result.admin }, { status: 201 });
        } catch (error) {
          console.error("Admin setup unavailable", error);
          return jsonError("Admin setup is temporarily unavailable.", 503);
        }
      },
    },
  },
});
