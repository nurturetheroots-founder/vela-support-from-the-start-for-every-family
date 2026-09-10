import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Moon, ArrowRight } from "lucide-react";
import { QuickLogBar } from "@/components/care/quick-log-bar";
import { ShiftTimeline } from "@/components/care/shift-timeline";
import { HandoverGenerator } from "@/components/care/handover-generator";
import { CareTimers } from "@/components/care/care-timers";
import { MorningHandoverCard } from "@/components/care/morning-handover";
import {
  addCareLog,
  computeMetrics,
  deleteCareLog,
  ensureBaby,
  fetchCareLogs,
  fetchLatestPublishedHandover,
  updateCareLog,
  type CareEventType,
  type CareLog,
  type CarePayload,
  type ShiftHandover,
  type ObservationPayload,
  type FeedPayload,
  type SleepPayload,
  type DiaperPayload,
} from "@/lib/care-log";
import { captureEvent } from "@/lib/analytics-utils";
import { useAuth } from "@/hooks/use-auth";
import { isGuest } from "@/lib/guest";
import { NeedsAccount } from "@/components/needs-account";

function shiftStartIso() {
  // Current shift window: the last 14 hours of activity.
  return new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString();
}

export function CareTracker({ showParentLink = true }: { showParentLink?: boolean } = {}) {
  const { session, loading: isAuthLoading } = useAuth();
  const [guest, setGuest] = useState(false);
  const [baby, setBaby] = useState<{ id: string; name: string } | null>(null);
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [since] = useState(shiftStartIso);
  const [handover, setHandover] = useState<ShiftHandover | null>(null);

  useEffect(() => {
    setGuest(isGuest());
  }, []);

  // Wait for the Supabase session to finish hydrating before fetching, so a
  // not-yet-authorized request never surfaces a false "check your connection"
  // toast. Works for parents, invited caregivers, and guest/demo sessions.
  // Demo mode has no Supabase session, so every call the tracker makes is
  // refused. Running the query anyway surfaced "check your connection", which
  // reads as a network fault rather than a missing account.
  const ready = !isAuthLoading && !!session;

  const shiftQuery = useQuery({
    queryKey: ["shift-tracker", session?.user?.id ?? "guest", since],
    enabled: ready,
    // Retry transient Supabase network/auth blips with exponential backoff
    // before we consider the load failed.
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    queryFn: async () => {
      const b = await ensureBaby();
      const [rows, latest] = await Promise.all([
        fetchCareLogs(b.id, since),
        fetchLatestPublishedHandover(b.id).catch(() => null),
      ]);
      return { baby: b, logs: rows, handover: latest };
    },
  });

  useEffect(() => {
    if (!shiftQuery.data) return;
    setBaby(shiftQuery.data.baby);
    setLogs(shiftQuery.data.logs);
    setHandover(shiftQuery.data.handover);
  }, [shiftQuery.data]);

  useEffect(() => {
    // Only toast once retries are exhausted; background retries that recover
    // never surface the warning.
    if (shiftQuery.isError) {
      toast.error("Couldn't open the shift tracker. Check your connection.");
    }
  }, [shiftQuery.isError]);

  const loading = !ready || shiftQuery.isPending;

  async function reload(babyId: string) {
    const [rows, latest] = await Promise.all([
      fetchCareLogs(babyId, since),
      fetchLatestPublishedHandover(babyId).catch(() => null),
    ]);
    setLogs(rows);
    setHandover(latest);
  }

  async function handleLog(type: CareEventType, payload: CarePayload) {
    if (!baby) return;
    try {
      const row = await addCareLog(baby.id, type, payload);
      setLogs((prev) => [row, ...prev]);
      toast.success("Logged.");

      if (type === "feed") {
        captureEvent("logged_feed", { feed_type: (payload as FeedPayload).type });
      } else if (type === "sleep") {
        captureEvent("logged_sleep", {
          duration_minutes: (payload as SleepPayload).duration_minutes,
        });
      } else if (type === "diaper") {
        captureEvent("logged_diaper", { type: (payload as DiaperPayload).condition });
      }
    } catch {
      toast.error("That didn't save. Try once more.");
    }
  }

  async function handleEdit(log: CareLog, text: string) {
    const payload: CarePayload =
      log.event_type === "observation"
        ? { ...(log.operational_metrics as ObservationPayload), note: text }
        : ({ ...(log.operational_metrics as object), notes: text } as CarePayload);
    setLogs((prev) =>
      prev.map((l) =>
        l.id === log.id ? { ...l, operational_metrics: payload, content: text } : l,
      ),
    );
    try {
      await updateCareLog(log.id, payload);
    } catch {
      toast.error("Couldn't save that edit.");
    }
  }

  async function handleDelete(log: CareLog) {
    setLogs((prev) => prev.filter((l) => l.id !== log.id));
    try {
      await deleteCareLog(log.id);
      toast.success("Entry removed.");
    } catch {
      toast.error("Couldn't remove that entry.");
    }
  }

  const metrics = computeMetrics(logs);

  // A session outranks the flag: someone who signed up from inside the demo is
  // not a guest any more, whether or not the flag has been cleared yet.
  if (guest && !session) {
    return (
      <div className="min-h-dvh bg-night px-5 py-10 text-night-text">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-5 font-serif text-2xl text-night-text">Shift &amp; care tracker</h1>
          <NeedsAccount
            tone="night"
            title="This one needs an account"
            body="Care logs are saved against your family so the parent and the night caregiver see the same shift. The demo keeps everything on this device, so there is nothing to save them to yet."
          />
        </div>
      </div>
    );
  }

  const totalSleepMins = logs.reduce(
    (sum, l) =>
      l.event_type === "sleep" ? sum + ((l.operational_metrics as SleepPayload).duration_minutes ?? 0) : sum,
    0,
  );

  return (
    <div className={cn("min-h-dvh bg-night text-night-text", dim && "night-dim")}>
      <div className="mx-auto max-w-2xl px-5 pb-40 pt-6">
        <header className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-night-muted">
              <Moon className="h-3.5 w-3.5" /> Active shift
            </p>
            <h1 className="mt-1 truncate font-serif text-2xl text-night-text">Shift tracker</h1>
          </div>
          <div className="flex items-center gap-2">
            {!showParentLink && (
              <FamilySwitcher
                enabled={ready}
                currentName={baby?.name ?? "Family"}
                onSwitched={() => void shiftQuery.refetch()}
              />
            )}
            <NightDimToggle dim={dim} onToggle={toggle} />
          </div>
        </header>

        {showParentLink && (
          <Link
            to="/care-summary"
            className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-night-muted underline-offset-4 hover:underline"
          >
            Parent view <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        <CareTimers onLog={handleLog} />

        {loading ? (
          <div className="flex items-center gap-2 text-night-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening tonight's shift…
          </div>
        ) : (
          <>
            <ShiftSummary metrics={metrics} totalSleepMins={totalSleepMins} startedAt={since} />
            {handover && <MorningHandoverCard handover={handover} />}
            {baby && (
              <div className="mb-6">
                <HandoverGenerator
                  babyId={baby.id}
                  babyName={baby.name}
                  metrics={metrics}
                  shiftStart={since}
                  onPublished={() => baby && void reload(baby.id)}
                />
              </div>
            )}
            <ShiftTimeline logs={logs} onEdit={handleEdit} onDelete={handleDelete} />
          </>
        )}
      </div>

      <QuickLogBar onLog={handleLog} />

    </div>
  );
}
