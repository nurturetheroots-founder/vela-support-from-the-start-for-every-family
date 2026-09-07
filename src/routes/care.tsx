import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Moon, ArrowRight } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { QuickLogBar } from "@/components/care/quick-log-bar";
import { ShiftTimeline } from "@/components/care/shift-timeline";
import { HandoverGenerator } from "@/components/care/handover-generator";
import {
  addCareLog,
  computeMetrics,
  deleteCareLog,
  ensureBaby,
  fetchCareLogs,
  updateCareLog,
  type CareEventType,
  type CareLog,
  type CarePayload,
  type ObservationPayload,
} from "@/lib/care-log";

export const Route = createFileRoute("/care")({
  head: () => ({
    meta: [
      { title: "Shift & Care Tracker — Vela" },
      {
        name: "description",
        content:
          "A one-handed, low-glare way for postpartum caregivers to log feeds, diapers, sleep and observations, then hand the night over to parents.",
      },
      { property: "og:title", content: "Shift & Care Tracker — Vela" },
      {
        property: "og:description",
        content: "Low-glare shift logging for postpartum caregivers, with a warm morning handover for parents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AuthGate>
      <CarePage />
    </AuthGate>
  ),
});

function shiftStartIso() {
  // Current shift window: the last 14 hours of activity.
  return new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString();
}

function CarePage() {
  const [baby, setBaby] = useState<{ id: string; name: string } | null>(null);
  const [logs, setLogs] = useState<CareLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [since] = useState(shiftStartIso);

  const load = useCallback(
    async (babyId: string) => {
      const rows = await fetchCareLogs(babyId, since);
      setLogs(rows);
    },
    [since],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const b = await ensureBaby();
        if (cancelled) return;
        setBaby(b);
        await load(b.id);
      } catch {
        toast.error("Couldn't open the shift tracker. Check your connection.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function handleLog(type: CareEventType, payload: CarePayload) {
    if (!baby) return;
    try {
      const row = await addCareLog(baby.id, type, payload);
      setLogs((prev) => [row, ...prev]);
      toast.success("Logged.");
    } catch {
      toast.error("That didn't save. Try once more.");
    }
  }

  async function handleEdit(log: CareLog, text: string) {
    const payload: CarePayload =
      log.event_type === "observation"
        ? { ...(log.payload as ObservationPayload), note: text }
        : ({ ...(log.payload as object), notes: text } as CarePayload);
    setLogs((prev) => prev.map((l) => (l.id === log.id ? { ...l, payload } : l)));
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

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-2xl px-5 pb-40 pt-6">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
              <Moon className="h-3.5 w-3.5" /> Active shift
            </p>
            <h1 className="mt-1 font-serif text-2xl text-slate-50">Shift &amp; care tracker</h1>
          </div>
          <Link
            to="/care-summary"
            className="mt-1 inline-flex items-center gap-1 text-sm text-slate-400 underline-offset-4 hover:underline"
          >
            Parent view <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening tonight's shift…
          </div>
        ) : (
          <>
            {baby && (
              <div className="mb-6">
                <HandoverGenerator
                  babyId={baby.id}
                  babyName={baby.name}
                  metrics={metrics}
                  shiftStart={since}
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
