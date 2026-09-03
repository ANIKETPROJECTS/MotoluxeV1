import "@tanstack/react-start/server-only";

import { MongoClient, type Db, type ObjectId } from "mongodb";

const SESSION_COOKIE = "motoluxe_customer";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 30 * 1000;

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
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
};

type OtpDocument = {
  phone: string;
  otpHash: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
};

type SessionDocument = {
  sessionId: string;
  customerId: ObjectId;
  createdAt: Date;
  expiresAt: Date;
};

type DatabaseGlobals = typeof globalThis & {
  __motoluxeMongoClient?: MongoClient;
  __motoluxeMongoDb?: Db;
};

function getRequiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

async function getDatabase() {
  const globals = globalThis as DatabaseGlobals;
  if (globals.__motoluxeMongoDb) return globals.__motoluxeMongoDb;

  const uri = getRequiredEnvironment("MONGODB_URI");
  const client = globals.__motoluxeMongoClient ?? new MongoClient(uri, { maxPoolSize: 10 });
  if (!globals.__motoluxeMongoClient) {
    await client.connect();
    globals.__motoluxeMongoClient = client;
  }

  const dbName = new URL(uri).pathname.replace(/^\//, "") || "motoluxe";
  const db = client.db(dbName);
  globals.__motoluxeMongoDb = db;
  return db;
}

async function getCollections() {
  const db = await getDatabase();
  return {
    customers: db.collection<CustomerDocument>("customers"),
    otps: db.collection<OtpDocument>("customer_otps"),
    sessions: db.collection<SessionDocument>("customer_sessions"),
    orders: db.collection("orders"),
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

  const { sessions, customers } = await getCollections();
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
  const customer = await customers.findOne({ _id: session.customerId });
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

function createOtp() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String((values[0] ?? 0) % 1_000_000).padStart(6, "0");
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64UrlEncode(new Uint8Array(digest));
}

export async function issueOtp(phone: string) {
  const { otps } = await getCollections();
  const now = new Date();
  const recentOtp = await otps.findOne({
    phone,
    createdAt: { $gt: new Date(now.getTime() - OTP_COOLDOWN_MS) },
  });
  if (recentOtp) {
    return { cooldown: true, developmentOtp: undefined };
  }

  const otp = createOtp();
  await otps.deleteMany({ phone });
  await otps.insertOne({
    phone,
    otpHash: await hash(otp),
    createdAt: now,
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    attempts: 0,
  });

  return {
    cooldown: false,
    developmentOtp: process.env["NODE_ENV"] === "production" ? undefined : otp,
  };
}

export async function verifyOtp(phone: string, otp: string) {
  const { otps, customers } = await getCollections();
  const record = await otps.findOne({ phone });
  if (!record || record.expiresAt.getTime() <= Date.now()) {
    return { error: "That code has expired. Request a new one." as const };
  }
  if (record.attempts >= 5) {
    return { error: "Too many attempts. Request a new code." as const };
  }

  const matches = (await hash(otp)) === record.otpHash;
  if (!matches) {
    await otps.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    return { error: "That code is not correct. Try again." as const };
  }

  await otps.deleteOne({ _id: record._id });
  const now = new Date();
  const existing = await customers.findOneAndUpdate(
    { phone },
    {
      $set: { updatedAt: now, lastLoginAt: now },
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
  const cookie = getCookie(request, SESSION_COOKIE);
  if (!cookie) return null;
  const [sessionId] = cookie.split(".");
  if (!sessionId) return null;

  const { sessions, customers } = await getCollections();
  const session = await sessions.findOne({
    sessionId,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

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
  const customer = await customers.findOne({ _id: session.customerId });
  return customer ?? null;
}

export async function getOrderCollection() {
  const { orders } = await getCollections();
  return orders;
}
