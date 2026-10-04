import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, type Db } from "mongodb";
import { getMongoDbName, getMongoUri } from "@/lib/env";

type MongoGlobal = typeof globalThis & {
  _hofMongoClient?: Promise<MongoClient>;
};

const g = globalThis as MongoGlobal;

/**
 * Reuses a single MongoClient per server instance (and across hot reloads in
 * development) so serverless invocations don't open a new pool every time.
 */
function getClient(): Promise<MongoClient> {
  if (!g._hofMongoClient) {
    const client = new MongoClient(getMongoUri(), {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });
    // On Vercel, lets idle pooled connections close cleanly before a function
    // instance is suspended. No-op elsewhere.
    attachDatabasePool(client);
    g._hofMongoClient = client.connect().catch((err) => {
      g._hofMongoClient = undefined;
      throw err;
    });
  }
  return g._hofMongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(getMongoDbName());
}
