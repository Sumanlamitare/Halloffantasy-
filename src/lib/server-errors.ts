import "server-only";

/** A server setup problem (missing or invalid environment variable). */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Turns setup/database failures into a message the commissioner can act on.
 * Messages name the setting to fix but never include its value.
 * Returns null for errors that aren't recognized.
 */
export function describeServerError(err: unknown): string | null {
  if (err instanceof ConfigError) return err.message;
  const e = err as { name?: string; message?: string; code?: number; codeName?: string } | null;
  const name = e?.name ?? "";
  const msg = e?.message ?? "";

  if (name === "MongoParseError" || /Invalid scheme|URI must include hostname|mongodb\+srv URI/i.test(msg)) {
    return "Database setup error: MONGODB_URI in Vercel isn't a valid MongoDB connection string. Copy it again from Atlas (Connect → Drivers), then redeploy.";
  }
  if (e?.code === 18 || e?.codeName === "AuthenticationFailed" || /bad auth|authentication failed/i.test(msg)) {
    return "Database login failed: the username or password in MONGODB_URI is wrong. Check the database user in Atlas (Database Access), update MONGODB_URI in Vercel, then redeploy.";
  }
  if (/querySrv|ENOTFOUND|getaddrinfo/i.test(msg)) {
    return "Database not found: the cluster address in MONGODB_URI is wrong. Copy the connection string again from Atlas, update it in Vercel, then redeploy.";
  }
  if (
    name === "MongoServerSelectionError" ||
    name === "MongoNetworkError" ||
    name === "MongoNetworkTimeoutError" ||
    name === "MongoTopologyClosedError"
  ) {
    return "Couldn't connect to the database. In MongoDB Atlas → Network Access, add 0.0.0.0/0 (Allow access from anywhere), then try again.";
  }
  return null;
}
