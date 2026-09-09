import "@tanstack/react-start/server-only";

import { ObjectId, type ClientSession, type Filter } from "mongodb";
import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";

export const inventoryEventTypes = [
  "purchase",
  "manual_adjustment",
  "return",
  "cancellation_restore",
  "damaged_stock",
  "supplier_receipt",
  "transfer",
] as const;

export type InventoryEventType = (typeof inventoryEventTypes)[number];

export type AdminInventoryMovement = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  eventType: InventoryEventType;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason: string;
  relatedOrderNumber: string | null;
  buyerName: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminInventoryProduct = {
  id: string;
  name: string;
  slug: string;
  stock: number;
  updatedAt?: string;
};

type InventoryProductDocument = {
  _id?: ObjectId;
  name: string;
  slug: string;
  stock: number;
  updatedAt?: Date;
};

type InventoryMovementDocument = Omit<
  AdminInventoryMovement,
  | "id"
  | "productId"
  | "eventType"
  | "relatedOrderNumber"
  | "buyerName"
  | "buyerPhone"
  | "buyerEmail"
  | "createdAt"
  | "updatedAt"
> & {
  _id?: ObjectId;
  productId: ObjectId;
  eventType: InventoryEventType;
  relatedOrderNumber?: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  createdAt: Date;
  updatedAt: Date;
};

async function getDatabase() {
  return getMotoluxeDatabase();
}

async function getCollections() {
  const { client, db } = await getDatabase();
  const collections = {
    products: db.collection<InventoryProductDocument>(MOTOLUXE_COLLECTIONS.products),
    movements: db.collection<InventoryMovementDocument>(MOTOLUXE_COLLECTIONS.inventoryMovements),
  };
  await Promise.all([
    collections.movements.createIndex({ createdAt: -1 }),
    collections.movements.createIndex({ productId: 1, createdAt: -1 }),
    collections.movements.createIndex({ eventType: 1, createdAt: -1 }),
  ]);
  return { client, ...collections };
}

function toDate(value: Date | undefined) {
  return value?.toISOString() ?? new Date(0).toISOString();
}

function toMovement(document: InventoryMovementDocument): AdminInventoryMovement {
  return {
    id: document._id?.toHexString() ?? "",
    productId: document.productId.toHexString(),
    productName: document.productName,
    productSlug: document.productSlug,
    eventType: document.eventType,
    quantityChange: document.quantityChange,
    stockBefore: document.stockBefore,
    stockAfter: document.stockAfter,
    reason: document.reason,
    relatedOrderNumber: document.relatedOrderNumber ?? null,
    buyerName: document.buyerName ?? null,
    buyerPhone: document.buyerPhone ?? null,
    buyerEmail: document.buyerEmail ?? null,
    createdAt: toDate(document.createdAt),
    updatedAt: toDate(document.updatedAt),
  };
}

export function validateAdjustmentInput(input: Record<string, unknown>) {
  const productId = typeof input["productId"] === "string" ? input["productId"].trim() : "";
  const quantityChange =
    typeof input["quantityChange"] === "number"
      ? input["quantityChange"]
      : Number(input["quantityChange"]);
  const reason = typeof input["reason"] === "string" ? input["reason"].trim() : "";

  if (!ObjectId.isValid(productId)) return { error: "Choose a valid product." as const };
  if (
    !Number.isInteger(quantityChange) ||
    quantityChange === 0 ||
    Math.abs(quantityChange) > 1_000_000
  ) {
    return { error: "Enter a whole-number stock change other than zero." as const };
  }
  if (reason.length < 3 || reason.length > 500) {
    return { error: "Enter a reason between 3 and 500 characters." as const };
  }

  return { input: { productId, quantityChange, reason } };
}

export function validateMovementUpdate(input: Record<string, unknown>) {
  const reason = typeof input["reason"] === "string" ? input["reason"].trim() : "";
  if (reason.length < 3 || reason.length > 500) {
    return { error: "Enter a reason between 3 and 500 characters." as const };
  }
  return { input: { reason } };
}

export async function listInventory(productId = "", eventType = "", from = "", to = "") {
  const { products, movements } = await getCollections();
  const movementQuery: Filter<InventoryMovementDocument> = {};
  if (productId && ObjectId.isValid(productId)) movementQuery.productId = new ObjectId(productId);
  if (inventoryEventTypes.includes(eventType as InventoryEventType)) {
    movementQuery.eventType = eventType as InventoryEventType;
  }
  if (from || to) {
    const createdAt: { $gte?: Date; $lte?: Date } = {};
    if (from) {
      const date = new Date(`${from}T00:00:00.000Z`);
      if (!Number.isNaN(date.valueOf())) createdAt.$gte = date;
    }
    if (to) {
      const date = new Date(`${to}T23:59:59.999Z`);
      if (!Number.isNaN(date.valueOf())) createdAt.$lte = date;
    }
    if (createdAt.$gte || createdAt.$lte) movementQuery.createdAt = createdAt;
  }

  const [productDocuments, movementDocuments] = await Promise.all([
    products
      .find({}, { projection: { name: 1, slug: 1, stock: 1, updatedAt: 1 } })
      .sort({ name: 1 })
      .limit(250)
      .toArray(),
    movements.find(movementQuery).sort({ createdAt: -1 }).limit(250).toArray(),
  ]);

  const inventoryProducts = productDocuments.map<AdminInventoryProduct>((product) => ({
    id: product._id?.toHexString() ?? "",
    name: product.name,
    slug: product.slug,
    stock: Number.isInteger(product.stock) ? product.stock : 0,
    updatedAt: product.updatedAt?.toISOString(),
  }));
  const totalUnits = inventoryProducts.reduce((sum, product) => sum + product.stock, 0);
  const lowStock = inventoryProducts.filter(
    (product) => product.stock > 0 && product.stock <= 5,
  ).length;
  const outOfStock = inventoryProducts.filter((product) => product.stock === 0).length;

  return {
    products: inventoryProducts,
    movements: movementDocuments.map(toMovement),
    summary: {
      products: inventoryProducts.length,
      totalUnits,
      lowStock,
      outOfStock,
    },
  };
}

