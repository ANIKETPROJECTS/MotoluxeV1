import "@tanstack/react-start/server-only";

import { type ObjectId } from "mongodb";
import { getProduct } from "@/data/catalog";
import {
  getMotoluxeDatabase,
  getRequiredEnvironment,
  MOTOLUXE_COLLECTIONS,
} from "@/lib/server/mongodb";
import { ensureLegacyOrderNumbers, formatOrderNumber } from "@/lib/server/order-number";

const SESSION_COOKIE = "motoluxe_customer";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type Customer = {
  id: string;
  phone: string;
  name?: string;
  email?: string;
};

type CustomerDocument = {
  _id: ObjectId;
  phone: string;
  name?: string;
  email?: string;
  wishlistSlugs?: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  archivedAt?: Date;
};

type SessionDocument = {
  sessionId: string;
  customerId: ObjectId;
  createdAt: Date;
  expiresAt: Date;
};

type OrderItemDocument = {
  productId?: string;
  productName?: string;
  quantity?: number;
  price?: string;
};

type OrderDocument = {
  _id?: ObjectId;
  orderNumber?: number;
  customerId: string;
  items?: OrderItemDocument[];
  status?: string;
  createdAt?: Date;
  delivery?: {
    address?: string;
  };
};

export type AccountOrder = {
  id: string;
  number: string;
  status: string;
  createdAt: string;
  itemCount: number;
  items: Array<{
    productName: string;
    quantity: number;
    price: string;
  }>;
};

export type AccountSnapshot = {
  customer: Customer;
  orders: AccountOrder[];
  wishlistSlugs: string[];
};

async function getDatabase() {
  return (await getMotoluxeDatabase()).db;
}

async function getCollections() {
  const db = await getDatabase();
  return {
    customers: db.collection<CustomerDocument>(MOTOLUXE_COLLECTIONS.customers),
    sessions: db.collection<SessionDocument>(MOTOLUXE_COLLECTIONS.customerSessions),
    orders: db.collection<OrderDocument>(MOTOLUXE_COLLECTIONS.orders),
  };
}

export function normalizePhone(value: unknown) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return digits.slice(-10);
}

