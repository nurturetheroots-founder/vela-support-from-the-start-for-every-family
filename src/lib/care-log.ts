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
  logged_by: string;
  timestamp: string;
  event_type: CareEventType;
  payload: CarePayload;
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
  summary_metrics: ShiftMetrics;
  caregiver_notes: string | null;
  status: "draft" | "published";
  created_at: string;
}

/** Returns the caller's baby record, creating one on first use. */
export async function ensureBaby(name = "Baby"): Promise<{ id: string; name: string }> {
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

export async function fetchCareLogs(babyId: string, sinceIso: string): Promise<CareLog[]> {
  const { data, error } = await supabase
    .from("care_logs")
    .select("*")
    .eq("baby_id", babyId)
    .gte("timestamp", sinceIso)
    .order("timestamp", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CareLog[];
}

export async function addCareLog(babyId: string, eventType: CareEventType, payload: CarePayload) {
  const { data, error } = await supabase
    .from("care_logs")
    .insert({ baby_id: babyId, event_type: eventType, payload: payload as never })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as CareLog;
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
      const p = log.payload as FeedPayload;
      metrics.feed_count += 1;
      if (p.amount_oz) metrics.total_oz += p.amount_oz;
      if (p.duration_minutes) metrics.total_nursing_mins += p.duration_minutes;
    } else if (log.event_type === "diaper") {
      const p = log.payload as DiaperPayload;
      if (p.condition === "wet" || p.condition === "both") metrics.wet_diapers += 1;
      if (p.condition === "dirty" || p.condition === "both") metrics.dirty_diapers += 1;
    } else if (log.event_type === "sleep") {
      const p = log.payload as SleepPayload;
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
  return data as unknown as ShiftHandover;
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
  return ((data ?? [])[0] as unknown as ShiftHandover) ?? null;
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
