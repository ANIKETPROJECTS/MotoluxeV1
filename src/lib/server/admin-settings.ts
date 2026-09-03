import "@tanstack/react-start/server-only";

import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";

const SETTINGS_KEY = "storefront";

export type StorefrontSettings = {
  storeName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  address: string;
  announcement: string;
  ordersEnabled: boolean;
  customerReviewsEnabled: boolean;
  updatedAt: string | null;
};

type SettingsDocument = Omit<StorefrontSettings, "updatedAt"> & {
  _id?: string;
  key: string;
  updatedAt?: Date;
};

const defaults: Omit<StorefrontSettings, "updatedAt"> = {
  storeName: "Motoluxe",
  tagline: "Built for the ride.",
  supportEmail: "",
  supportPhone: "",
  whatsappNumber: "",
  address: "",
  announcement: "",
  ordersEnabled: true,
  customerReviewsEnabled: true,
};

async function settingsCollection() {
  const { db } = await getMotoluxeDatabase();
  return db.collection<SettingsDocument>(MOTOLUXE_COLLECTIONS.settings);
}

function toSettings(document?: SettingsDocument | null): StorefrontSettings {
  return {
    ...defaults,
    ...(document ?? {}),
    updatedAt: document?.updatedAt?.toISOString() ?? null,
  };
}

export async function getStorefrontSettings() {
  const collection = await settingsCollection();
  return toSettings(await collection.findOne({ key: SETTINGS_KEY }));
}

export function validateSettingsInput(input: Record<string, unknown>) {
  const text = (key: string, max: number) =>
    typeof input[key] === "string" ? input[key].trim().slice(0, max) : "";
  const storeName = text("storeName", 80);
  const tagline = text("tagline", 160);
  const supportEmail = text("supportEmail", 160);
  const supportPhone = text("supportPhone", 40);
  const whatsappNumber = text("whatsappNumber", 40);
  const address = text("address", 300);
  const announcement = text("announcement", 240);
  const ordersEnabled = input["ordersEnabled"] === true;
  const customerReviewsEnabled = input["customerReviewsEnabled"] === true;

  if (!storeName) return { error: "Enter a store name." as const };
  if (!tagline) return { error: "Enter a storefront tagline." as const };
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    return { error: "Enter a valid support email address." as const };
  }

  return {
    input: {
      storeName,
      tagline,
      supportEmail,
      supportPhone,
      whatsappNumber,
      address,
      announcement,
      ordersEnabled,
      customerReviewsEnabled,
    },
  };
}

export async function updateStorefrontSettings(input: Omit<StorefrontSettings, "updatedAt">) {
  const collection = await settingsCollection();
  const updatedAt = new Date();
  await collection.updateOne(
    { key: SETTINGS_KEY },
    { $set: { ...input, key: SETTINGS_KEY, updatedAt } },
    { upsert: true },
  );
  return toSettings({ ...input, key: SETTINGS_KEY, updatedAt });
}