function base64UrlEncode(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getRequiredEnvironment("SESSION_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

async function verifySignature(value: string, signature: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getRequiredEnvironment("SESSION_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(signature),
    new TextEncoder().encode(value),
  );
}

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie?.slice(name.length + 1) ?? null;
}

function customerFromDocument(document: CustomerDocument): Customer {
  return {
    id: document._id.toHexString(),
    phone: document.phone,
    ...(document.name ? { name: document.name } : {}),
    ...(document.email ? { email: document.email } : {}),
  };
}

async function getSessionFromRequest(request: Request) {
  const cookie = getCookie(request, SESSION_COOKIE);
  if (!cookie) return null;

  const [sessionId, expiresAtString, signature] = cookie.split(".");
  if (!sessionId || !expiresAtString || !signature) return null;

  const expiresAt = Number(expiresAtString);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return null;
  try {
    if (!(await verifySignature(`${sessionId}.${expiresAtString}`, signature))) {
      return null;
    }
  } catch {
    return null;
  }

  const { sessions } = await getCollections();
  const session = await sessions.findOne({
    sessionId,
    expiresAt: { $gt: new Date() },
  });
  return session;
}

export async function findCustomerFromRequest(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return null;
  const { customers } = await getCollections();
  const customer = await customers.findOne({
    _id: session.customerId,
    archivedAt: { $exists: false },
  });
  return customer ? customerFromDocument(customer) : null;
}

export async function createCustomerSession(customerId: ObjectId) {
  const { sessions } = await getCollections();
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  await sessions.insertOne({
    sessionId,
    customerId,
    createdAt: new Date(),
    expiresAt: new Date(expiresAt),
  });

  const unsignedValue = `${sessionId}.${expiresAt}`;
  const signature = await sign(unsignedValue);
  return `${unsignedValue}.${signature}`;
}

export function sessionCookieHeader(value: string) {
  return [
    `${SESSION_COOKIE}=${value}`,
    "HttpOnly",
    ...(process.env["NODE_ENV"] === "production" ? ["Secure"] : []),
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ].join("; ");
}

export function clearSessionCookieHeader() {
  return [
    `${SESSION_COOKIE}=`,
    "HttpOnly",
    ...(process.env["NODE_ENV"] === "production" ? ["Secure"] : []),
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ].join("; ");
}

export async function destroyCustomerSession(request: Request) {
  const cookie = getCookie(request, SESSION_COOKIE);
  if (!cookie) return;
  const [sessionId] = cookie.split(".");
  if (!sessionId) return;
  const { sessions } = await getCollections();
  await sessions.deleteOne({ sessionId });
}

export async function loginCustomer(phone: string, name: string) {
  const { customers } = await getCollections();
  const archived = await customers.findOne({ phone, archivedAt: { $exists: true } });
  if (archived) {
    return {
      error:
        "This customer account is archived. Please contact support to restore access." as const,
    };
  }
  const now = new Date();
  const existing = await customers.findOneAndUpdate(
    { phone },
    {
      $set: { name, updatedAt: now, lastLoginAt: now },
      $setOnInsert: { phone, createdAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!existing) {
    return { error: "We could not create your customer account." as const };
  }

  return {
    customer: customerFromDocument(existing),
    sessionCookie: await createCustomerSession(existing._id),
  };
}

export async function updateCustomerProfile(
  request: Request,
  input: { name: string; email?: string },
) {
  const session = await getSessionFromRequest(request);
  if (!session) return null;
  const { customers } = await getCollections();

  const name = input.name.trim();
  const email = input.email?.trim().toLowerCase();
  if (name.length < 2 || name.length > 100) return null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  const customer = await customers.findOneAndUpdate(
    { _id: session.customerId },
    {
      $set: {
        name,
        ...(email ? { email } : {}),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
  return customer ? customerFromDocument(customer) : null;
}

export async function getAuthenticatedCustomer(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return null;
  const { customers } = await getCollections();
  const customer = await customers.findOne({
    _id: session.customerId,
    archivedAt: { $exists: false },
  });
  return customer ?? null;
}

export async function getAccountSnapshot(request: Request): Promise<AccountSnapshot | null> {
  const customer = await getAuthenticatedCustomer(request);
  if (!customer) return null;

  await ensureLegacyOrderNumbers();
  const { orders } = await getCollections();
  const orderDocuments = await orders
    .find({ customerId: customer._id.toHexString() })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  return {
    customer: customerFromDocument(customer),
    orders: orderDocuments.map((order) => {
      const items = (order.items ?? []).map((item) => ({
        productId: item.productId ?? "",
        productName: item.productName ?? "Motoluxe product",
        quantity: Number.isInteger(item.quantity) ? (item.quantity as number) : 0,
        price: item.price ?? "Request price",
      }));
      return {
        id: order._id?.toHexString() ?? "",
        number: formatOrderNumber(order.orderNumber),
        status: order.status ?? "pending_confirmation",
        createdAt: order.createdAt?.toISOString() ?? new Date(0).toISOString(),
        itemCount: items.reduce((total, item) => total + item.quantity, 0),
        items,
      };
    }),
    wishlistSlugs: customer.wishlistSlugs ?? [],
  };
}

export async function updateCustomerWishlist(request: Request, submittedSlugs: string[]) {
  const customer = await getAuthenticatedCustomer(request);
  if (!customer) return null;

  const wishlistSlugs = Array.from(
    new Set(submittedSlugs.filter((slug) => Boolean(getProduct(slug)))),
  ).slice(0, 50);
  const { customers } = await getCollections();
  await customers.updateOne(
    { _id: customer._id },
    { $set: { wishlistSlugs, updatedAt: new Date() } },
  );
  return wishlistSlugs;
}

export async function getOrderCollection() {
  const { orders } = await getCollections();
  return orders;
}

export async function getCustomerCollection() {
  const { customers } = await getCollections();
  return customers;
}
