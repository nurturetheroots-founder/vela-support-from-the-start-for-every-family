import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelinePhase = {
  id: string;
  range: string;
  from: number;
  to: number;
  title: string;
  summary: string;
  points: string[];
};

export const phases: TimelinePhase[] = [
  {
    id: "p1",
    range: "Weeks 1–2",
    from: 0,
    to: 2,
    title: "Settling in together",
    summary: "Days blur. Feeding, bleeding, and big feelings are all finding their footing.",
    points: [
      "Daily check-ins take 60 seconds — mood, sleep, feeding.",
      "A first gentle mood screening arrives around week 2.",
      "Guides on recovery, latch, and what newborn crying is really saying.",
    ],
  },
  {
    id: "p2",
    range: "Weeks 3–5",
    from: 3,
    to: 5,
    title: "Learning each other's cues",
    summary: "Wake windows stretch a little. You start recognizing what your baby is asking for.",
    points: [
      "Log infant states to see your baby's rhythm take shape.",
      "Guides on the six infant states and co-regulation.",
      "If a few heavy days gather, we quietly offer a doula conversation.",
    ],
  },
  {
    id: "p3",
    range: "Week 6",
    from: 6,
    to: 6,
    title: "The six-week mark",
    summary:
      "Often a checkup week — and a moment to check in with yourself too, not just your body.",
    points: [
      "A second mood screening, held privately with you.",
      "Guides on identity, relationships, and returning-to-work feelings.",
      "Directory of lactation, pelvic floor, and perinatal mental health support near you.",
    ],
  },
  {
    id: "p4",
    range: "Months 2–3",
    from: 7,
    to: 13,
    title: "Finding a rhythm",
    summary: "Longer stretches of sleep for some, still not for others. Both are normal.",
    points: [
      "Patterns from your check-ins become easier to see over time.",
      "Screening at three months, with support offered either way.",
      "Sliding-scale doula sessions whenever you want a real person.",
    ],
  },
  {
    id: "p5",
    range: "Month 4",
    from: 14,
    to: 99,
    title: "Looking back, looking forward",
    summary: "The fourth trimester closes gently — and you decide what carrying on looks like.",
    points: [
      "A final check-in on how you've been, not just how baby is.",
      "Therapist referrals if you want ongoing care.",
      "Everything you logged stays yours.",
    ],
  },
];

export function ExpectTimeline({ currentWeek }: { currentWeek?: number | null }) {
  const active =
    typeof currentWeek === "number"
      ? phases.find((p) => currentWeek >= p.from && currentWeek <= p.to)?.id
      : undefined;
  const [open, setOpen] = useState<string | null>(active ?? phases[0]!.id);

  return (
    <ol className="mt-6 relative pl-6">
      <span className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />
      {phases.map((p) => {
        const isOpen = open === p.id;
        const isNow = p.id === active;
        return (
          <li key={p.id} className="relative pb-3">
            <span
              className={cn(
                "absolute -left-6 top-4 h-3.5 w-3.5 rounded-full border-2 border-background",
                isNow ? "bg-clay" : "bg-sand-deep",
              )}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : p.id)}
              aria-expanded={isOpen}
              className={cn(
                "w-full text-left rounded-2xl border p-4 transition-colors",
                isOpen
                  ? "border-primary/40 bg-secondary"
                  : "border-border/60 bg-card hover:border-foreground/20",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-primary">{p.range}</span>
                {isNow && (
                  <span className="rounded-full bg-clay/12 text-clay text-[0.65rem] px-2 py-0.5 uppercase tracking-wider">
                    You are here
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </div>
              <h3 className="font-serif text-lg mt-1">{p.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{p.summary}</p>
              {isOpen && (
                <ul className="mt-3 space-y-2">
                  {p.points.map((pt) => (
                    <li
                      key={pt}
                      className="flex gap-2 text-sm text-muted-foreground leading-relaxed"
                    >
                      <span
                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      {pt}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
