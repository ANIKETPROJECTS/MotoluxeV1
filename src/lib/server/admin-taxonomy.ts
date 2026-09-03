import "@tanstack/react-start/server-only";

import { MongoClient, ObjectId, type Db } from "mongodb";
import { categories as starterCategories } from "@/data/catalog";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  image: string;
  displayOrder: number;
  published: boolean;
  featured: boolean;
  childCount: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminBrand = {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  website: string;
  active: boolean;
  displayOrder: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CategoryInput = {
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  image: string;
  displayOrder: number;
  published: boolean;
  featured: boolean;
};

export type BrandInput = {
  name: string;
  slug: string;
  logo: string;
  description: string;
  website: string;
  active: boolean;
  displayOrder: number;
};

type CategoryDocument = Omit<
  AdminCategory,
  "id" | "parentId" | "childCount" | "productCount" | "createdAt" | "updatedAt"
> & {
  _id?: ObjectId;
  parentId: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

type BrandDocument = Omit<AdminBrand, "id" | "productCount" | "createdAt" | "updatedAt"> & {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

type TaxonomyDatabaseGlobals = typeof globalThis & {
  __motoluxeTaxonomyMongoClient?: MongoClient;
  __motoluxeTaxonomyMongoDb?: Db;
  __motoluxeTaxonomyIndexesReady?: boolean;
};

function getRequiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function getDatabase() {
  const globals = globalThis as TaxonomyDatabaseGlobals;
  if (globals.__motoluxeTaxonomyMongoDb) return globals.__motoluxeTaxonomyMongoDb;

  const uri = getRequiredEnvironment("MONGODB_URI");
  const client = globals.__motoluxeTaxonomyMongoClient ?? new MongoClient(uri, { maxPoolSize: 10 });
  if (!globals.__motoluxeTaxonomyMongoClient) {
    await client.connect();
    globals.__motoluxeTaxonomyMongoClient = client;
  }

  const dbName = new URL(uri).pathname.replace(/^\//, "") || "motoluxe";
  const db = client.db(dbName);
  globals.__motoluxeTaxonomyMongoDb = db;
  return db;
}

async function getCollections() {
  const db = await getDatabase();
  const collections = {
    categories: db.collection<CategoryDocument>("categories"),
    brands: db.collection<BrandDocument>("brands"),
    products: db.collection<{ category?: string; brandId?: string }>("products"),
  };

  const globals = globalThis as TaxonomyDatabaseGlobals;
  if (!globals.__motoluxeTaxonomyIndexesReady) {
    await Promise.all([
      collections.categories.createIndex({ slug: 1 }, { unique: true }),
      collections.brands.createIndex({ slug: 1 }, { unique: true }),
      collections.categories.createIndex({ parentId: 1, displayOrder: 1 }),
      collections.brands.createIndex({ displayOrder: 1 }),
    ]);
    globals.__motoluxeTaxonomyIndexesReady = true;
  }

  return collections;
}

function isoDate(value: Date | undefined) {
  return value?.toISOString() ?? new Date(0).toISOString();
}

function toCategory(
  document: CategoryDocument,
  counts: { childCount: number; productCount: number },
): AdminCategory {
  return {
    id: document._id?.toHexString() ?? "",
    name: document.name,
    slug: document.slug,
    parentId: document.parentId?.toHexString() ?? null,
    description: document.description,
    image: document.image,
    displayOrder: document.displayOrder,
    published: document.published,
    featured: document.featured,
    ...counts,
    createdAt: isoDate(document.createdAt),
    updatedAt: isoDate(document.updatedAt),
  };
}

function toBrand(document: BrandDocument, productCount: number): AdminBrand {
  return {
    id: document._id?.toHexString() ?? "",
    name: document.name,
    slug: document.slug,
    logo: document.logo,
    description: document.description,
    website: document.website,
    active: document.active,
    displayOrder: document.displayOrder,
    productCount,
    createdAt: isoDate(document.createdAt),
    updatedAt: isoDate(document.updatedAt),
  };
}

export function validateCategoryInput(input: Record<string, unknown>) {
  const name = typeof input["name"] === "string" ? input["name"].trim() : "";
  const slug = typeof input["slug"] === "string" ? input["slug"].trim().toLowerCase() : "";
  const parentId =
    typeof input["parentId"] === "string" && input["parentId"].trim()
      ? input["parentId"].trim()
      : null;
  const description = typeof input["description"] === "string" ? input["description"].trim() : "";
  const image = typeof input["image"] === "string" ? input["image"].trim() : "";
  const displayOrder =
    typeof input["displayOrder"] === "number"
      ? input["displayOrder"]
      : Number(input["displayOrder"]);

  if (name.length < 2 || name.length > 120) {
    return { error: "Enter a category name between 2 and 120 characters." as const };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
    return { error: "Use a lowercase category slug with hyphens." as const };
  }
  if (parentId && !ObjectId.isValid(parentId)) {
    return { error: "Choose a valid parent category." as const };
  }
  if (description.length < 10 || description.length > 2000) {
    return { error: "Enter a useful category description." as const };
  }
  if (image.length < 1 || image.length > 500) {
    return { error: "Enter a category image path or URL." as const };
  }
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 1_000_000) {
    return { error: "Display order must be a whole number from 0 upward." as const };
  }

  return {
    input: {
      name,
      slug,
      parentId,
      description,
      image,
      displayOrder,
      published: input["published"] !== false,
      featured: input["featured"] === true,
    } satisfies CategoryInput,
  };
}

export function validateBrandInput(input: Record<string, unknown>) {
  const name = typeof input["name"] === "string" ? input["name"].trim() : "";
  const slug = typeof input["slug"] === "string" ? input["slug"].trim().toLowerCase() : "";
  const logo = typeof input["logo"] === "string" ? input["logo"].trim() : "";
  const description = typeof input["description"] === "string" ? input["description"].trim() : "";
  const website = typeof input["website"] === "string" ? input["website"].trim() : "";
  const displayOrder =
    typeof input["displayOrder"] === "number"
      ? input["displayOrder"]
      : Number(input["displayOrder"]);

  if (name.length < 2 || name.length > 120) {
    return { error: "Enter a brand name between 2 and 120 characters." as const };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
    return { error: "Use a lowercase brand slug with hyphens." as const };
  }
  if (logo.length > 500) return { error: "Logo path or URL is too long." as const };
  if (description.length > 2000) return { error: "Brand description is too long." as const };
  if (website) {
    try {
      const url = new URL(website);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid protocol");
    } catch {
      return { error: "Website must be a valid http or https URL." as const };
    }
  }
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 1_000_000) {
    return { error: "Display order must be a whole number from 0 upward." as const };
  }

  return {
    input: {
      name,
      slug,
      logo,
      description,
      website,
      active: input["active"] !== false,
      displayOrder,
    } satisfies BrandInput,
  };
}

export async function listCatalogCategories(search = "", published = "all") {
  const { categories, products } = await getCollections();
  const query: Record<string, unknown> = {};
  if (search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query["$or"] = [
      { name: { $regex: escaped, $options: "i" } },
      { slug: { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } },
    ];
  }
  if (published === "published") query["published"] = true;
  if (published === "draft") query["published"] = false;

  const [documents, childCounts, productCounts] = await Promise.all([
    categories.find(query).sort({ displayOrder: 1, name: 1 }).limit(250).toArray(),
    categories
      .aggregate<{ _id: ObjectId | null; count: number }>([
        { $group: { _id: "$parentId", count: { $sum: 1 } } },
      ])
      .toArray(),
    products
      .aggregate<{ _id: string; count: number }>([
        { $match: { category: { $type: "string" } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  const childCountByParent = new Map(
    childCounts
      .filter((item) => item._id)
      .map((item) => [item._id?.toHexString() ?? "", item.count]),
  );
  const productCountBySlug = new Map(productCounts.map((item) => [item._id, item.count]));

  return documents.map((document) =>
    toCategory(document, {
      childCount: childCountByParent.get(document._id?.toHexString() ?? "") ?? 0,
      productCount: productCountBySlug.get(document.slug) ?? 0,
    }),
  );
}

export async function listCatalogBrands(search = "", active = "all") {
  const { brands, products } = await getCollections();
  const query: Record<string, unknown> = {};
  if (search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query["$or"] = [
      { name: { $regex: escaped, $options: "i" } },
      { slug: { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } },
    ];
  }
  if (active === "active") query["active"] = true;
  if (active === "inactive") query["active"] = false;
  const [documents, productCounts] = await Promise.all([
    brands.find(query).sort({ displayOrder: 1, name: 1 }).limit(250).toArray(),
    products
      .aggregate<{ _id: string; count: number }>([
        { $match: { brandId: { $type: "string" } } },
        { $group: { _id: "$brandId", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  const productCountByBrandId = new Map(productCounts.map((item) => [item._id, item.count]));
  return documents.map((document) =>
    toBrand(document, productCountByBrandId.get(document._id?.toHexString() ?? "") ?? 0),
  );
}

export async function createCatalogCategory(input: CategoryInput) {
  const { categories } = await getCollections();
  const parentId = input.parentId ? new ObjectId(input.parentId) : null;
  if (parentId && !(await categories.findOne({ _id: parentId }))) return null;
  const now = new Date();
  const result = await categories.insertOne({ ...input, parentId, createdAt: now, updatedAt: now });
  const document = await categories.findOne({ _id: result.insertedId });
  return document ? toCategory(document, { childCount: 0, productCount: 0 }) : null;
}

export async function updateCatalogCategory(id: string, input: CategoryInput) {
  if (!ObjectId.isValid(id)) return null;
  const { categories } = await getCollections();
  const categoryId = new ObjectId(id);
  const parentId = input.parentId ? new ObjectId(input.parentId) : null;
  if (parentId && parentId.equals(categoryId)) return null;
  if (parentId && !(await categories.findOne({ _id: parentId }))) return null;
  if (parentId) {
    let cursor: ObjectId | null = parentId;
    const visited = new Set<string>();
    while (cursor) {
      const key = cursor.toHexString();
      if (visited.has(key)) return null;
      visited.add(key);
      if (cursor.equals(categoryId)) return null;
      const parent: { parentId?: ObjectId | null } | null = await categories.findOne(
        { _id: cursor },
        { projection: { parentId: 1 } },
      );
      cursor = parent?.parentId ?? null;
    }
  }
  const result = await categories.findOneAndUpdate(
    { _id: categoryId },
    { $set: { ...input, parentId, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) return null;
  const [updated] = await listCatalogCategories(result.slug);
  return updated ?? null;
}

export async function deleteCatalogCategory(id: string) {
  if (!ObjectId.isValid(id)) return { deleted: false, reason: "Category not found." };
  const { categories, products } = await getCollections();
  const categoryId = new ObjectId(id);
  const category = await categories.findOne({ _id: categoryId });
  if (!category) return { deleted: false, reason: "Category not found." };
  const [childCount, productCount] = await Promise.all([
    categories.countDocuments({ parentId: categoryId }),
    products.countDocuments({ category: category.slug }),
  ]);
  if (childCount || productCount) {
    return {
      deleted: false,
      reason: `Reassign ${productCount} product${productCount === 1 ? "" : "s"} and ${childCount} subcategor${childCount === 1 ? "y" : "ies"} before deleting this category.`,
    };
  }
  const result = await categories.deleteOne({ _id: categoryId });
  return { deleted: result.deletedCount === 1, reason: "Category not found." };
}

export async function reorderCatalogCategories(items: Array<{ id: string; displayOrder: number }>) {
  const { categories } = await getCollections();
  const operations = items
    .filter(
      (item) =>
        ObjectId.isValid(item.id) && Number.isInteger(item.displayOrder) && item.displayOrder >= 0,
    )
    .map((item) => ({
      updateOne: {
        filter: { _id: new ObjectId(item.id) },
        update: { $set: { displayOrder: item.displayOrder, updatedAt: new Date() } },
      },
    }));
  if (operations.length) await categories.bulkWrite(operations);
}

export async function createCatalogBrand(input: BrandInput) {
  const { brands } = await getCollections();
  const now = new Date();
  const result = await brands.insertOne({ ...input, createdAt: now, updatedAt: now });
  const document = await brands.findOne({ _id: result.insertedId });
  return document ? toBrand(document, 0) : null;
}

export async function updateCatalogBrand(id: string, input: BrandInput) {
  if (!ObjectId.isValid(id)) return null;
  const { brands, products } = await getCollections();
  const result = await brands.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) return null;
  const productCount = await products.countDocuments({ brandId: id });
  return toBrand(result, productCount);
}

export async function deleteCatalogBrand(id: string) {
  if (!ObjectId.isValid(id)) return { deleted: false, reason: "Brand not found." };
  const { brands, products } = await getCollections();
  const brandId = new ObjectId(id);
  const brand = await brands.findOne({ _id: brandId });
  if (!brand) return { deleted: false, reason: "Brand not found." };
  const productCount = await products.countDocuments({ brandId: id });
  if (productCount) {
    return {
      deleted: false,
      reason: `Reassign ${productCount} product${productCount === 1 ? "" : "s"} before deleting this brand.`,
    };
  }
  const result = await brands.deleteOne({ _id: brandId });
  return { deleted: result.deletedCount === 1, reason: "Brand not found." };
}

export async function seedStarterCategories() {
  const { categories } = await getCollections();
  const now = new Date();
  let imported = 0;
  for (const category of starterCategories) {
    const result = await categories.updateOne(
      { slug: category.slug },
      {
        $setOnInsert: {
          name: category.name,
          slug: category.slug,
          parentId: null,
          description: category.blurb,
          image: category.image,
          displayOrder: Number.parseInt(category.index, 10),
          published: true,
          featured: true,
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
