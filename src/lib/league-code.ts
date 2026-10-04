/**
 * Hall of Fantasy league access codes: "HOF-" + 6 characters.
 *
 * The alphabet excludes look-alike characters (0/O, 1/I/L) so codes are easy
 * to read and type on a phone. 31^6 ≈ 887 million combinations, generated
 * with a cryptographically secure RNG, so codes are hard to guess.
 *
 * This module is safe to import on the client (validation only); generation
 * uses node:crypto and lives in league-code.server.ts.
 */

export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 6;
export const CODE_PREFIX = "HOF-";

const CODE_RE = new RegExp(`^HOF-[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/** Normalizes user input like " hof 7x92kq " or "7X92KQ" to "HOF-7X92KQ". */
export function normalizeLeagueCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = compact.startsWith("HOF") ? compact.slice(3) : compact;
  const code = `${CODE_PREFIX}${body}`;
  return CODE_RE.test(code) ? code : null;
}
