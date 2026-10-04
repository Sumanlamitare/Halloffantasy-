import "server-only";
import { ConfigError } from "@/lib/server-errors";

/**
 * Server-only environment access. Never import this from client components.
 */

export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new ConfigError(
      "Server setup: MONGODB_URI is not set. Add it in Vercel → Settings → Environment Variables, then redeploy.",
    );
  }
  return uri;
}

export function getMongoDbName(): string | undefined {
  // Optional: if unset, the database named in MONGODB_URI is used.
  return process.env.MONGODB_DB || undefined;
}

/**
 * 32-byte key used to encrypt ESPN session cookies (espn_s2 / SWID) while a
 * private-league import is in progress. Accepts base64 or hex.
 * Returns null when not configured (public leagues still work).
 */
export function getCredentialsKey(): Buffer | null {
  const raw = process.env.ESPN_CREDENTIALS_KEY?.trim();
  if (!raw) return null;
  const key = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new ConfigError(
      "Server setup: ESPN_CREDENTIALS_KEY must be a 32-byte key (generate with `openssl rand -base64 32`). Update it in Vercel, then redeploy.",
    );
  }
  return key;
}
