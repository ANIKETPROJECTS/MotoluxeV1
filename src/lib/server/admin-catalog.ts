import "@tanstack/react-start/server-only";

import { ObjectId, type Filter } from "mongodb";
import {
  categories,
  products as starterProducts,
  type CategorySlug,
  type Product,
} from "@/data/catalog";
import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";

export type AdminCatalogProduct = Product & {
  id: string;
  published: boolean;
  featured: boolean;
  stock: number;
  createdAt: string;
  updatedAt: string;
};

export type CatalogProductInput = {
  slug: string;
  name: string;
  tagline: string;
  category: CategorySlug;
  price: string;
  size: string;
  image: string;
  badge?: string;
  description: string;
  benefits: string[];
  usage: string[];
  published: boolean;
  featured: boolean;
  stock: number;
};

type CatalogProductDocument = Omit<AdminCatalogProduct, "id" | "createdAt" | "updatedAt"> & {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

async function getDatabase() {
  return (await getMotoluxeDatabase()).db;
}

async function getCollection() {
  const db = await getDatabase();
  return db.collection<CatalogProductDocument>(MOTOLUXE_COLLECTIONS.products);
}

function toProduct(document: CatalogProductDocument): AdminCatalogProduct {
  return {
    id: document._id?.toHexString() ?? "",
    slug: document.slug,
    name: document.name,
    tagline: document.tagline,
    category: document.category,
    price: document.price,
    size: document.size,
    image: document.image,
    ...(document.badge ? { badge: document.badge } : {}),
    description: document.description,
    benefits: document.benefits,
    usage: document.usage,
    published: document.published,
    featured: document.featured,
    stock: document.stock,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export function validateCatalogInput(input: Record<string, unknown>) {
  const slug = typeof input["slug"] === "string" ? input["slug"].trim().toLowerCase() : "";
  const name = typeof input["name"] === "string" ? input["name"].trim() : "";
  const tagline = typeof input["tagline"] === "string" ? input["tagline"].trim() : "";
  const category = typeof input["category"] === "string" ? input["category"] : "";
  const price = typeof input["price"] === "string" ? input["price"].trim() : "";
  const size = typeof input["size"] === "string" ? input["size"].trim() : "";
  const image = typeof input["image"] === "string" ? input["image"].trim() : "";
  const badge = typeof input["badge"] === "string" ? input["badge"].trim() : "";
  const description = typeof input["description"] === "string" ? input["description"].trim() : "";
  const benefits = Array.isArray(input["benefits"])
    ? input["benefits"]
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const usage = Array.isArray(input["usage"])
    ? input["usage"]
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const stock = typeof input["stock"] === "number" ? input["stock"] : Number(input["stock"]);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
    return { error: "Use a lowercase product slug with hyphens." as const };
  }
  if (name.length < 2 || name.length > 120)
    return { error: "Enter a valid product name." as const };
  if (tagline.length < 2 || tagline.length > 200)
    return { error: "Enter a short product tagline." as const };
  if (!categories.some((item) => item.slug === category))
    return { error: "Choose a valid category." as const };
  if (price.length < 1 || price.length > 80)
    return { error: "Enter a product price or pricing label." as const };
  if (size.length < 1 || size.length > 80)
    return { error: "Enter the product size or pack format." as const };
  if (image.length < 1 || image.length > 500)
    return { error: "Enter a product image path or URL." as const };
  if (description.length < 10 || description.length > 2000)
    return { error: "Enter a useful product description." as const };
  if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000)
    return { error: "Stock must be a whole number from 0 upward." as const };

  return {
    input: {
      slug,
      name,
      tagline,
      category: category as CategorySlug,
      price,
      size,
      image,
      ...(badge ? { badge } : {}),
      description,
      benefits,
      usage,
      published: input["published"] !== false,
      featured: input["featured"] === true,
      stock,
    } satisfies CatalogProductInput,
  };
}

export async function listCatalogProducts(search = "", category = "", stockFilter = "all") {
  const collection = await getCollection();
  const query: Filter<CatalogProductDocument> = {};
  if (category && categories.some((item) => item.slug === category)) {
    query.category = category as CategorySlug;
  }
  if (search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { slug: { $regex: escaped, $options: "i" } },
      { tagline: { $regex: escaped, $options: "i" } },
    ];
  }
  if (stockFilter === "out") query.stock = 0;
  if (stockFilter === "low") query.stock = { $gt: 0, $lte: 5 };
  if (stockFilter === "in") query.stock = { $gt: 5 };

  const documents = await collection.find(query).sort({ createdAt: -1 }).toArray();
  return documents.map(toProduct);
}

export async function getCatalogProduct(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const document = await (await getCollection()).findOne({ _id: new ObjectId(id) });
  return document ? toProduct(document) : null;
}

export async function createCatalogProduct(input: CatalogProductInput) {
  const collection = await getCollection();
  const now = new Date();
  const result = await collection.insertOne({
    ...input,
    createdAt: now,
    updatedAt: now,
  });
  const document = await collection.findOne({ _id: result.insertedId });
  return document ? toProduct(document) : null;
}

export async function updateCatalogProduct(id: string, input: CatalogProductInput) {
  if (!ObjectId.isValid(id)) return null;
  const collection = await getCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? toProduct(result) : null;
}

export async function deleteCatalogProduct(id: string) {
  if (!ObjectId.isValid(id)) return false;
  const collection = await getCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}

export async function seedStarterCatalog() {
  const collection = await getCollection();
  const now = new Date();
  let imported = 0;
  for (const product of starterProducts) {
    const result = await collection.updateOne(
      { slug: product.slug },
      {
        $setOnInsert: {
          ...product,
          published: true,
          featured: Boolean(product.badge),
          stock: 0,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount > 0) imported += 1;
  }
  return imported;
}
