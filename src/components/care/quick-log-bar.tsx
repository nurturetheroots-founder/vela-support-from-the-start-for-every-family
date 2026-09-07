import { useRef, useState } from "react";
import { Milk, Baby, Moon, NotebookPen, Minus, Plus, Droplet } from "lucide-react";
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
  "min-h-11 rounded-full px-4 text-sm font-medium transition-colors select-none";
const pillIdle = "bg-night-raised/70 text-night-muted active:bg-night-raised";
const pillOn = "bg-clay-soft text-night";

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
    <div className="flex items-center justify-between rounded-full bg-night-soft px-3 py-2">
      <button
        type="button"
        aria-label="Decrease"
        onClick={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}
        className="grid h-11 w-11 place-items-center rounded-full bg-night-raised/80 text-night-text"
      >
        <Minus className="h-5 w-5" />
      </button>
      <span className="text-2xl font-semibold tabular-nums text-night-text">
        {value}
        <span className="ml-1 text-sm font-normal text-night-muted">{suffix}</span>
      </span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(Math.round((value + step) * 10) / 10)}
        className="grid h-11 w-11 place-items-center rounded-full bg-night-raised/80 text-night-text"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

type QuickAction = {
  key: string;
  type: CareEventType;
  label: string;
  hint: string;
  icon: typeof Milk;
  tint: string;
  payload: () => CarePayload;
};

const quickActions: QuickAction[] = [
  {
    key: "wet",
    type: "diaper",
    label: "Wet",
    hint: "diaper",
    icon: Droplet,
    tint: "text-sage",
    payload: () => ({ condition: "wet" }),
  },
  {
    key: "dirty",
    type: "diaper",
    label: "Dirty",
    hint: "diaper",
    icon: Baby,
    tint: "text-clay-soft",
    payload: () => ({ condition: "dirty" }),
  },
  {
    key: "bottle",
    type: "feed",
    label: "Bottle",
    hint: "3 oz",
    icon: Milk,
    tint: "text-clay-soft",
    payload: () => ({ type: "bottle", amount_oz: 3 }),
  },
  {
    key: "sleep",
    type: "sleep",
    label: "Sleep",
    hint: "past hour",
    icon: Moon,
    tint: "text-sage",
    payload: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 60 * 60000);
      return {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        duration_minutes: 60,
      } satisfies SleepPayload;
    },
  },
  {
    key: "note",
    type: "observation",
    label: "Note",
    hint: "hold to write",
    icon: NotebookPen,
    tint: "text-lilac-soft",
    payload: () => ({ category: "soothing", note: "Settled with swaddle" }),
  },
];

export function QuickLogBar({
  onLog,
}: {
  onLog: (type: CareEventType, payload: CarePayload) => Promise<void> | void;
}) {
  const [open, setOpen] = useState<CareEventType | null>(null);
  const held = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function startHold(action: QuickAction) {
    held.current = false;
    timer.current = setTimeout(() => {
      held.current = true;
      if (navigator.vibrate) navigator.vibrate(8);
      setOpen(action.type);
    }, 500);
  }

  function endHold(action: QuickAction) {
    if (timer.current) clearTimeout(timer.current);
    if (held.current) return;
    void onLog(action.type, action.payload());
  }

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
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-night via-night/95 to-transparent pb-[env(safe-area-inset-bottom)] pt-6">
        <p className="pb-2 text-center text-[11px] tracking-wide text-night-muted/70">
          Tap to log now · hold for details
        </p>
        <div className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                type="button"
                onPointerDown={() => startHold(a)}
                onPointerUp={() => endHold(a)}
                onPointerLeave={() => timer.current && clearTimeout(timer.current)}
                onContextMenu={(e) => e.preventDefault()}
                className="flex min-h-[76px] min-w-[88px] flex-1 select-none flex-col items-center justify-center gap-1 rounded-3xl bg-night-soft/90 px-3 text-night-text shadow-lg shadow-black/20 transition-transform active:scale-95 active:bg-night-raised"
              >
                <Icon className={cn("h-6 w-6", a.tint)} />
                <span className="text-sm font-medium">{a.label}</span>
                <span className="text-[11px] text-night-muted">{a.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Sheet open={open !== null} onOpenChange={(v) => !v && close()}>
        <SheetContent side="bottom" className="rounded-t-[2rem] border-0 bg-night-soft text-night-text">
          <SheetHeader className="text-left">
            <SheetTitle className="font-serif text-xl text-night-text">
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
                    <Pills
                      options={[10, 15, 20, 25, 30]}
                      value={nursingMins}
                      onChange={setNursingMins}
                      labels={(v) => `${v} min`}
                    />
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
                <p className="text-sm text-night-muted">How long did this stretch last?</p>
                <Pills
                  options={[30, 45, 60, 90, 120, 180]}
                  value={sleepMins}
                  onChange={setSleepMins}
                  labels={(v) => `${v} min`}
                />
                <Stepper value={sleepMins} onChange={setSleepMins} step={5} suffix="min" />
                <p className="text-sm text-night-muted">Soothing that worked</p>
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
              className="min-h-14 w-full rounded-full bg-clay-soft text-base font-semibold text-night active:opacity-90"
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
