import "@tanstack/react-start/server-only";

import { ObjectId } from "mongodb";
import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";

const COUNTER_ID = "motoluxe-orders";

type CounterDocument = {
  _id: string;
  value: number;
};

type NumberedOrderDocument = {
  _id: ObjectId;
  orderNumber?: number;
  createdAt?: Date;
};

export function formatOrderNumber(value: number | undefined) {
  return value && value > 0 ? `MOTOLUXE-${String(value).padStart(2, "0")}` : "MOTOLUXE-—";
}

async function reserveNextNumber() {
  const { db } = await getMotoluxeDatabase();
  const counter = await db
    .collection<CounterDocument>(MOTOLUXE_COLLECTIONS.counters)
    .findOneAndUpdate(
      { _id: COUNTER_ID },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: "after" },
    );
  if (!counter) throw new Error("Order number counter could not be updated.");
  return counter.value;
}

export async function ensureLegacyOrderNumbers() {
  const { db } = await getMotoluxeDatabase();
  const orders = db.collection<NumberedOrderDocument>(MOTOLUXE_COLLECTIONS.orders);
  const counters = db.collection<CounterDocument>(MOTOLUXE_COLLECTIONS.counters);
  const highest = await orders
    .find({ orderNumber: { $exists: true } })
    .sort({ orderNumber: -1 })
    .limit(1)
    .next();

  await counters.updateOne(
    { _id: COUNTER_ID },
    { $max: { value: highest?.orderNumber ?? 0 } },
    { upsert: true },
  );

  const legacyOrders = await orders
    .find({ orderNumber: { $exists: false } })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
  for (const order of legacyOrders) {
    const nextNumber = await reserveNextNumber();
    await orders.updateOne(
      { _id: order._id, orderNumber: { $exists: false } },
      { $set: { orderNumber: nextNumber } },
    );
  }
}

export async function allocateOrderNumber() {
  await ensureLegacyOrderNumbers();
  return reserveNextNumber();
}
