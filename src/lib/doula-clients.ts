import { supabase } from "@/integrations/supabase/client";
import { computeMetrics, type CareLog, type ShiftMetrics } from "@/lib/care-log";

export interface ClientOverview {
  familyId: string;
  babyId: string | null;
  babyName: string;
  metrics: ShiftMetrics;
  logCount: number;
  lastLoggedAt: string | null;
}

function toCareLog(row: Record<string, unknown>): CareLog {
  return {
    ...(row as unknown as CareLog),
    operational_metrics: row['payload'] as CareLog["operational_metrics"],
  };
}

/**
 * One row per family this caregiver supports, with the last 24 hours of shift
 * activity. Maternal check-ins and screenings are deliberately absent: they
 * stay with the parent unless the parent shares a summary themselves.
 */
export async function listClientOverviews(): Promise<ClientOverview[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];

  const { data: links, error: linkError } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", uid)
    .eq("role", "caregiver");
  if (linkError) throw linkError;

  const familyIds = (links ?? []).map((l) => l.family_id as string);
  if (familyIds.length === 0) return [];

  const { data: babies, error: babyError } = await supabase
    .from("babies")
    .select("id, name, parent_id")
    .in("parent_id", familyIds);
  if (babyError) throw babyError;

  const babyRows = (babies ?? []) as { id: string; name: string; parent_id: string }[];
  const babyIds = babyRows.map((b) => b.id);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let logs: CareLog[] = [];
  if (babyIds.length > 0) {
    const { data, error } = await supabase
      .from("care_logs")
      .select("*")
      .in("baby_id", babyIds)
      .gte("timestamp", since)
      .order("timestamp", { ascending: false });
    if (error) throw error;
    logs = (data ?? []).map((row) => toCareLog(row as unknown as Record<string, unknown>));
  }

  return familyIds.map((familyId) => {
    const baby = babyRows.find((b) => b.parent_id === familyId) ?? null;
    const mine = baby ? logs.filter((l) => l.baby_id === baby.id) : [];
    return {
      familyId,
      babyId: baby?.id ?? null,
      babyName: baby?.name ?? `Family ${familyId.slice(0, 4).toUpperCase()}`,
      metrics: computeMetrics(mine),
      logCount: mine.length,
      lastLoggedAt: mine[0]?.timestamp ?? null,
    };
  });
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "No entries in the last 24 hours";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr ago`;
}
