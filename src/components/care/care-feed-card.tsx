import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Moon, ArrowRight } from "lucide-react";
import {
  computeMetrics,
  findBaby,
  fetchCareLogs,
  formatDuration,
  type CareLog,
} from "@/lib/care-log";
import { describeLog } from "@/components/care/shift-timeline";

function time(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Parent-facing view of what the care team has logged in the last 14 hours,
 * so a shift shows up on the dashboard without waiting for a handover note.
 */
export function CareFeedCard() {
  const [logs, setLogs] = useState<CareLog[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const baby = await findBaby();
        if (!baby) {
          if (!cancelled) setLogs([]);
          return;
        }
        const since = new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString();
        const rows = await fetchCareLogs(baby.id, since);
        if (!cancelled) setLogs(rows);
      } catch {
        if (!cancelled) setLogs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const m = logs ? computeMetrics(logs) : null;

  return (
    <section className="rounded-3xl bg-card/80 border border-border/50 p-6">
      <h2 className="font-serif text-xl flex items-center gap-2">
        <Moon className="h-5 w-5 text-primary" /> Care so far
      </h2>

      {logs === null ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Looking in on the last shift…
        </p>
      ) : logs.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Nothing logged yet. When your caregiver starts a shift, feeds, diapers and sleep will show
          up here.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {m!.feed_count} {m!.feed_count === 1 ? "feed" : "feeds"} · {m!.wet_diapers} wet ·{" "}
            {m!.dirty_diapers} dirty · longest sleep {formatDuration(m!.longest_sleep_stretch_mins)}
          </p>
          <ul className="mt-4 space-y-2">
            {logs.slice(0, 4).map((log) => (
              <li key={log.id} className="flex items-baseline gap-3 text-sm">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">
                  {time(log.timestamp)}
                </span>
                <span className="leading-relaxed">{describeLog(log)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link
        to="/care-summary"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        See the full night <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
