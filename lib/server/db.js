import "server-only";
import { MongoClient, ObjectId } from "mongodb";

// One client per process: reused across hot reloads in development and across
// invocations on warm serverless instances.
const globalForMongo = globalThis;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("MONGODB_URI is not set. Add it to your .env.local file.");
    this.code = "ENODB";
  }
}

export function isDbConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

function clientPromise() {
  if (!isDbConfigured()) throw new DatabaseNotConfiguredError();
  if (!globalForMongo._sireMongo) {
    const client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      appName: "sire-crawler",
    });
    globalForMongo._sireMongo = client.connect().catch((err) => {
      globalForMongo._sireMongo = null;
      throw err;
    });
  }
  return globalForMongo._sireMongo;
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ stripeCustomerId: 1 }, { sparse: true }),
    db.collection("users").createIndex({ createdAt: -1 }),
    db.collection("payments").createIndex({ stripeInvoiceId: 1 }, { unique: true, sparse: true }),
    db.collection("payments").createIndex({ userId: 1, paidAt: -1 }),
    db.collection("quotes").createIndex({ createdAt: -1 }),
    db.collection("quotes").createIndex({ status: 1 }),
    db.collection("audits").createIndex({ userId: 1, finishedAt: -1 }),
  ]);
}

export async function getDb() {
  const client = await clientPromise();
  const db = client.db(process.env.MONGODB_DB || "sire_crawler");
  if (!globalForMongo._sireIndexes) {
    globalForMongo._sireIndexes = ensureIndexes(db).catch((err) => {
      globalForMongo._sireIndexes = null;
      console.error("Failed to create MongoDB indexes", err);
    });
  }
  await globalForMongo._sireIndexes;
  return db;
}

export function toObjectId(id) {
  try {
    return typeof id === "string" && ObjectId.isValid(id) ? new ObjectId(id) : null;
  } catch {
    return null;
  }
}
