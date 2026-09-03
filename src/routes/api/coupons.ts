import { createFileRoute } from "@tanstack/react-router";
import { getStorefrontSettings } from "@/lib/server/admin-settings";
import { isCouponCurrentlyActive } from "@/lib/coupon-types";

export const Route = createFileRoute("/api/coupons")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const settings = await getStorefrontSettings();
          return Response.json({
            coupons: settings.coupons.filter((coupon) => isCouponCurrentlyActive(coupon)),
          });
        } catch (error) {
          console.error("Public coupons unavailable", error);
          return Response.json({ coupons: [] });
        }
      },
    },
  },
});
