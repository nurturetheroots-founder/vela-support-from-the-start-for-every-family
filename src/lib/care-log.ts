import { supabase } from "@/integrations/supabase/client";

export type CareEventType = "feed" | "diaper" | "sleep" | "observation";

export interface FeedPayload {
  type: "bottle" | "nursing";
  amount_oz?: number;
  duration_minutes?: number;
  side?: "left" | "right" | "both";
  notes?: string;
}
export interface DiaperPayload {
  condition: "wet" | "dirty" | "both";
  notes?: string;
}
export interface SleepPayload {
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  soothing_technique?: string;
}
export interface ObservationPayload {
  category: "developmental" | "soothing" | "maternal_check";
  note: string;
}

export type CarePayload = FeedPayload | DiaperPayload | SleepPayload | ObservationPayload;

export interface CareLog {
  id: string;
  baby_id: string;
  family_id: string;
  created_by: string;
  timestamp: string;
  event_type: CareEventType;
  /** Shift-floor detail only. Maternal wellness data never belongs here. */
  operational_metrics: CarePayload;
  content: string | null;
}

export interface ShiftMetrics {
  total_oz: number;
  total_nursing_mins: number;
  wet_diapers: number;
  dirty_diapers: number;
  longest_sleep_stretch_mins: number;
  feed_count: number;
}

export interface ShiftHandover {
  id: string;
  baby_id: string;
  caregiver_id: string;
  shift_start: string;
  shift_end: string;
  family_id: string;
  summary_metrics: ShiftMetrics;
  notes: string | null;
  status: "draft" | "published";
  created_at: string;
}

/**
 * Returns the baby record for this shift. Parents get their own record,
 * created on first use. Invited caregivers get the baby of the family that
 * invited them, and never create one.
 */
let babyPromise: Promise<{ id: string; name: string }> | null = null;

/** Call when the signed-in person or their family changes (sign in, invite redeemed). */
export function resetBabyCache() {
  babyPromise = null;
}

export function ensureBaby(name = "Baby"): Promise<{ id: string; name: string }> {
  // Two components can ask at once on first load — share one round trip so we
  // never create duplicate baby records.
  if (!babyPromise) {
    babyPromise = resolveBaby(name).catch((err) => {
      babyPromise = null;
      throw err;
    });
  }
  return babyPromise;
}

/** Read-only lookup for views that should never create a record. */
export async function findBaby(): Promise<{ id: string; name: string } | null> {
  const family = await familyBaby();
  if (family !== undefined) return family;
  const { data, error } = await supabase
    .from("babies")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as { id: string; name: string } | undefined) ?? null;
}

const FAMILY_KEY = "vela.care.family";

/** The family a multi-client caregiver is currently working a shift for. */
export function getSelectedFamilyId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(FAMILY_KEY);
}

export function setSelectedFamilyId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(FAMILY_KEY, id);
  else window.localStorage.removeItem(FAMILY_KEY);
  resetBabyCache();
}

/** Every family this caregiver has been invited into. */
export async function listCaregiverFamilies(): Promise<{ id: string; name: string }[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];
  const { data: links } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("profile_id", uid)
    .eq("role", "caregiver");
  const ids = (links ?? []).map((l) => l.family_id as string);
  if (ids.length === 0) return [];
  const { data: babies } = await supabase.from("babies").select("id, name, parent_id").in("parent_id", ids);
  return ids.map((id) => ({
    id,
    name:
      (babies ?? []).find((b) => (b as { parent_id: string }).parent_id === id)?.name ??
      `Family ${id.slice(0, 4).toUpperCase()}`,
  }));
}

/**
 * For invited caregivers: the baby of the family they support. Honours the
 * family picked in the switcher when they support more than one.
 * Returns `undefined` when the signed-in person is not a caregiver.
 */
async function familyBaby(): Promise<{ id: string; name: string } | null | undefined> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return undefined;

  const { data: links } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("profile_id", uid)
    .eq("role", "caregiver");

  const ids = (links ?? []).map((l) => l.family_id as string);
  if (ids.length === 0) return undefined;
  const selected = getSelectedFamilyId();
  const familyId = selected && ids.includes(selected) ? selected : ids[0];

  const { data, error } = await supabase
    .from("babies")
    .select("id, name")
    .eq("parent_id", familyId as string)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  return (data?.[0] as { id: string; name: string } | undefined) ?? null;
}


async function resolveBaby(name: string): Promise<{ id: string; name: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;

  const { data: links } = uid
    ? await supabase
        .from("family_members")
        .select("family_id")
        .eq("profile_id", uid)
        .eq("role", "caregiver")
    : { data: null };

  const ids = (links ?? []).map((l) => l.family_id as string);

  // Invited caregivers always work inside a family that invited them.
  if (ids.length > 0) {
    const family = await familyBaby();
    if (family) return family;
    const selected = getSelectedFamilyId();
    const familyId = selected && ids.includes(selected) ? selected : ids[0];
    const { data: madeForFamily, error: madeError } = await supabase
      .from("babies")
      .insert({ name, parent_id: familyId as string })
      .select("id, name")
      .single();
    if (madeError) throw madeError;
    return madeForFamily as { id: string; name: string };
  }


  const { data, error } = await supabase
    .from("babies")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  if (data && data.length > 0) return data[0] as { id: string; name: string };

  const { data: created, error: insertError } = await supabase
    .from("babies")
    .insert({ name })
    .select("id, name")
    .single();
  if (insertError) throw insertError;
  return created as { id: string; name: string };
}


