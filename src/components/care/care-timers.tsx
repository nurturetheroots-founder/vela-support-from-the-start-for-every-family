import { useEffect, useState } from "react";
import { Moon, Milk, Pause, Play, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CareEventType, CarePayload } from "@/lib/care-log";

type Kind = "sleep" | "nursing";

interface TimerState {
  startedAt: string;
  accumulatedMs: number;
  running: boolean;
}

const STORAGE = "vela.care.timers";

function load(): Partial<Record<Kind, TimerState>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE) ?? "{}");
  } catch {
    return {};
  }
}

function elapsedMs(t: TimerState) {
  return t.accumulatedMs + (t.running ? Date.now() - new Date(t.startedAt).getTime() : 0);
}

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function CareTimers({
  onLog,
}: {
  onLog: (type: CareEventType, payload: CarePayload) => Promise<void> | void;
}) {
  const [timers, setTimers] = useState<Partial<Record<Kind, TimerState>>>({});
  const [, tick] = useState(0);

  useEffect(() => setTimers(load()), []);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  function persist(next: Partial<Record<Kind, TimerState>>) {
    setTimers(next);
    try {
      window.localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }

  function toggle(kind: Kind) {
    const t = timers[kind];
    if (!t) {
      persist({ ...timers, [kind]: { startedAt: new Date().toISOString(), accumulatedMs: 0, running: true } });
      return;
    }
    persist({
      ...timers,
      [kind]: t.running
        ? { ...t, running: false, accumulatedMs: elapsedMs(t) }
        : { ...t, running: true, startedAt: new Date().toISOString() },
    });
  }

  async function finish(kind: Kind) {
    const t = timers[kind];
    if (!t) return;
    const mins = Math.max(1, Math.round(elapsedMs(t) / 60000));
    const end = new Date();
    const start = new Date(end.getTime() - mins * 60000);
    const next = { ...timers };
    delete next[kind];
    persist(next);
    if (kind === "sleep") {
      await onLog("sleep", {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration_minutes: mins,
      });
    } else {
      await onLog("feed", { type: "nursing", duration_minutes: mins, side: "both" });
    }
  }

  const config: { kind: Kind; label: string; icon: typeof Moon; tint: string }[] = [
    { kind: "sleep", label: "Sleep", icon: Moon, tint: "text-sage" },
    { kind: "nursing", label: "Nursing", icon: Milk, tint: "text-clay-soft" },
  ];

  return (
    <div className="sticky top-0 z-10 -mx-5 mb-5 bg-night/90 px-5 pb-3 pt-2 backdrop-blur">
      <div className="grid grid-cols-2 gap-3">
        {config.map(({ kind, label, icon: Icon, tint }) => {
          const t = timers[kind];
          const active = Boolean(t);
          return (
            <div
              key={kind}
              className={cn(
                "rounded-3xl px-4 py-3 transition-colors",
                active ? "bg-night-raised/80" : "bg-night-soft/80",
              )}
            >
              <div className="flex items-center gap-2 text-xs text-night-muted">
                <Icon className={cn("h-4 w-4", tint)} />
                {label}
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-night-text">
                {t ? clock(elapsedMs(t)) : "0:00"}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => toggle(kind)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-clay-soft text-sm font-semibold text-night active:opacity-90"
                >
                  {t?.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {t?.running ? "Pause" : t ? "Resume" : "Start"}
                </button>
                {t && (
                  <button
                    type="button"
                    aria-label={`Save ${label.toLowerCase()}`}
                    onClick={() => finish(kind)}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-night-soft text-sage"
                  >
                    <Check className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
