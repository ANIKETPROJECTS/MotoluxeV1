import "@tanstack/react-start/server-only";

import { MongoClient, type Db } from "mongodb";

const MOTOLUXE_DATABASE_NAME = "motoluxe";

export const MOTOLUXE_COLLECTIONS = {
  admins: "admin",
  adminSessions: "admin_sessions",
  customers: "customers",
  customerSessions: "customer_sessions",
  customerOtps: "customer_otps",
  products: "products",
  categories: "categories",
  brands: "brands",
  reviews: "reviews",
  settings: "settings",
  counters: "counters",
  inventoryMovements: "inventory_movements",
  orders: "orders",
} as const;

type MongoGlobals = typeof globalThis & {
  __motoluxeSharedMongoClient?: MongoClient;
  __motoluxeSharedMongoDb?: Db;
  __motoluxeSharedIndexesReady?: Promise<void>;
};

export function getRequiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function getMotoluxeDatabase() {
  const globals = globalThis as MongoGlobals;
  if (globals.__motoluxeSharedMongoDb && globals.__motoluxeSharedMongoClient) {
    if (globals.__motoluxeSharedIndexesReady) await globals.__motoluxeSharedIndexesReady;
    return {
      client: globals.__motoluxeSharedMongoClient,
      db: globals.__motoluxeSharedMongoDb,
    };
  }

  const client =
    globals.__motoluxeSharedMongoClient ??
    new MongoClient(getRequiredEnvironment("MONGODB_URI"), {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
  if (!globals.__motoluxeSharedMongoClient) {
    await client.connect();
    globals.__motoluxeSharedMongoClient = client;
  }

  const db = client.db(MOTOLUXE_DATABASE_NAME);
  globals.__motoluxeSharedMongoDb = db;
  globals.__motoluxeSharedIndexesReady = Promise.all([
    db.collection(MOTOLUXE_COLLECTIONS.admins).createIndex({ usernameLower: 1 }, { unique: true }),
    db
      .collection(MOTOLUXE_COLLECTIONS.adminSessions)
      .createIndex({ sessionId: 1 }, { unique: true }),
    db.collection(MOTOLUXE_COLLECTIONS.adminSessions).createIndex({ expiresAt: 1 }),
    db.collection(MOTOLUXE_COLLECTIONS.customers).createIndex({ phone: 1 }),
    db.collection(MOTOLUXE_COLLECTIONS.customers).createIndex({ updatedAt: -1 }),
    db
      .collection(MOTOLUXE_COLLECTIONS.customerSessions)
      .createIndex({ sessionId: 1 }, { unique: true }),
    db.collection(MOTOLUXE_COLLECTIONS.customerSessions).createIndex({ expiresAt: 1 }),
    db.collection(MOTOLUXE_COLLECTIONS.orders).createIndex({ customerId: 1, createdAt: -1 }),
    db.collection(MOTOLUXE_COLLECTIONS.orders).createIndex({ status: 1, createdAt: -1 }),
    db
      .collection(MOTOLUXE_COLLECTIONS.orders)
      .createIndex({ orderNumber: 1 }, { unique: true, sparse: true }),
    db.collection(MOTOLUXE_COLLECTIONS.products).createIndex({ slug: 1 }, { unique: true }),
    db.collection(MOTOLUXE_COLLECTIONS.categories).createIndex({ slug: 1 }, { unique: true }),
    db.collection(MOTOLUXE_COLLECTIONS.brands).createIndex({ slug: 1 }, { unique: true }),
    db.collection(MOTOLUXE_COLLECTIONS.reviews).createIndex({ createdAt: -1 }),
    db.collection(MOTOLUXE_COLLECTIONS.reviews).createIndex({ status: 1, createdAt: -1 }),
    db.collection(MOTOLUXE_COLLECTIONS.reviews).createIndex({ productSlug: 1, status: 1 }),
    db.collection(MOTOLUXE_COLLECTIONS.reviews).createIndex({ customerId: 1, productSlug: 1 }),
    db.collection(MOTOLUXE_COLLECTIONS.settings).createIndex({ key: 1 }, { unique: true }),
    db.collection(MOTOLUXE_COLLECTIONS.inventoryMovements).createIndex({ createdAt: -1 }),
  ]).then(() => undefined);
  await globals.__motoluxeSharedIndexesReady;
  return { client, db };
}
