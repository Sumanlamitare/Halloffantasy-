import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getCredentialsKey } from "@/lib/env";
import type { EspnCredentials } from "@/lib/espn/client";
import { getCollections } from "@/lib/db/collections";

/**
 * ESPN session cookies are encrypted (AES-256-GCM) before being written to
 * MongoDB, live only for the duration of an import (TTL), and are deleted as
 * soon as the import finishes. They are never returned to the browser.
 */

const CREDENTIAL_TTL_MS = 6 * 60 * 60 * 1000;

export class CredentialsNotConfiguredError extends Error {
  constructor() {
    super(
      "Private leagues are not enabled on this server (ESPN_CREDENTIALS_KEY is not set).",
    );
  }
}

export async function saveImportCredentials(
  importId: string,
  creds: EspnCredentials,
): Promise<void> {
  const key = getCredentialsKey();
  if (!key) throw new CredentialsNotConfiguredError();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(importId));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(creds), "utf8"),
    cipher.final(),
  ]);
  const { importCredentials } = await getCollections();
  await importCredentials.replaceOne(
    { _id: importId },
    {
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
      expiresAt: new Date(Date.now() + CREDENTIAL_TTL_MS),
    },
    { upsert: true },
  );
}

/** Returns null when no credentials are stored (public league) or they expired. */
export async function loadImportCredentials(
  importId: string,
): Promise<EspnCredentials | null> {
  const { importCredentials } = await getCollections();
  const doc = await importCredentials.findOne({ _id: importId });
  if (!doc || doc.expiresAt.getTime() < Date.now()) return null;
  const key = getCredentialsKey();
  if (!key) throw new CredentialsNotConfiguredError();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(doc.iv, "base64"),
  );
  decipher.setAAD(Buffer.from(importId));
  decipher.setAuthTag(Buffer.from(doc.tag, "base64"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(doc.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plain) as EspnCredentials;
}

export async function deleteImportCredentials(importId: string): Promise<void> {
  const { importCredentials } = await getCollections();
  await importCredentials.deleteOne({ _id: importId });
}
