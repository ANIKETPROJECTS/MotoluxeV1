import "@tanstack/react-start/server-only";

import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";

type ReportOrder = {
  status?: string;
  deletedAt?: Date;
  createdAt?: Date;
  items?: Array<{
    productId?: string;
    productName?: string;
    quantity?: number;
    price?: string | number | null;
  }>;
  pricing?: { total?: string | number | null };
};

type ReportProduct = {
  slug?: string;
  name?: string;
  category?: string;
};

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function dateFromInput(value: string, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

function labelFor(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export async function getAdminReport(options: { from?: string; to?: string }) {
  const { db } = await getMotoluxeDatabase();
  const from = dateFromInput(options.from ?? "");
  const to = dateFromInput(options.to ?? "", true);
  const createdAt: { $gte?: Date; $lte?: Date } = {};
  if (from) createdAt.$gte = from;
  if (to) createdAt.$lte = to;

  const orderFilter: Record<string, unknown> = { deletedAt: { $exists: false } };
  if (createdAt.$gte || createdAt.$lte) orderFilter["createdAt"] = createdAt;

  const [orders, products, customerCount] = await Promise.all([
    db.collection<ReportOrder>(MOTOLUXE_COLLECTIONS.orders).find(orderFilter).toArray(),
    db
      .collection<ReportProduct>(MOTOLUXE_COLLECTIONS.products)
      .find({}, { projection: { slug: 1, name: 1, category: 1 } })
      .toArray(),
    db
      .collection(MOTOLUXE_COLLECTIONS.customers)
      .countDocuments({ archivedAt: { $exists: false } }),
  ]);

  const productCategories = new Map(
    products.map((product) => [product.slug ?? "", product.category ?? "uncategorized"]),
  );
  const statusCounts = new Map<string, number>();
  const productSales = new Map<string, { name: string; units: number; revenue: number }>();
  const categorySales = new Map<string, { units: number; revenue: number }>();
  const dailySales = new Map<string, { orders: number; revenue: number }>();
  let revenue = 0;
  let pricedOrders = 0;

  for (const order of orders) {
    const status = order.status ?? "pending_confirmation";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    const total = numericValue(order.pricing?.total);
    if (total !== null) {
      revenue += total;
      pricedOrders += 1;
    }
    const day = order.createdAt?.toISOString().slice(0, 10) ?? "unknown";
    if (day !== "unknown") {
      const entry = dailySales.get(day) ?? { orders: 0, revenue: 0 };
      entry.orders += 1;
      entry.revenue += total ?? 0;
      dailySales.set(day, entry);
    }

    for (const item of order.items ?? []) {
      const units = Number.isInteger(item.quantity) ? (item.quantity as number) : 0;
      const price = numericValue(item.price);
      const itemRevenue = price === null ? 0 : price * units;
      const key = item.productId ?? item.productName ?? "unknown";
      const product = productSales.get(key) ?? {
        name: item.productName ?? "Unknown product",
        units: 0,
        revenue: 0,
      };
      product.units += units;
      product.revenue += itemRevenue;
      productSales.set(key, product);

      const category = productCategories.get(item.productId ?? "") ?? "uncategorized";
      const categoryEntry = categorySales.get(category) ?? { units: 0, revenue: 0 };
      categoryEntry.units += units;
      categoryEntry.revenue += itemRevenue;
      categorySales.set(category, categoryEntry);
    }
  }

  const topProducts = [...productSales.entries()]
    .sort(([, left], [, right]) => right.units - left.units || right.revenue - left.revenue)
    .slice(0, 10)
    .map(([key, value]) => ({ productId: key, ...value }));
  const topCategories = [...categorySales.entries()]
    .sort(([, left], [, right]) => right.units - left.units || right.revenue - left.revenue)
    .map(([category, value]) => ({ category, name: labelFor(category), ...value }));
  const trend = [...dailySales.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-31)
    .map(([date, value]) => ({ date, ...value }));

  return {
    filters: { from: options.from ?? "", to: options.to ?? "" },
    metrics: {
      orders: orders.length,
      customers: customerCount,
      products: products.length,
      revenue,
      pricedOrders,
      averageOrderValue: pricedOrders ? revenue / pricedOrders : null,
    },
    statuses: [...statusCounts.entries()]
      .sort(([, left], [, right]) => right - left)
      .map(([status, count]) => ({ status, name: labelFor(status), count })),
    topProducts,
    topCategories,
    trend,
  };
}

export function reportCsv(report: Awaited<ReturnType<typeof getAdminReport>>) {
  const rows = [
    ["Report", "Value"],
    ["Orders", report.metrics.orders],
    ["Customers", report.metrics.customers],
    ["Products", report.metrics.products],
    ["Recorded revenue", report.metrics.revenue],
    ["Priced orders", report.metrics.pricedOrders],
    ["Average order value", report.metrics.averageOrderValue ?? ""],
    [],
    ["Product", "Units", "Revenue"],
    ...report.topProducts.map((item) => [item.name, item.units, item.revenue]),
    [],
    ["Category", "Units", "Revenue"],
    ...report.topCategories.map((item) => [item.name, item.units, item.revenue]),
  ];
  return rows
    .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
}
