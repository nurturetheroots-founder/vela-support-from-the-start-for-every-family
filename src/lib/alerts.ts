import { supabase } from "@/integrations/supabase/client";

export type Escalation = {
  id: string;
  triggered_at: string;
  trigger_type: string;
  trigger_detail: string | null;
  status: string;
  resolved_at: string | null;
};

export type DerivedSignal = {
  id: string;
  signal_type: string;
  computed_at: string;
  rule_version: string;
};

/** Warm, plain-language copy for each alert type. */
export const alertCopy: Record<string, { title: string; body: string }> = {
  heavy_days: {
    title: "A few heavy days in a row",
    body: "Your last three check-ins have felt low. That pattern is worth naming out loud — not because something is wrong with you, but because support helps.",
  },
  epds_score: {
    title: "Your recent screening",
    body: "Your last mood screening came back higher than usual. A conversation with someone trained in perinatal mental health can help you sort through it.",
  },
};

export const signalCopy: Record<string, string> = {
  "3plus_heavy_days": "Three or more heavy days noticed",
  epds_elevated: "Screening score above the gentle threshold",
};

export function alertTitle(type: string) {
  return alertCopy[type]?.title ?? "Something we noticed";
}

export function alertBody(type: string) {
  return alertCopy[type]?.body ?? "We noticed a pattern in your recent check-ins.";
}

export async function fetchOpenEscalations(): Promise<Escalation[]> {
  const { data, error } = await supabase
    .from("escalations")
    .select("id, triggered_at, trigger_type, trigger_detail, status, resolved_at")
    .order("triggered_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Escalation[];
}

export async function fetchSignals(): Promise<DerivedSignal[]> {
  const { data, error } = await supabase
    .from("derived_signals")
    .select("id, signal_type, computed_at, rule_version")
    .order("computed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DerivedSignal[];
}

export async function acknowledgeEscalation(id: string) {
  const { error } = await supabase
    .from("escalations")
    .update({ status: "acknowledged", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