function toCareLog(row: Record<string, unknown>): CareLog {
  return {
    ...(row as unknown as CareLog),
    operational_metrics: row['payload'] as CarePayload,
  };
}

export async function fetchCareLogs(babyId: string, sinceIso: string): Promise<CareLog[]> {
  const { data, error } = await supabase
    .from("care_logs")
    .select("*")
    .eq("baby_id", babyId)
    .gte("timestamp", sinceIso)
    .order("timestamp", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => toCareLog(row as unknown as Record<string, unknown>));
}

export async function addCareLog(
  babyId: string,
  eventType: CareEventType,
  payload: CarePayload,
  timestampIso?: string,
) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("care_logs")
    .insert({
      baby_id: babyId,
      event_type: eventType,
      payload: payload as never,
      logged_by: auth.user?.id as string,
      ...(timestampIso ? { timestamp: timestampIso } : {}),
    })

    .select("*")
    .single();
  if (error) throw error;
  return toCareLog(data as unknown as Record<string, unknown>);
}

export async function updateCareLog(id: string, payload: CarePayload) {
  const { error } = await supabase
    .from("care_logs")
    .update({ payload: payload as never })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCareLog(id: string) {
  const { error } = await supabase.from("care_logs").delete().eq("id", id);
  if (error) throw error;
}

export function computeMetrics(logs: CareLog[]): ShiftMetrics {
  const metrics: ShiftMetrics = {
    total_oz: 0,
    total_nursing_mins: 0,
    wet_diapers: 0,
    dirty_diapers: 0,
    longest_sleep_stretch_mins: 0,
    feed_count: 0,
  };
  for (const log of logs) {
    if (log.event_type === "feed") {
      const p = log.operational_metrics as FeedPayload;
      metrics.feed_count += 1;
      if (p.amount_oz) metrics.total_oz += p.amount_oz;
      if (p.duration_minutes) metrics.total_nursing_mins += p.duration_minutes;
    } else if (log.event_type === "diaper") {
      const p = log.operational_metrics as DiaperPayload;
      if (p.condition === "wet" || p.condition === "both") metrics.wet_diapers += 1;
      if (p.condition === "dirty" || p.condition === "both") metrics.dirty_diapers += 1;
    } else if (log.event_type === "sleep") {
      const p = log.operational_metrics as SleepPayload;
      const mins =
        p.duration_minutes ??
        (p.end_time && p.start_time
          ? Math.round((new Date(p.end_time).getTime() - new Date(p.start_time).getTime()) / 60000)
          : 0);
      if (mins > metrics.longest_sleep_stretch_mins) metrics.longest_sleep_stretch_mins = mins;
    }
  }
  metrics.total_oz = Math.round(metrics.total_oz * 10) / 10;
  return metrics;
}

export function formatDuration(mins: number) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export async function saveHandover(input: {
  babyId: string;
  shiftStart: string;
  shiftEnd: string;
  metrics: ShiftMetrics;
  notes: string;
  status: "draft" | "published";
}) {
  const { data, error } = await supabase
    .from("shift_handovers")
    .insert({
      baby_id: input.babyId,
      shift_start: input.shiftStart,
      shift_end: input.shiftEnd,
      summary_metrics: input.metrics as never,
      caregiver_notes: input.notes,
      status: input.status,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toHandover(data as unknown as Record<string, unknown>);
}

function toHandover(row: Record<string, unknown>): ShiftHandover {
  return {
    ...(row as unknown as ShiftHandover),
    notes: (row['caregiver_notes'] as string | null) ?? null,
  };
}

export async function fetchLatestPublishedHandover(babyId: string): Promise<ShiftHandover | null> {
  const { data, error } = await supabase
    .from("shift_handovers")
    .select("*")
    .eq("baby_id", babyId)
    .eq("status", "published")
    .order("shift_end", { ascending: false })
    .limit(1);
  if (error) throw error;
  const row = (data ?? [])[0];
  return row ? toHandover(row as unknown as Record<string, unknown>) : null;
}

/** Warm, share-ready plain text version of a shift summary. */
export function formatSummaryText(m: ShiftMetrics, notes: string, babyName = "Baby") {
  const lines = [
    `${babyName}'s night with your care team`,
    "",
    `Feeds: ${m.feed_count}${m.total_oz ? ` · ${m.total_oz} oz bottle` : ""}${
      m.total_nursing_mins ? ` · ${m.total_nursing_mins} min nursing` : ""
    }`,
    `Diapers: ${m.wet_diapers} wet · ${m.dirty_diapers} dirty`,
    `Longest sleep stretch: ${formatDuration(m.longest_sleep_stretch_mins)}`,
  ];
  if (notes.trim()) {
    lines.push("", "Notes from your caregiver:", notes.trim());
  }
  lines.push("", "Shared with love through Vela.");
  return lines.join("\n");
}
