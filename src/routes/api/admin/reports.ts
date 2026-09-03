import { createFileRoute } from "@tanstack/react-router";
import { findAdminFromRequest } from "@/lib/server/admin-auth";
import { getAdminReport, reportCsv } from "@/lib/server/admin-reports";
import { jsonError } from "@/lib/server/http";

export const Route = createFileRoute("/api/admin/reports")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!(await findAdminFromRequest(request))) {
            return jsonError("Admin authentication required.", 401);
          }
          const url = new URL(request.url);
          const report = await getAdminReport({
            from: url.searchParams.get("from") ?? "",
            to: url.searchParams.get("to") ?? "",
          });
          if (url.searchParams.get("format") === "csv") {
            return new Response(reportCsv(report), {
              headers: {
                "content-type": "text/csv; charset=utf-8",
                "content-disposition": 'attachment; filename="motoluxe-report.csv"',
              },
            });
          }
          return Response.json(report);
        } catch (error) {
          console.error("Admin reports unavailable", error);
          return jsonError("Reports are temporarily unavailable.", 503);
        }
      },
    },
  },
});
