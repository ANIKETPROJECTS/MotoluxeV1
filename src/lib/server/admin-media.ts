import "@tanstack/react-start/server-only";

import { ObjectId } from "mongodb";
import { getMotoluxeDatabase, MOTOLUXE_COLLECTIONS } from "@/lib/server/mongodb";

export type MediaKind = "product" | "category" | "brand" | "review";

type MediaDocument = {
  _id: ObjectId;
  secureUrl: string;
  publicId: string;
  assetId: string;
  folder: string;
  kind: MediaKind;
  section: string;
  originalName: string;
  mimeType: string;
  bytes: number;
  createdAt: Date;
};

function mediaCollection() {
  return getMotoluxeDatabase().then(({ db }) =>
    db.collection<MediaDocument>(MOTOLUXE_COLLECTIONS.mediaAssets),
  );
}

function toMediaAsset(document: MediaDocument) {
  return {
    id: document._id.toHexString(),
    secureUrl: document.secureUrl,
    publicId: document.publicId,
    assetId: document.assetId,
    folder: document.folder,
    kind: document.kind,
    section: document.section,
    originalName: document.originalName,
    mimeType: document.mimeType,
    bytes: document.bytes,
    createdAt: document.createdAt.toISOString(),
  };
}

export async function recordMediaAsset(input: Omit<MediaDocument, "_id" | "createdAt">) {
  const collection = await mediaCollection();
  const document: MediaDocument = {
    _id: new ObjectId(),
    ...input,
    createdAt: new Date(),
  };
  await collection.insertOne(document);
  return toMediaAsset(document);
}

export async function listMediaAssets(options: { query?: string; kind?: string }) {
  const collection = await mediaCollection();
  const query = options.query?.trim();
  const filter: Record<string, unknown> = {};
  if (options.kind && ["product", "category", "brand", "review"].includes(options.kind)) {
    filter.kind = options.kind;
  }
  if (query) {
    filter.$or = [
      { originalName: { $regex: query, $options: "i" } },
      { folder: { $regex: query, $options: "i" } },
      { publicId: { $regex: query, $options: "i" } },
    ];
  }
  const documents = await collection.find(filter).sort({ createdAt: -1 }).limit(200).toArray();
  return documents.map(toMediaAsset);
}

export async function removeMediaAsset(id: string) {
  if (!ObjectId.isValid(id)) return { error: "That media asset could not be found." as const };
  const collection = await mediaCollection();
  const document = await collection.findOne({ _id: new ObjectId(id) });
  if (!document) return { error: "That media asset could not be found." as const };
  await collection.deleteOne({ _id: document._id });
  return { asset: toMediaAsset(document) };
}
