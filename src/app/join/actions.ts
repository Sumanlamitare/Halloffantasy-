"use server";

import { redirect } from "next/navigation";
import { getCollections } from "@/lib/db/collections";
import { normalizeLeagueCode } from "@/lib/league-code";

export interface JoinState {
  error: string | null;
}

const NOT_FOUND = "League not found. Check your code and try again.";

/** Validates a league code on the server and opens that league's Hall. */
export async function joinLeague(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const code = normalizeLeagueCode(String(formData.get("code") ?? ""));
  if (!code) return { error: NOT_FOUND };
  let found = false;
  try {
    const { leagues } = await getCollections();
    found = !!(await leagues.findOne({ code }, { projection: { _id: 1 } }));
  } catch {
    return { error: "We couldn't check that code right now. Please try again." };
  }
  if (!found) return { error: NOT_FOUND };
  redirect(`/hall/${code}`);
}