export async function adjustInventory(
  input: { productId: string; quantityChange: number; reason: string },
  metadata: Partial<
    Pick<
      InventoryMovementDocument,
      "relatedOrderNumber" | "buyerName" | "buyerPhone" | "buyerEmail"
    >
  > = {},
) {
  if (!ObjectId.isValid(input.productId)) {
    return { ok: false as const, status: 404, error: "Product not found." };
  }
  const { client, products, movements } = await getCollections();
  const productId = new ObjectId(input.productId);
  let result:
    { ok: true; movement: AdminInventoryMovement } | { ok: false; status: number; error: string } =
    {
      ok: false,
      status: 404,
      error: "Product not found.",
    };

  await client.withSession(async (session) => {
    await session.withTransaction(async () => {
      const product = await products.findOne({ _id: productId }, { session });
      if (!product) return;
      const stockBefore = Number.isInteger(product.stock) ? product.stock : 0;
      const stockAfter = stockBefore + input.quantityChange;
      if (stockAfter < 0) {
        result = {
          ok: false,
          status: 409,
          error: `Stock cannot go below zero. Current stock is ${stockBefore}.`,
        };
        return;
      }
      const now = new Date();
      const updated = await products.updateOne(
        { _id: productId, stock: stockBefore },
        { $set: { stock: stockAfter, updatedAt: now } },
        { session },
      );
      if (updated.modifiedCount !== 1) {
        result = {
          ok: false,
          status: 409,
          error: "Stock changed while this adjustment was being saved. Refresh and try again.",
        };
        return;
      }
      const inserted = await movements.insertOne(
        {
          productId,
          productName: product.name,
          productSlug: product.slug,
          eventType: "manual_adjustment",
          quantityChange: input.quantityChange,
          stockBefore,
          stockAfter,
          reason: input.reason,
          ...metadata,
          createdAt: now,
          updatedAt: now,
        },
        { session },
      );
      const movement = await movements.findOne({ _id: inserted.insertedId }, { session });
      if (movement) result = { ok: true, movement: toMovement(movement) };
    });
  });
  return result;
}

export async function updateInventoryMovement(id: string, reason: string) {
  if (!ObjectId.isValid(id)) return null;
  const { movements } = await getCollections();
  const result = await movements.findOneAndUpdate(
    { _id: new ObjectId(id), eventType: "manual_adjustment" },
    { $set: { reason, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? toMovement(result) : null;
}

export async function deleteInventoryMovement(id: string) {
  if (!ObjectId.isValid(id)) return { deleted: false, reason: "Movement not found." };
  const { client, products, movements } = await getCollections();
  const movementId = new ObjectId(id);
  let result: { deleted: boolean; reason: string } = {
    deleted: false,
    reason: "Movement not found.",
  };

  await client.withSession(async (session: ClientSession) => {
    await session.withTransaction(async () => {
      const movement = await movements.findOne(
        { _id: movementId, eventType: "manual_adjustment" },
        { session },
      );
      if (!movement) return;
      const reverseChange = -movement.quantityChange;
      const product = await products.findOne({ _id: movement.productId }, { session });
      if (!product) {
        result = { deleted: false, reason: "The related product no longer exists." };
        return;
      }
      const stock = Number.isInteger(product.stock) ? product.stock : 0;
      const restoredStock = stock + reverseChange;
      if (restoredStock < 0) {
        result = {
          deleted: false,
          reason: "This movement cannot be deleted because newer stock changes depend on it.",
        };
        return;
      }
      const updated = await products.updateOne(
        { _id: movement.productId, stock },
        { $set: { stock: restoredStock, updatedAt: new Date() } },
        { session },
      );
      if (updated.modifiedCount !== 1) {
        result = { deleted: false, reason: "Stock changed while deleting. Refresh and try again." };
        return;
      }
      const deleted = await movements.deleteOne({ _id: movementId }, { session });
      result =
        deleted.deletedCount === 1
          ? { deleted: true, reason: "" }
          : { deleted: false, reason: "Movement not found." };
    });
  });
  return result;
}
