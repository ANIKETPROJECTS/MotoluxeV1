export const couponDiscountTypes = ["percentage", "fixed"] as const;

export type CouponDiscountType = (typeof couponDiscountTypes)[number];

export type Coupon = {
  id: string;
  code: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderValue: number;
  expiresAt: string | null;
  active: boolean;
};

export function numericPrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function isCouponCurrentlyActive(coupon: Coupon, now = new Date()) {
  if (!coupon.active) return false;
  if (!coupon.expiresAt) return true;
  const expiry = new Date(`${coupon.expiresAt}T23:59:59.999Z`);
  return !Number.isNaN(expiry.valueOf()) && expiry >= now;
}

export function calculateCouponDiscount(coupon: Coupon, subtotal: number) {
  if (subtotal < coupon.minimumOrderValue) return 0;
  const discount =
    coupon.discountType === "percentage"
      ? subtotal * (coupon.discountValue / 100)
      : coupon.discountValue;
  return Math.min(Math.max(Math.round(discount), 0), subtotal);
}

export function formatCouponOffer(coupon: Coupon) {
  const discount =
    coupon.discountType === "percentage"
      ? `${coupon.discountValue}% off`
      : `₹${coupon.discountValue} off`;
  return coupon.minimumOrderValue > 0
    ? `${discount} on orders above ₹${coupon.minimumOrderValue}`
    : discount;
}
