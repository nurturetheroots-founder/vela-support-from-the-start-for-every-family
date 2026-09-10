import { formatDuration, type ShiftMetrics } from "@/lib/care-log";

/**
 * Always-on shift tally. Compiles itself from the live log list so the parent
 * waking up — and the caregiver mid-shift — can read the night at a glance.
 */
export function ShiftSummary({
  metrics,
  totalSleepMins,
  startedAt,
}: {
  metrics: ShiftMetrics;
  totalSleepMins: number;
  startedAt: string;
}) {
  const items = [
    { label: "Feeds", value: String(metrics.feed_count) },
    {
      label: "Taken",
      value: metrics.total_oz
        ? `${metrics.total_oz} oz`
        : metrics.total_nursing_mins
          ? `${metrics.total_nursing_mins} min`
          : "—",
    },
    { label: "Sleep", value: formatDuration(totalSleepMins) },
    { label: "Diapers", value: `${metrics.wet_diapers}W · ${metrics.dirty_diapers}D` },
  ];

  const since = new Date(startedAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <section aria-label="Shift summary" className="mb-5 rounded-[1.75rem] bg-night-soft/90 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-lg text-night-text">Shift so far</h2>
        <span className="text-xs tabular-nums text-night-muted">since {since}</span>
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-2">
        {items.map((i) => (
          <div key={i.label} className="min-w-0">
            <dd className="truncate text-lg font-semibold tabular-nums text-night-text">{i.value}</dd>
            <dt className="text-[11px] uppercase tracking-wide text-night-muted">{i.label}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-night-muted">
        Longest stretch {formatDuration(metrics.longest_sleep_stretch_mins)}
      </p>
    </section>
  );
}
