import { useState } from "react";
import { Milk, Baby, Moon, NotebookPen, Minus, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type {
  CareEventType,
  CarePayload,
  DiaperPayload,
  FeedPayload,
  ObservationPayload,
  SleepPayload,
} from "@/lib/care-log";

const pill =
  "min-h-11 rounded-full px-4 text-sm font-medium border transition-colors select-none";
const pillIdle = "border-slate-700 bg-slate-800/60 text-slate-200 active:bg-slate-700";
const pillOn = "border-transparent bg-slate-100 text-slate-900";

function Pills<T extends string | number>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T | undefined;
  onChange: (v: T) => void;
  labels?: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          onClick={() => onChange(o)}
          className={cn(pill, value === o ? pillOn : pillIdle)}
        >
          {labels ? labels(o) : String(o)}
        </button>
      ))}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  step = 0.5,
  min = 0,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  suffix: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/60 px-3 py-2">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}
        className="grid h-11 w-11 place-items-center rounded-full bg-slate-700/70 text-slate-100"
      >
        <Minus className="h-5 w-5" />
      </button>
      <span className="text-2xl font-semibold text-slate-50 tabular-nums">
        {value}
        <span className="ml-1 text-sm font-normal text-slate-400">{suffix}</span>
      </span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(Math.round((value + step) * 10) / 10)}
        className="grid h-11 w-11 place-items-center rounded-full bg-slate-700/70 text-slate-100"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

const actions: { type: CareEventType; label: string; icon: typeof Milk; tint: string }[] = [
  { type: "feed", label: "Feed", icon: Milk, tint: "text-amber-300" },
  { type: "diaper", label: "Diaper", icon: Baby, tint: "text-slate-300" },
  { type: "sleep", label: "Sleep", icon: Moon, tint: "text-teal-300" },
  { type: "observation", label: "Note", icon: NotebookPen, tint: "text-violet-300" },
];

export function QuickLogBar({
  onLog,
}: {
  onLog: (type: CareEventType, payload: CarePayload) => Promise<void> | void;
}) {
  const [open, setOpen] = useState<CareEventType | null>(null);

  // feed
  const [feedType, setFeedType] = useState<FeedPayload["type"]>("bottle");
  const [oz, setOz] = useState(3);
  const [nursingMins, setNursingMins] = useState(15);
  const [side, setSide] = useState<FeedPayload["side"]>("both");
  // diaper
  const [condition, setCondition] = useState<DiaperPayload["condition"]>("wet");
  // sleep
  const [sleepMins, setSleepMins] = useState(90);
  const [soothing, setSoothing] = useState<string | undefined>(undefined);
  // observation
  const [category, setCategory] = useState<ObservationPayload["category"]>("soothing");
  const [note, setNote] = useState<string | undefined>(undefined);

  const close = () => setOpen(null);

  async function submit() {
    if (!open) return;
    let payload: CarePayload;
    if (open === "feed") {
      payload =
        feedType === "bottle"
          ? { type: "bottle", amount_oz: oz }
          : { type: "nursing", duration_minutes: nursingMins, side };
    } else if (open === "diaper") {
      payload = { condition } satisfies DiaperPayload;
    } else if (open === "sleep") {
      const end = new Date();
      const start = new Date(end.getTime() - sleepMins * 60000);
      payload = {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration_minutes: sleepMins,
        ...(soothing ? { soothing_technique: soothing } : {}),
      } satisfies SleepPayload;
    } else {
      payload = { category, note: note ?? presetNotes[category][0] } satisfies ObservationPayload;
    }
    await onLog(open, payload);
    close();
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.type}
                type="button"
                onClick={() => setOpen(a.type)}
                className="flex min-h-16 flex-col items-center justify-center gap-1 py-3 text-xs text-slate-300 active:bg-slate-900"
              >
                <Icon className={cn("h-6 w-6", a.tint)} />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      <Sheet open={open !== null} onOpenChange={(v) => !v && close()}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-slate-800 bg-slate-900 text-slate-100"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="text-slate-50">
              {open === "feed" && "Log a feed"}
              {open === "diaper" && "Log a diaper"}
              {open === "sleep" && "Log a sleep stretch"}
              {open === "observation" && "Add a note"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 pb-2">
            {open === "feed" && (
              <>
                <Pills
                  options={["bottle", "nursing"] as FeedPayload["type"][]}
                  value={feedType}
                  onChange={setFeedType}
                  labels={(v) => (v === "bottle" ? "Bottle" : "Nursing")}
                />
                {feedType === "bottle" ? (
                  <>
                    <Pills options={[2, 2.5, 3, 3.5, 4]} value={oz} onChange={setOz} labels={(v) => `${v} oz`} />
                    <Stepper value={oz} onChange={setOz} suffix="oz" />
                  </>
                ) : (
                  <>
                    <Pills
                      options={["left", "right", "both"] as NonNullable<FeedPayload["side"]>[]}
                      value={side}
                      onChange={setSide}
                      labels={(v) => (v === "both" ? "Both" : v === "left" ? "Left" : "Right")}
                    />
                    <Pills options={[10, 15, 20, 25, 30]} value={nursingMins} onChange={setNursingMins} labels={(v) => `${v} min`} />
                    <Stepper value={nursingMins} onChange={setNursingMins} step={5} suffix="min" />
                  </>
                )}
              </>
            )}

            {open === "diaper" && (
              <Pills
                options={["wet", "dirty", "both"] as DiaperPayload["condition"][]}
                value={condition}
                onChange={setCondition}
                labels={(v) => (v === "wet" ? "Wet" : v === "dirty" ? "Dirty" : "Both")}
              />
            )}

            {open === "sleep" && (
              <>
                <p className="text-sm text-slate-400">How long did this stretch last?</p>
                <Pills options={[30, 45, 60, 90, 120, 180]} value={sleepMins} onChange={setSleepMins} labels={(v) => `${v} min`} />
                <Stepper value={sleepMins} onChange={setSleepMins} step={5} suffix="min" />
                <p className="text-sm text-slate-400">Soothing that worked</p>
                <Pills
                  options={["Swaddle", "Rocking", "Shushing", "Contact nap", "Pacifier"]}
                  value={soothing}
                  onChange={setSoothing}
                />
              </>
            )}

            {open === "observation" && (
              <>
                <Pills
                  options={["developmental", "soothing", "maternal_check"] as ObservationPayload["category"][]}
                  value={category}
                  onChange={(c) => {
                    setCategory(c);
                    setNote(undefined);
                  }}
                  labels={(v) =>
                    v === "developmental" ? "Development" : v === "soothing" ? "Soothing" : "Parent check"
                  }
                />
                <Pills options={presetNotes[category]} value={note} onChange={setNote} />
              </>
            )}

            <button
              type="button"
              onClick={submit}
              className="min-h-14 w-full rounded-2xl bg-slate-100 text-base font-semibold text-slate-900 active:bg-slate-300"
            >
              Save
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

const presetNotes: Record<ObservationPayload["category"], string[]> = {
  developmental: ["Long quiet alert window", "Tracking faces", "Strong rooting reflex", "Head lifting in tummy time"],
  soothing: ["Settled with swaddle", "Needed extra burping", "Calmed with rocking", "Gassy — bicycle legs helped"],
  maternal_check: ["Parent slept well", "Parent rested during shift", "Parent tearful — offered support", "Latch felt easier"],
};
