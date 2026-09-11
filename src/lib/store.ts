import { useSyncExternalStore } from "react";

export type Tier = 0 | 10 | 25 | 50;
export type Insurance = "Medicaid" | "Private" | "Uninsured";
export type Stage = "expecting" | "postpartum";

export interface Checkin {
  date: string; // YYYY-MM-DD
  mood: number; // 1-5
  sleep: "poor" | "fair" | "good";
  feeding: "struggling" | "okay" | "going well";
  overall: number; // 1-5
  note?: string;
  flagged?: boolean;
}

export interface ScreeningResult {
  date: string;
  score: number;
  triggerWeek: number;
  responses: number[];
}

export interface InfantStateLog {
  id: string;
  date: string; // YYYY-MM-DD
  at: string; // ISO timestamp
  stateId: string;
  stateLabel: string;
}

export interface Profile {
  name: string;
  stage?: Stage;
  dueDate?: string;
  birthDate?: string;
  focuses: string[];
  zip: string;
  insurance: Insurance;
  tier: Tier;
  onboarded: boolean;
  bookmarks: number[]; // week numbers
  completedModules: number[];
}

export interface State {
  profile: Profile;
  checkins: Checkin[];
  screenings: ScreeningResult[];
  infantStates: InfantStateLog[];
}

const KEY = "vela.state.v1";

const initial: State = {
  profile: {
    name: "",
    stage: undefined,
    focuses: [],
    zip: "",
    insurance: "Private",
    tier: 10,
    onboarded: false,
    bookmarks: [],
    completedModules: [],
  },
  checkins: [],
  screenings: [],
  infantStates: [],
};

function load(): State {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      ...initial,
      ...parsed,
      profile: { ...initial.profile, ...(parsed.profile ?? {}) },
      infantStates: parsed.infantStates ?? [],
    };
  } catch {
    return initial;
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function setProfile(p: Partial<Profile>) {
  state = { ...state, profile: { ...state.profile, ...p } };
  emit();
}

export function addCheckin(c: Checkin) {
  // flag if 3+ consecutive low-mood (mood <=2)
  const recent = [...state.checkins, c].slice(-3);
  const flagged = recent.length === 3 && recent.every((x) => x.mood <= 2);
  const withFlag = { ...c, flagged };
  state = { ...state, checkins: [...state.checkins, withFlag] };
  emit();
  return withFlag;
}

export function addScreening(s: ScreeningResult) {
  state = { ...state, screenings: [...state.screenings, s] };
  emit();
}

export function addInfantStateLog(stateId: string, stateLabel: string) {
  const now = new Date();
  const log: InfantStateLog = {
    id: `${now.getTime()}-${stateId}`,
    date: now.toISOString().slice(0, 10),
    at: now.toISOString(),
    stateId,
    stateLabel,
  };
  state = { ...state, infantStates: [...state.infantStates, log] };
  emit();
  return log;
}

export function toggleBookmark(week: number) {
  const b = state.profile.bookmarks.includes(week)
    ? state.profile.bookmarks.filter((w) => w !== week)
    : [...state.profile.bookmarks, week];
  setProfile({ bookmarks: b });
}

export function markModuleComplete(week: number) {
  if (state.profile.completedModules.includes(week)) return;
  setProfile({ completedModules: [...state.profile.completedModules, week] });
}

export function resetAll() {
  state = initial;
  emit();
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
    () => selector(initial),
  );
}

// Helpers
export function weekNumber(p: Profile): { label: string; week: number } {
  const now = new Date();
  if (p.birthDate) {
    const birth = new Date(p.birthDate);
    const days = Math.floor((now.getTime() - birth.getTime()) / 86400000);
    const week = Math.max(1, Math.floor(days / 7) + 1);
    return { label: `Week ${week}`, week };
  }
  return { label: "Welcome", week: 0 };
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function nextScreeningDue(
  p: Profile,
  screenings: ScreeningResult[],
): { week: number; daysAway: number } | null {
  if (!p.birthDate) return null;
  const milestones = [2, 6, 13, 17]; // weeks: 2wk, 6wk, 3mo (~13), 4mo (~17)
  const { week } = weekNumber(p);
  for (const m of milestones) {
    const done = screenings.some((s) => s.triggerWeek === m);
    if (!done && week <= m + 1) {
      return { week: m, daysAway: (m - week) * 7 };
    }
  }
  return null;
}
