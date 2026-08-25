import { supabase } from "@/integrations/supabase/client";
import type { Checkin, Insurance, Profile, Stage } from "@/lib/store";

export interface ParentRow {
  parent_id: string;
  display_name: string;
  stage: Stage | null;
  due_date: string | null;
  birth_date: string | null;
  focuses: string[];
  zip: string | null;
  insurance: string | null;
  consented_at: string | null;
}

export interface CheckinRow {
  checkin_id: string;
  mood_score: number | null;
  sleep_quality: Checkin["sleep"] | null;
  feeding_status: Checkin["feeding"] | null;
  overall_score: number | null;
  parent_health_notes: string | null;
  requires_support_flag: boolean;
  logged_date: string;
}

export async function fetchParent(userId: string) {
  const { data, error } = await supabase
    .from("parents")
    .select("*")
    .eq("parent_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as ParentRow | null) ?? null;
}

export async function fetchCheckins(userId: string) {
  const { data, error } = await supabase
    .from("parent_daily_checkins")
    .select("*")
    .eq("parent_id", userId)
    .order("logged_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CheckinRow[];
}

export async function saveParent(userId: string, p: Partial<Profile> & { consented?: boolean }) {
  const { error } = await supabase.from("parents").upsert(
    {
      parent_id: userId,
      display_name: p.name ?? "",
      stage: p.stage ?? null,
      due_date: p.dueDate ?? null,
      birth_date: p.birthDate ?? null,
      focuses: p.focuses ?? [],
      zip: p.zip ?? null,
      insurance: p.insurance ?? null,
      ...(p.consented ? { consented_at: new Date().toISOString() } : {}),
    },
    { onConflict: "parent_id" },
  );
  if (error) throw error;
}

export async function saveCheckin(userId: string, c: Checkin) {
  const { error } = await supabase.from("parent_daily_checkins").upsert(
    {
      parent_id: userId,
      mood_score: c.mood,
      sleep_quality: c.sleep,
      feeding_status: c.feeding,
      overall_score: c.overall,
      parent_health_notes: c.note ?? null,
      requires_support_flag: !!c.flagged,
      logged_date: c.date,
    },
    { onConflict: "parent_id,logged_date" },
  );
  if (error) throw error;
}

export function rowToProfile(row: ParentRow): Partial<Profile> {
  return {
    name: row.display_name ?? "",
    stage: row.stage ?? undefined,
    dueDate: row.due_date ?? undefined,
    birthDate: row.birth_date ?? undefined,
    focuses: row.focuses ?? [],
    zip: row.zip ?? "",
    insurance: (row.insurance as Insurance) ?? "Private",
    onboarded: !!row.consented_at,
  };
}

export function rowToCheckin(row: CheckinRow): Checkin {
  return {
    date: row.logged_date,
    mood: row.mood_score ?? 3,
    sleep: row.sleep_quality ?? "fair",
    feeding: row.feeding_status ?? "okay",
    overall: row.overall_score ?? 3,
    note: row.parent_health_notes ?? undefined,
    flagged: row.requires_support_flag,
  };
}
