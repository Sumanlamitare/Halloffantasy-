import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getCredentialsKey } from "@/lib/env";
import type { EspnCredentials } from "@/lib/espn/client";
import { getCollections } from "@/lib/db/collections";

/**
 * ESPN session cookies are encrypted (AES-256-GCM, ESPN_CREDENTIALS_KEY)
 * before being written to MongoDB and are never returned to the browser.
 *
 * - Import credentials live only while an import runs (6-hour TTL) and are
 *   deleted when it finishes.
 * - League credentials are kept only for leagues whose commissioner opted in
 *   to automatic updates, and are deleted if they opt out.
 */

const CREDENTIAL_TTL_MS = 6 * 60 * 60 * 1000;

export class CredentialsNotConfiguredError extends Error {
  constructor() {
    super("Private leagues are not enabled on this server (ESPN_CREDENTIALS_KEY is not set).");
  }
}

interface Sealed {
  iv: string;
  tag: string;
  ciphertext: string;
}

function seal(creds: EspnCredentials, aad: string): Sealed {
  const key = getCredentialsKey();
  if (!key) throw new CredentialsNotConfiguredError();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(creds), "utf8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function open(doc: Sealed, aad: string): EspnCredentials {
  const key = getCredentialsKey();
  if (!key) throw new CredentialsNotConfiguredError();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(doc.iv, "base64"));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(doc.tag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(doc.ciphertext, "base64")), decipher.final()]).toString(
    "utf8",
  );
  return JSON.parse(plain) as EspnCredentials;
}

/* Import (temporary) ---------------------------------------------------- */

export async function saveImportCredentials(importId: string, creds: EspnCredentials): Promise<void> {
  const { importCredentials } = await getCollections();
  await importCredentials.replaceOne(
    { _id: importId },
    { ...seal(creds, importId), expiresAt: new Date(Date.now() + CREDENTIAL_TTL_MS) },
    { upsert: true },
  );
}

/** Returns null when no credentials are stored (public league) or they expired. */
export async function loadImportCredentials(importId: string): Promise<EspnCredentials | null> {
  const { importCredentials } = await getCollections();
  const doc = await importCredentials.findOne({ _id: importId });
  if (!doc || doc.expiresAt.getTime() < Date.now()) return null;
  return open(doc, importId);
}

export async function deleteImportCredentials(importId: string): Promise<void> {
  const { importCredentials } = await getCollections();
  await importCredentials.deleteOne({ _id: importId });
}

/* League (auto-update opt-in) ------------------------------------------- */

const leagueAad = (leagueId: string) => `league:${leagueId}`;

export async function saveLeagueCredentials(leagueId: string, creds: EspnCredentials): Promise<void> {
  const { leagueCredentials } = await getCollections();
  await leagueCredentials.replaceOne(
    { _id: leagueId },
    { ...seal(creds, leagueAad(leagueId)), updatedAt: new Date() },
    { upsert: true },
  );
}

export async function loadLeagueCredentials(leagueId: string): Promise<EspnCredentials | null> {
  const { leagueCredentials } = await getCollections();
  const doc = await leagueCredentials.findOne({ _id: leagueId });
  return doc ? open(doc, leagueAad(leagueId)) : null;
}

export async function deleteLeagueCredentials(leagueId: string): Promise<void> {
  const { leagueCredentials } = await getCollections();
  await leagueCredentials.deleteOne({ _id: leagueId });
}
