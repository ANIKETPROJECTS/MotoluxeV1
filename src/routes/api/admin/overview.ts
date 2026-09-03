import { createFileRoute } from "@tanstack/react-router";
import { categories, products } from "@/data/catalog";
import { findAdminFromRequest, type Admin } from "@/lib/server/admin-auth";
import { getCustomerCollection, getOrderCollection } from "@/lib/server/customer-auth";
import { jsonError } from "@/lib/server/http";

type OverviewOrder = {
  _id?: { toHexString(): string };
  customerId?: string;
  items?: Array<{ productName?: string; quantity?: number }>;
  pricing?: { total?: number | string | null };
  delivery?: { name?: string; email?: string; phone?: string };
  status?: string;
  createdAt?: Date;
};

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function orderLabel(order: OverviewOrder) {
  return order._id?.toHexString().slice(-8).toUpperCase() ?? "PENDING";
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short" }).format(date);
}

function createTrend(orders: OverviewOrder[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    return {
      key: monthKey(month),
      label: monthLabel(month),
      revenue: 0,
      orders: 0,
    };
  });
  const byMonth = new Map(months.map((month) => [month.key, month]));

  for (const order of orders) {
    if (!order.createdAt) continue;
    const month = byMonth.get(monthKey(order.createdAt));
    if (!month) continue;
    month.orders += 1;
    const total = numericValue(order.pricing?.total);
    if (total !== null) month.revenue += total;
  }

  return months;
}

export const Route = createFileRoute("/api/admin/overview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        let admin: Admin | null;
        try {
          admin = await findAdminFromRequest(request);
        } catch (error) {
          console.error("Admin overview authentication unavailable", error);
          return jsonError("Admin data is temporarily unavailable.", 503);
        }
        if (!admin) return jsonError("Admin authentication required.", 401);

        try {
          const [customers, orders] = await Promise.all([
            getCustomerCollection(),
            getOrderCollection(),
          ]);
          const [customerCount, orderDocuments] = await Promise.all([
            customers.countDocuments(),
            orders.find({}).sort({ createdAt: -1 }).limit(250).toArray() as Promise<
              OverviewOrder[]
            >,
          ]);

          const pendingStatuses = new Set(["pending", "pending_confirmation", "request_price"]);
          const statusCounts = new Map<string, number>();
          let pricedRevenue = 0;
          let pricedOrderCount = 0;

          for (const order of orderDocuments) {
            const status = order.status ?? "pending_confirmation";
            statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
            const total = numericValue(order.pricing?.total);
            if (total !== null) {
              pricedRevenue += total;
              pricedOrderCount += 1;
            }
          }

          return Response.json({
            admin: { username: admin.username },
            metrics: {
              products: products.length,
              customers: customerCount,
              orders: orderDocuments.length,
              pendingOrders: orderDocuments.filter((order) =>
                pendingStatuses.has(order.status ?? "pending_confirmation"),
              ).length,
              revenue: pricedOrderCount > 0 ? pricedRevenue : null,
            },
            trend: createTrend(orderDocuments),
            statuses: Array.from(statusCounts.entries()).map(([status, count]) => ({
              status,
              count,
            })),
            categoryMix: categories.map((category) => ({
              name: category.name,
              count: products.filter((product) => product.category === category.slug).length,
            })),
            recentOrders: orderDocuments.slice(0, 6).map((order) => ({
              id: order._id?.toHexString() ?? "",
              number: orderLabel(order),
              customer: order.delivery?.name ?? "Customer",
              itemCount: (order.items ?? []).reduce((total, item) => {
                const quantity = item.quantity ?? 0;
                return total + (Number.isInteger(quantity) ? quantity : 0);
              }, 0),
              total: numericValue(order.pricing?.total),
              status: order.status ?? "pending_confirmation",
              createdAt: order.createdAt?.toISOString() ?? null,
            })),
          });
        } catch (error) {
          console.error("Admin overview unavailable", error);
          return jsonError("Admin overview is temporarily unavailable.", 503);
        }
      },
    },
  },
});
