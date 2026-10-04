import "server-only";

/**
 * Server-only environment access. Never import this from client components.
 */

export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured on the server.");
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
    throw new Error("ESPN_CREDENTIALS_KEY must decode to exactly 32 bytes.");
  }
  return key;
}
