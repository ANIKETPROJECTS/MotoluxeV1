import "@tanstack/react-start/server-only";

import { ObjectId, type Filter } from "mongodb";
import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";

export const reviewStatuses = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];

export type ReviewMedia = {
  url: string;
  type: "image" | "video";
};

export type AdminReview = {
  id: string;
  productSlug: string;
  productName: string;
  reviewerName: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  media: ReviewMedia[];
  createdAt: string;
  updatedAt: string;
  moderatedAt: string | null;
};

type ReviewDocument = Omit<AdminReview, "id" | "createdAt" | "updatedAt" | "moderatedAt"> & {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  moderatedAt?: Date | null;
};

type ProductDocument = {
  slug: string;
  name: string;
};

export type ReviewInput = {
  productSlug: string;
  reviewerName: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  media: ReviewMedia[];
};

async function getCollections() {
  const { db } = await getMotoluxeDatabase();
  return {
    reviews: db.collection<ReviewDocument>(MOTOLUXE_COLLECTIONS.reviews),
    products: db.collection<ProductDocument>(MOTOLUXE_COLLECTIONS.products),
  };
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === "string" && reviewStatuses.includes(value as ReviewStatus);
}

function validMedia(value: unknown): ReviewMedia[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 8) return null;
  const media: ReviewMedia[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const url = typeof record["url"] === "string" ? record["url"].trim() : "";
    const type = record["type"] === "video" ? "video" : record["type"] === "image" ? "image" : "";
    if (!url || !type || !/^https?:\/\//i.test(url) || url.length > 1000) return null;
    media.push({ url, type });
  }
  return media;
}

export function validateReviewInput(input: Record<string, unknown>) {
  const productSlug = typeof input["productSlug"] === "string" ? input["productSlug"].trim() : "";
  const reviewerName =
    typeof input["reviewerName"] === "string" ? input["reviewerName"].trim() : "";
  const rating = typeof input["rating"] === "number" ? input["rating"] : Number(input["rating"]);
  const title = typeof input["title"] === "string" ? input["title"].trim() : "";
  const body = typeof input["body"] === "string" ? input["body"].trim() : "";
  const status = input["status"] ?? "pending";
  const media = validMedia(input["media"]);

  if (!productSlug) return { error: "Choose a product." as const };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug)) {
    return { error: "Choose a valid product." as const };
  }
  if (reviewerName.length < 2 || reviewerName.length > 80) {
    return { error: "Reviewer name must be between 2 and 80 characters." as const };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be a whole number from 1 to 5." as const };
  }
  if (title.length < 2 || title.length > 120) {
    return { error: "Review title must be between 2 and 120 characters." as const };
  }
  if (body.length < 2 || body.length > 3000) {
    return { error: "Review body must be between 2 and 3,000 characters." as const };
  }
  if (!isReviewStatus(status)) return { error: "Choose a valid moderation status." as const };
  if (!media) return { error: "Attached media must use valid image or video URLs." as const };

  return {
    input: {
      productSlug,
      reviewerName,
      rating,
      title,
      body,
      status,
      media,
    } satisfies ReviewInput,
  };
}

function toReview(document: ReviewDocument): AdminReview {
  return {
    id: document._id?.toHexString() ?? "",
    productSlug: document.productSlug,
    productName: document.productName,
    reviewerName: document.reviewerName,
    rating: document.rating,
    title: document.title,
    body: document.body,
    status: document.status,
    media: document.media ?? [],
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
    moderatedAt: document.moderatedAt?.toISOString() ?? null,
  };
}

async function productNameForSlug(
  products: ReturnType<typeof getCollections> extends Promise<infer T>
    ? T extends { products: infer P }
      ? P
      : never
    : never,
  productSlug: string,
) {
  return products.findOne({ slug: productSlug }, { projection: { name: 1, slug: 1 } });
}

export async function listAdminReviews(options: {
  search?: string;
  status?: string;
  rating?: string;
}) {
  const { reviews } = await getCollections();
  const filter: Filter<ReviewDocument> = {};
  if (options.status && isReviewStatus(options.status)) filter.status = options.status;
  if (options.rating && /^[1-5]$/.test(options.rating)) filter.rating = Number(options.rating);
  const search = options.search?.trim();
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { body: { $regex: search, $options: "i" } },
      { reviewerName: { $regex: search, $options: "i" } },
      { productName: { $regex: search, $options: "i" } },
    ];
  }
  const documents = await reviews.find(filter).sort({ createdAt: -1 }).limit(500).toArray();
  return documents.map(toReview);
}

export async function listReviewProducts() {
  const { products } = await getCollections();
  return products
    .find({}, { projection: { _id: 0, slug: 1, name: 1 } })
    .sort({ name: 1 })
    .toArray();
}

export async function createAdminReview(input: ReviewInput) {
  const { reviews, products } = await getCollections();
  const product = await productNameForSlug(products, input.productSlug);
  if (!product) return null;
  const now = new Date();
  const result = await reviews.insertOne({
    ...input,
    productName: product.name,
    createdAt: now,
    updatedAt: now,
    ...(input.status === "pending" ? {} : { moderatedAt: now }),
  });
  const reviewDocument: ReviewDocument = {
    _id: result.insertedId,
    ...input,
    productName: product.name,
    createdAt: now,
    updatedAt: now,
    ...(input.status === "pending" ? {} : { moderatedAt: now }),
  };
  return toReview(reviewDocument);
}

export async function updateAdminReview(id: string, input: ReviewInput) {
  if (!ObjectId.isValid(id)) return null;
  const { reviews, products } = await getCollections();
  const product = await productNameForSlug(products, input.productSlug);
  if (!product) return null;
  const now = new Date();
  const result = await reviews.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...input,
        productName: product.name,
        updatedAt: now,
        ...(input.status === "pending" ? { moderatedAt: null } : { moderatedAt: now }),
      },
    },
    { returnDocument: "after" },
  );
  return result ? toReview(result) : null;
}

export async function deleteAdminReview(id: string) {
  if (!ObjectId.isValid(id)) return false;
  const { reviews } = await getCollections();
  const result = await reviews.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function listApprovedReviews(productSlug?: string) {
  const { reviews } = await getCollections();
  const filter: Filter<ReviewDocument> = { status: "approved" };
  if (productSlug) filter.productSlug = productSlug;
  return (await reviews.find(filter).sort({ createdAt: -1 }).limit(100).toArray()).map(toReview);
}
