import "@tanstack/react-start/server-only";

import { ObjectId, type Collection } from "mongodb";
import {
  getCustomerCollection,
  getOrderCollection,
  normalizePhone,
} from "@/lib/server/customer-auth";
import { ensureLegacyOrderNumbers, formatOrderNumber } from "@/lib/server/order-number";

type CustomerDocument = {
  _id?: ObjectId;
  orderNumber?: number;
  phone: string;
  name?: string;
  email?: string;
  wishlistSlugs?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  archivedAt?: Date;
};

type CustomerOrderDocument = {
  _id?: ObjectId;
  orderNumber?: number;
  customerId?: string;
  items?: Array<{ productName?: string; quantity?: number }>;
  pricing?: { total?: number | string | null };
  paymentStatus?: string;
  delivery?: {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    state?: string;
  };
  status?: string;
  createdAt?: Date;
};

type CustomerCollection = Collection<CustomerDocument>;
type OrderCollection = Collection<CustomerOrderDocument>;

export type AdminCustomerListItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  orderCount: number;
  totalSpent: number;
  joinedAt: string;
  lastActivityAt: string | null;
  verification: string;
  hasPaidOrder: boolean;
  wishlistCount: number;
};

export type AdminCustomerOrder = {
  id: string;
  number: string;
  date: string;
  itemCount: number;
  total: number | null;
  status: string;
  paymentStatus: string;
};

export type AdminCustomerDetail = AdminCustomerListItem & {
  orders: AdminCustomerOrder[];
};

function asCustomerCollection(collection: Awaited<ReturnType<typeof getCustomerCollection>>) {
  return collection as unknown as CustomerCollection;
}

