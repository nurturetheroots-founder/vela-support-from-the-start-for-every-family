import { supabase } from "@/integrations/supabase/client";
import type { ScreeningResult } from "@/lib/store";

/**
 * EPDS screenings live in `epds_screenings`, which is under absolute isolation:
 * the owning parent alone can read or write a row, and service_role is revoked
 * outright because it carries BYPASSRLS. See
 * docs/architecture/0001-private-data-isolation.md.
 *
 * That isolation is why this file casts instead of using the generated types.
 * Supabase generates types by introspecting as a role that can no longer see
 * the table, so it is absent from Database["public"]["Tables"] — the table's
 * invisibility to tooling is the lockdown working, not a schema drift. Keep the
 * casts narrow and local to this module rather than widening them elsewhere.
 */
const TABLE = "epds_screenings";

/** One EPDS item score, 0-3, keyed q1..q10 — the shape the server trigger reads. */
export type ItemScores = Record<string, number>;

/**
 * The server derives `total_score` and, critically, `q10_emergency_state` from
 * these values in a BEFORE trigger. A client cannot suppress the self-harm flag
 * by posting `false` alongside a non-zero item 10, so we deliberately send only
 * the answers and let the database decide.
 *
 * `trigger_week` rides along inside the same object because the trigger reads
 * q1..q10 by name and ignores everything else. It is what `nextScreeningDue`
 * needs to know a milestone is already done, and it saves a schema change.
 */
export function buildScores(itemScores: number[], triggerWeek: number): ItemScores {
  const scores: ItemScores = {};
  itemScores.forEach((value, i) => {
    scores["q" + (i + 1)] = value;
  });
  scores["trigger_week"] = triggerWeek;
  return scores;
}

/**
 * Saves one screening. Never throws: a failure here must not interrupt a woman
 * who has just answered ten questions about how she is coping, and must never
 * delay the crisis screen. Returns whether the row landed, so a caller can tell
 * her plainly rather than implying it saved.
 */
export async function saveScreening(scores: ItemScores): Promise<boolean> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return false; // demo mode, or signed out — nothing to attach to
    const { error } = await supabase.from(TABLE as never).insert({ scores } as never);
    return !error;
  } catch {
    return false;
  }
}

/** Reads this parent's screenings back, oldest first. Returns [] on any failure. */
export async function fetchScreenings(): Promise<ScreeningResult[]> {
  try {
    const { data, error } = await supabase
      .from(TABLE as never)
      .select("created_at, scores, total_score")
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return (
      data as unknown as Array<{
        created_at: string;
        scores: ItemScores | null;
        total_score: number | null;
      }>
    ).map(rowToScreening);
  } catch {
    return [];
  }
}

function rowToScreening(row: {
  created_at: string;
  scores: ItemScores | null;
  total_score: number | null;
}): ScreeningResult {
  const scores = row.scores ?? {};
  const responses: number[] = [];
  for (let i = 1; i <= 10; i++) {
    const value = scores["q" + i];
    responses.push(typeof value === "number" ? value : 0);
  }
  return {
    date: row.created_at.slice(0, 10),
    score: typeof row.total_score === "number" ? row.total_score : 0,
    triggerWeek: typeof scores["trigger_week"] === "number" ? scores["trigger_week"] : 0,
    responses,
  };
}
