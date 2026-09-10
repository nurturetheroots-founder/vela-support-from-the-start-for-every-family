import { useState } from "react";
import { ChevronDown, Sunrise } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, type ShiftHandover } from "@/lib/care-log";

export function MorningHandoverCard({ handover }: { handover: ShiftHandover }) {
  const [open, setOpen] = useState(false);
  const m = handover.summary_metrics;

  return (
    <section className="mb-5 overflow-hidden rounded-[1.75rem] bg-night-soft/90 shadow-lg shadow-black/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-night-raised/60"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-clay-soft/20 text-clay-soft">
          <Sunrise className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-lg text-night-text">Morning handover</span>
          <span className="block truncate text-sm text-night-muted">
            Longest sleep {formatDuration(m?.longest_sleep_stretch_mins ?? 0)} · {m?.feed_count ?? 0} feeds
          </span>
        </span>
        <ChevronDown className={cn("h-5 w-5 text-night-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 px-5 pb-5">
          {handover.notes?.trim() && (
            <p className="whitespace-pre-line rounded-2xl bg-night-raised/60 p-4 text-sm leading-relaxed text-night-text">
              {handover.notes}
            </p>
          )}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Feeds" value={`${m?.feed_count ?? 0}`} />
            <Stat
              label="Nourishment"
              value={m?.total_oz ? `${m.total_oz} oz` : `${m?.total_nursing_mins ?? 0} min nursing`}
            />
            <Stat label="Wet" value={`${m?.wet_diapers ?? 0}`} />
            <Stat label="Dirty" value={`${m?.dirty_diapers ?? 0}`} />
          </dl>
          <p className="text-xs text-night-muted">
            Shift ended{" "}
            {new Date(handover.shift_end).toLocaleString(undefined, {
              weekday: "long",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-night-raised/50 px-4 py-3">
      <dt className="text-xs text-night-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-night-text">{value}</dd>
    </div>
  );
}
