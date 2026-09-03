import "@tanstack/react-start/server-only";

import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";
import { couponDiscountTypes, type Coupon, type CouponDiscountType } from "@/lib/coupon-types";

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
  coupons: Coupon[];
  updatedAt: string | null;
};

type SettingsDocument = Omit<StorefrontSettings, "updatedAt" | "coupons"> & {
  _id?: string;
  key: string;
  coupons?: Coupon[];
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
  coupons: [],
};

async function settingsCollection() {
  const { db } = await getMotoluxeDatabase();
  return db.collection<SettingsDocument>(MOTOLUXE_COLLECTIONS.settings);
}

function toSettings(document?: SettingsDocument | null): StorefrontSettings {
  return {
    ...defaults,
    ...(document ?? {}),
    coupons: document?.coupons ?? [],
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
  const rawCoupons = Array.isArray(input["coupons"]) ? input["coupons"].slice(0, 30) : [];
  const coupons: Coupon[] = [];
  const couponCodes = new Set<string>();
  for (const [index, rawCoupon] of rawCoupons.entries()) {
    if (!rawCoupon || typeof rawCoupon !== "object") {
      return { error: "Each coupon must be a valid coupon record." as const };
    }
    const coupon = rawCoupon as Record<string, unknown>;
    const code = typeof coupon["code"] === "string" ? coupon["code"].trim().toUpperCase() : "";
    const description =
      typeof coupon["description"] === "string" ? coupon["description"].trim().slice(0, 120) : "";
    const discountType = coupon["discountType"];
    const discountValue =
      typeof coupon["discountValue"] === "number"
        ? coupon["discountValue"]
        : Number(coupon["discountValue"]);
    const minimumOrderValue =
      typeof coupon["minimumOrderValue"] === "number"
        ? coupon["minimumOrderValue"]
        : Number(coupon["minimumOrderValue"]);
    const expiresAt =
      typeof coupon["expiresAt"] === "string" && coupon["expiresAt"].trim()
        ? coupon["expiresAt"].trim()
        : null;
    if (!/^[A-Z0-9_-]{3,32}$/.test(code) || couponCodes.has(code)) {
      return {
        error: `Coupon ${index + 1} needs a unique code with 3–32 letters or numbers.` as const,
      };
    }
    if (!couponDiscountTypes.includes(discountType as CouponDiscountType)) {
      return { error: `Coupon ${code} needs a valid discount type.` as const };
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return { error: `Coupon ${code} needs a discount greater than zero.` as const };
    }
    if (discountType === "percentage" && discountValue > 100) {
      return { error: `Coupon ${code} cannot discount more than 100%.` as const };
    }
    if (!Number.isFinite(minimumOrderValue) || minimumOrderValue < 0) {
      return { error: `Coupon ${code} needs a valid minimum order value.` as const };
    }
    if (expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
      return { error: `Coupon ${code} needs a valid expiry date.` as const };
    }
    couponCodes.add(code);
    coupons.push({
      id:
        typeof coupon["id"] === "string" && coupon["id"].trim()
          ? coupon["id"].trim().slice(0, 80)
          : `coupon-${index + 1}`,
      code,
      description,
      discountType: discountType as CouponDiscountType,
      discountValue: Math.round(discountValue),
      minimumOrderValue: Math.round(minimumOrderValue),
      expiresAt,
      active: coupon["active"] === true,
    });
  }

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
      coupons,
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
