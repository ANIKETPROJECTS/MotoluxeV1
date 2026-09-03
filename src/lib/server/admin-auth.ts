import "@tanstack/react-start/server-only";

import { MongoClient, type Db, type ObjectId } from "mongodb";

const ADMIN_SESSION_COOKIE = "motoluxe_admin";
const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const PASSWORD_HASH_ITERATIONS = 210_000;

export type AdminRole =
  "owner" | "manager" | "catalog_editor" | "operations" | "support" | "viewer";

export type Admin = {
  id: string;
  username: string;
  role: AdminRole;
  active: boolean;
};

type AdminDocument = {
  _id?: ObjectId;
  username: string;
  usernameLower: string;
  passwordHash: string;
  role: AdminRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
};

type AdminSessionDocument = {
  sessionId: string;
  adminId: ObjectId;
  createdAt: Date;
  expiresAt: Date;
};

type AdminDatabaseGlobals = typeof globalThis & {
  __motoluxeAdminMongoClient?: MongoClient;
  __motoluxeAdminMongoDb?: Db;
};

function getRequiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function getDatabase() {
  const globals = globalThis as AdminDatabaseGlobals;
  if (globals.__motoluxeAdminMongoDb) return globals.__motoluxeAdminMongoDb;

  const uri = getRequiredEnvironment("MONGODB_URI");
  const client = globals.__motoluxeAdminMongoClient ?? new MongoClient(uri, { maxPoolSize: 10 });
  if (!globals.__motoluxeAdminMongoClient) {
    await client.connect();
    globals.__motoluxeAdminMongoClient = client;
  }

  const dbName = new URL(uri).pathname.replace(/^\//, "") || "motoluxe";
  const db = client.db(dbName);
  globals.__motoluxeAdminMongoDb = db;
  return db;
}

async function getCollections() {
  const db = await getDatabase();
  return {
    admins: db.collection<AdminDocument>("admin"),
    sessions: db.collection<AdminSessionDocument>("admin_sessions"),
  };
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
    ["sign"],
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
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(signature),
    new TextEncoder().encode(value),
  );
}

function getCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  return cookie?.slice(ADMIN_SESSION_COOKIE.length + 1) ?? null;
}

function adminFromDocument(document: AdminDocument): Admin {
  return {
    id: document._id?.toHexString() ?? "",
    username: document.username,
    role: document.role,
    active: document.active,
  };
}

export function normalizeAdminUsername(value: unknown) {
  if (typeof value !== "string") return null;
  const username = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,49}$/.test(username)) return null;
  return username;
}

function usernameKey(username: string) {
  return username.toLowerCase();
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const saltBuffer = new Uint8Array(salt).buffer as ArrayBuffer;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuffer, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePassword(password, salt, PASSWORD_HASH_ITERATIONS);
  return `pbkdf2_sha256$${PASSWORD_HASH_ITERATIONS}$${base64UrlEncode(salt)}$${base64UrlEncode(derived)}`;
}

async function verifyPassword(password: string, encodedHash: string) {
  const [algorithm, iterationsValue, saltValue, hashValue] = encodedHash.split("$");
  const iterations = Number(iterationsValue);
  if (
    algorithm !== "pbkdf2_sha256" ||
    !Number.isSafeInteger(iterations) ||
    iterations < 100_000 ||
    !saltValue ||
    !hashValue
  ) {
    return false;
  }

  try {
    const expected = base64UrlDecode(hashValue);
    const actual = await derivePassword(password, base64UrlDecode(saltValue), iterations);
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}

async function getAdminSessionFromRequest(request: Request) {
  const cookie = getCookie(request);
  if (!cookie) return null;
  const [sessionId, expiresAtValue, signature] = cookie.split(".");
  if (!sessionId || !expiresAtValue || !signature) return null;

  const expiresAt = Number(expiresAtValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return null;
  try {
    if (!(await verifySignature(`${sessionId}.${expiresAtValue}`, signature))) return null;
  } catch {
    return null;
  }

  const { sessions } = await getCollections();
  return sessions.findOne({
    sessionId,
    expiresAt: { $gt: new Date() },
  });
}

export async function findAdminFromRequest(request: Request) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) return null;
  const { admins } = await getCollections();
  const admin = await admins.findOne({ _id: session.adminId, active: true });
  return admin ? adminFromDocument(admin) : null;
}

export async function hasAdminUsers() {
  const { admins } = await getCollections();
  return (await admins.countDocuments({}, { limit: 1 })) > 0;
}

export async function createInitialAdmin(username: string, password: string) {
  const { admins } = await getCollections();
  const existingCount = await admins.countDocuments();
  if (existingCount > 0) return { error: "Admin setup has already been completed." as const };

  const normalizedUsername = normalizeAdminUsername(username);
  if (!normalizedUsername) {
    return { error: "Use 3–50 letters, numbers, dots, underscores, or hyphens." as const };
  }
  if (password.length < 12 || password.length > 200) {
    return { error: "Use a password between 12 and 200 characters." as const };
  }

  const now = new Date();
  const result = await admins.insertOne({
    username: normalizedUsername,
    usernameLower: usernameKey(normalizedUsername),
    passwordHash: await hashPassword(password),
    role: "owner",
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  const admin = await admins.findOne({ _id: result.insertedId });
  return admin ? { admin: adminFromDocument(admin) } : { error: "Admin setup failed." as const };
}

export async function verifyAdminCredentials(username: string, password: string) {
  const normalizedUsername = normalizeAdminUsername(username);
  if (!normalizedUsername) return null;
  const { admins } = await getCollections();
  const admin = await admins.findOne({
    usernameLower: usernameKey(normalizedUsername),
    active: true,
  });
  if (!admin || !(await verifyPassword(password, admin.passwordHash))) return null;

  const updated = await admins.findOneAndUpdate(
    { _id: admin._id },
    { $set: { lastLoginAt: new Date(), updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) return null;
  if (!updated._id) return null;
  return {
    admin: adminFromDocument(updated),
    sessionCookie: await createAdminSession(updated._id),
  };
}

export async function createAdminSession(adminId: ObjectId) {
  const { sessions } = await getCollections();
  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000;
  await sessions.insertOne({
    sessionId,
    adminId,
    createdAt: new Date(),
    expiresAt: new Date(expiresAt),
  });
  const unsignedValue = `${sessionId}.${expiresAt}`;
  return `${unsignedValue}.${await sign(unsignedValue)}`;
}

export function adminSessionCookieHeader(value: string) {
  return [
    `${ADMIN_SESSION_COOKIE}=${value}`,
    "HttpOnly",
    ...(process.env["NODE_ENV"] === "production" ? ["Secure"] : []),
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${ADMIN_SESSION_MAX_AGE_SECONDS}`,
  ].join("; ");
}

export function clearAdminSessionCookieHeader() {
  return [
    `${ADMIN_SESSION_COOKIE}=`,
    "HttpOnly",
    ...(process.env["NODE_ENV"] === "production" ? ["Secure"] : []),
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ].join("; ");
}

export async function destroyAdminSession(request: Request) {
  const cookie = getCookie(request);
  if (!cookie) return;
  const [sessionId] = cookie.split(".");
  if (!sessionId) return;
  const { sessions } = await getCollections();
  await sessions.deleteOne({ sessionId });
}
