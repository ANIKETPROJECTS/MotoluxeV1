import { createFileRoute } from "@tanstack/react-router";
import {
  adminSessionCookieHeader,
  verifyAdminCredentials,
} from "@/lib/server/admin-auth";
import { jsonError, readJson } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readJson(request);
        const username = typeof body?.["username"] === "string" ? body["username"] : "";
        const password = typeof body?.["password"] === "string" ? body["password"] : "";
        if (!username || !password) return jsonError("Enter your username and password.", 400);

        try {
          const result = await verifyAdminCredentials(username, password);
          if (!result) return jsonError("That username or password is not correct.", 401);
          return Response.json(
            { admin: result.admin },
            { headers: { "Set-Cookie": adminSessionCookieHeader(result.sessionCookie) } },
          );
        } catch (error) {
          console.error("Admin login unavailable", error);
          return jsonError("Admin login is temporarily unavailable.", 503);
        }
      },
    },
  },
});