function asOrderCollection(collection: Awaited<ReturnType<typeof getOrderCollection>>) {
  return collection as unknown as OrderCollection;
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function dateValue(value: Date | undefined) {
  return value?.toISOString() ?? null;
}

function orderCustomerKey(order: CustomerOrderDocument) {
  if (order.customerId) return order.customerId;
  const phone = normalizePhone(order.delivery?.phone);
  return phone ? `phone:${phone}` : null;
}

function customerInitialKey(customer: CustomerDocument) {
  return customer._id?.toHexString() ?? `phone:${customer.phone}`;
}

function orderActivityDate(order: CustomerOrderDocument) {
  return order.createdAt?.getTime() ?? 0;
}

function customerStats(customer: CustomerDocument, orders: CustomerOrderDocument[]) {
  const matchingOrders = orders
    .filter((order) => orderCustomerKey(order) === customerInitialKey(customer))
    .sort((left, right) => orderActivityDate(right) - orderActivityDate(left));
  const latestOrder = matchingOrders[0];
  const totalSpent = matchingOrders.reduce(
    (sum, order) => sum + (numericValue(order.pricing?.total) ?? 0),
    0,
  );
  const lastLoginAt = customer.lastLoginAt?.getTime() ?? 0;
  const updatedAt = customer.updatedAt?.getTime() ?? 0;
  const latestOrderAt = latestOrder?.createdAt?.getTime() ?? 0;
  const lastActivityAt = Math.max(lastLoginAt, updatedAt, latestOrderAt);

  return {
    matchingOrders,
    latestOrder,
    orderCount: matchingOrders.length,
    totalSpent,
    hasPaidOrder: matchingOrders.some((order) => order.paymentStatus === "paid"),
    lastActivityAt: lastActivityAt > 0 ? new Date(lastActivityAt).toISOString() : null,
  };
}

function listItem(
  customer: CustomerDocument,
  orders: CustomerOrderDocument[],
): AdminCustomerListItem {
  const stats = customerStats(customer, orders);
  return {
    id: customer._id?.toHexString() ?? "",
    name: customer.name ?? "Unnamed customer",
    email: customer.email ?? "",
    phone: customer.phone,
    city: stats.latestOrder?.delivery?.city ?? "",
    state: stats.latestOrder?.delivery?.state ?? "",
    orderCount: stats.orderCount,
    totalSpent: stats.totalSpent,
    joinedAt: customer.createdAt.toISOString(),
    lastActivityAt: stats.lastActivityAt,
    verification: "Not tracked",
    hasPaidOrder: stats.hasPaidOrder,
    wishlistCount: customer.wishlistSlugs?.length ?? 0,
  };
}

function orderItem(order: CustomerOrderDocument & { _id: ObjectId }): AdminCustomerOrder {
  return {
    id: order._id.toHexString(),
    number: formatOrderNumber(order.orderNumber),
    date: order.createdAt?.toISOString() ?? new Date(0).toISOString(),
    itemCount: (order.items ?? []).reduce(
      (sum, item) => sum + (Number.isInteger(item.quantity) ? (item.quantity as number) : 0),
      0,
    ),
    total: numericValue(order.pricing?.total),
    status: order.status ?? "pending_confirmation",
    paymentStatus: order.paymentStatus ?? "pending",
  };
}

export async function listAdminCustomers(options: {
  search?: string;
  city?: string;
  state?: string;
  activity?: string;
  paid?: string;
  sort?: string;
  direction?: string;
}) {
  await ensureLegacyOrderNumbers();
  const [customerDocuments, orderDocuments] = await Promise.all([
    asCustomerCollection(await getCustomerCollection())
      .find({ archivedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray(),
    asOrderCollection(await getOrderCollection())
      .find({ deletedAt: { $exists: false } } as never)
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray(),
  ]);

  const search = options.search?.trim().toLowerCase() ?? "";
  const customers = customerDocuments
    .map((customer) => listItem(customer, orderDocuments))
    .filter((customer) => {
      if (
        search &&
        ![customer.name, customer.email, customer.phone].some((value) =>
          value.toLowerCase().includes(search),
        )
      ) {
        return false;
      }
      if (options.city && customer.city !== options.city) return false;
      if (options.state && customer.state !== options.state) return false;
      if (options.paid === "yes" && !customer.hasPaidOrder) return false;
      if (options.paid === "no" && customer.hasPaidOrder) return false;
      if (options.activity === "never" && customer.lastActivityAt) return false;
      if (options.activity === "recent") {
        const recentCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
        if (
          !customer.lastActivityAt ||
          new Date(customer.lastActivityAt).getTime() < recentCutoff
        ) {
          return false;
        }
      }
      return true;
    });

  const direction = options.direction === "asc" ? 1 : -1;
  customers.sort((left, right) => {
    let comparison = 0;
    if (options.sort === "activity") {
      comparison =
        new Date(left.lastActivityAt ?? 0).getTime() -
        new Date(right.lastActivityAt ?? 0).getTime();
    } else if (options.sort === "orders") {
      comparison = left.orderCount - right.orderCount;
    } else if (options.sort === "spent") {
      comparison = left.totalSpent - right.totalSpent;
    } else {
      comparison = new Date(left.joinedAt).getTime() - new Date(right.joinedAt).getTime();
    }
    return comparison * direction;
  });

  return {
    customers,
    summary: {
      registered: customerDocuments.length,
      withOrders: customerDocuments.filter(
        (customer) => customerStats(customer, orderDocuments).orderCount > 0,
      ).length,
      totalSales: customerDocuments.reduce(
        (sum, customer) => sum + customerStats(customer, orderDocuments).totalSpent,
        0,
      ),
    },
    filters: {
      cities: Array.from(
        new Set(customers.map((customer) => customer.city).filter(Boolean)),
      ).sort(),
      states: Array.from(
        new Set(customers.map((customer) => customer.state).filter(Boolean)),
      ).sort(),
    },
  };
}

export async function getAdminCustomer(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const [customer, orderDocuments] = await Promise.all([
    asCustomerCollection(await getCustomerCollection()).findOne({
      _id: new ObjectId(id),
      archivedAt: { $exists: false },
    }),
    asOrderCollection(await getOrderCollection())
      .find({ customerId: id, deletedAt: { $exists: false } } as never)
      .sort({ createdAt: -1 })
      .limit(250)
      .toArray(),
  ]);
  if (!customer?._id) return null;
  const base = listItem(customer, orderDocuments);
  return {
    ...base,
    orders: orderDocuments
      .filter((order): order is CustomerOrderDocument & { _id: ObjectId } => Boolean(order._id))
      .map(orderItem),
  };
}

export function validateCustomerInput(input: Record<string, unknown>) {
  const name = typeof input["name"] === "string" ? input["name"].trim() : "";
  const phone = normalizePhone(input["phone"]);
  const email = typeof input["email"] === "string" ? input["email"].trim().toLowerCase() : "";
  if (name.length < 2 || name.length > 100) {
    return { error: "Customer name must be between 2 and 100 characters." as const };
  }
  if (!phone) return { error: "Enter a valid customer phone number." as const };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid customer email address." as const };
  }
  return { input: { name, phone, email } };
}

export async function createAdminCustomer(input: { name: string; phone: string; email: string }) {
  const collection = asCustomerCollection(await getCustomerCollection());
  const existing = await collection.findOne({ phone: input.phone, archivedAt: { $exists: false } });
  if (existing)
    return { ok: false as const, status: 409, error: "A customer with this phone already exists." };
  const now = new Date();
  const result = await collection.insertOne({
    phone: input.phone,
    name: input.name,
    ...(input.email ? { email: input.email } : {}),
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true as const, customerId: result.insertedId.toHexString() };
}

export async function updateAdminCustomer(
  id: string,
  input: { name: string; phone: string; email: string },
) {
  if (!ObjectId.isValid(id))
    return { ok: false as const, status: 404, error: "Customer not found." };
  const collection = asCustomerCollection(await getCustomerCollection());
  const duplicate = await collection.findOne({
    phone: input.phone,
    _id: { $ne: new ObjectId(id) },
    archivedAt: { $exists: false },
  });
  if (duplicate)
    return { ok: false as const, status: 409, error: "A customer with this phone already exists." };
  const result = await collection.updateOne(
    { _id: new ObjectId(id), archivedAt: { $exists: false } },
    {
      $set: {
        name: input.name,
        phone: input.phone,
        ...(input.email ? { email: input.email } : {}),
        updatedAt: new Date(),
      },
      ...(input.email ? {} : { $unset: { email: "" } }),
    },
  );
  return result.matchedCount
    ? { ok: true as const }
    : { ok: false as const, status: 404, error: "Customer not found." };
}

export async function archiveAdminCustomer(id: string) {
  if (!ObjectId.isValid(id))
    return { ok: false as const, status: 404, error: "Customer not found." };
  const collection = asCustomerCollection(await getCustomerCollection());
  const result = await collection.updateOne(
    { _id: new ObjectId(id), archivedAt: { $exists: false } },
    { $set: { archivedAt: new Date(), updatedAt: new Date() } },
  );
  return result.matchedCount
    ? { ok: true as const }
    : { ok: false as const, status: 404, error: "Customer not found." };
}
