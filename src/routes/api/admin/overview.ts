import { createFileRoute } from "@tanstack/react-router";
import { categories, getProduct, products } from "@/data/catalog";
import { findAdminFromRequest, type Admin } from "@/lib/server/admin-auth";
import { getCustomerCollection, getOrderCollection } from "@/lib/server/customer-auth";
import { jsonError } from "@/lib/server/http";
import { formatOrderNumber } from "@/lib/server/order-number";

type OverviewOrder = {
  _id?: { toHexString(): string };
  orderNumber?: number;
  customerId?: string;
  items?: Array<{
    productId?: string;
    productName?: string;
    quantity?: number;
    price?: string | number | null;
  }>;
  pricing?: { total?: number | string | null };
  delivery?: { name?: string; email?: string; phone?: string };
  status?: string;
  createdAt?: Date;
};

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.replaceAll(",", "").replace(/[^\d.-]/g, "");
  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function orderTotal(order: OverviewOrder) {
  const storedTotal = numericValue(order.pricing?.total);
  if (storedTotal !== null) return storedTotal;

  let total = 0;
  for (const item of order.items ?? []) {
    const quantity = Number.isInteger(item.quantity) ? (item.quantity as number) : 0;
    if (quantity < 1) continue;
    const price = numericValue(item.price) ?? numericValue(getProduct(item.productId ?? "")?.price);
    if (price === null) return null;
    total += price * quantity;
  }

  return total;
}

function orderLabel(order: OverviewOrder) {
  return order.orderNumber && order.orderNumber > 0
    ? formatOrderNumber(order.orderNumber)
    : (order._id?.toHexString().slice(-8).toUpperCase() ?? "PENDING");
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
    const total = orderTotal(order);
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
            customers.countDocuments({ archivedAt: { $exists: false } }),
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
            const total = orderTotal(order);
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
              total: orderTotal(order),
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
