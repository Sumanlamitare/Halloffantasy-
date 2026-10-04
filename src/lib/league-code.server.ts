import "server-only";
import { randomInt } from "node:crypto";
import { CODE_ALPHABET, CODE_LENGTH, CODE_PREFIX } from "./league-code";

export function generateLeagueCode(): string {
  let body = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    body += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `${CODE_PREFIX}${body}`;
}
