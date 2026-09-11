import { empty } from "@/lib/microcopy";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Moon, Waves, Eye, Activity, Cloud, HeartCrack, Clock } from "lucide-react";
import { addInfantStateLog, useStore } from "@/lib/store";

export interface InfantState {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  telling: string;
  actions: string[];
}

export const infantStates: InfantState[] = [
  {
    id: "deep-sleep",
    label: "Deep sleep",
    icon: Moon,
    telling:
      "Their sensory threshold is high right now — they're doing the quiet work of growing and are hard to rouse. Nothing is needed from you.",
    actions: [
      "Keep the room dim and sounds steady",
      "Let them stay where they are — no repositioning",
      "Rest or eat something yourself while it's calm",
    ],
  },
  {
    id: "light-sleep",
    label: "Light sleep",
    icon: Waves,
    telling:
      "Their threshold is dropping. Fluttering eyes and small movements mean they're surfacing and easy to wake.",
    actions: [
      "Pause before picking up — they may resettle on their own",
      "Add a soft hand on the chest if they stir",
      "Keep light low and voices to a whisper",
    ],
  },
  {
    id: "drowsy",
    label: "Drowsy",
    icon: Cloud,
    telling:
      "They're in the doorway between waking and sleep. Their threshold is narrow — a little too much input tips them awake.",
    actions: [
      "Lower the lighting now",
      "Deep swaddle with arms tucked midline",
      "Slow, rhythmic rocking or patting — one pace, no changes",
    ],
  },
  {
    id: "quiet-alert",
    label: "Quiet alert",
    icon: Eye,
    telling:
      "Their threshold is wide open and calm — this is their best learning window. Bright eyes, still body, focused on you.",
    actions: [
      "Hold face-to-face about 8–12 inches away",
      "Talk softly and let them answer with their eyes",
      "Stop when they look away — that's a full cup, not rejection",
    ],
  },
  {
    id: "active-alert",
    label: "Active alert",
    icon: Activity,
    telling:
      "Their threshold is narrowing. Wiggling, fussing sounds and jerky movements say the input is getting close to too much.",
    actions: [
      "Lower lighting and turn off background noise",
      "Bring hands to chest, midline, and hold them there",
      "Move to a quieter room before crying starts",
    ],
  },
  {
    id: "crying",
    label: "Crying / overstimulated",
    icon: HeartCrack,
    telling:
      "Their threshold has been crossed. Crying is their only way to say the world got louder than their system can hold.",
    actions: [
      "Dim the lights and remove one source of input at a time",
      "Deep swaddle or firm containment hold, hands to chest",
      "Skin-to-skin with slow shushing at your own breathing pace",
    ],
  },
];

export function InfantStatesModule() {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [active, setActive] = useState<InfantState | null>(null);
  const logs = useStore((s) => s.infantStates);
  const todayCount = logs.filter((l) => l.date === new Date().toISOString().slice(0, 10)).length;

  function choose(s: InfantState) {
    setActive(s);
    setPicking(false);
    setOpen(true);
  }

  function save() {
    if (!active) return;
    addInfantStateLog(active.id, active.label);
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    toast.success(`State logged at ${time}`, {
      description: `${active.label} saved to today's timeline.`,
    });
    setOpen(false);
  }

  return (
    <div className="rounded-2xl bg-card/70 border border-border/60 p-5 mb-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid place-items-center h-10 w-10 rounded-full bg-primary/10 text-primary">
          <Moon className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-serif text-xl">Sleep &amp; wake rhythms</h2>
          <p className="text-sm text-muted-foreground mt-1">
            The 6 infant states — where your baby is right now, and what helps.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button className="rounded-full" onClick={() => setPicking((p) => !p)}>
          Log current state
        </Button>
        {todayCount === 0 && (
          <span className="text-xs text-muted-foreground">{empty.noStatesToday}</span>
        )}
        {todayCount > 0 && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {todayCount} logged today
          </span>
        )}
      </div>

      {picking && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {infantStates.map((s) => (
            <button
              key={s.id}
              onClick={() => choose(s)}
              className="rounded-xl bg-secondary hover:bg-sand-deep transition-colors p-3 text-left min-h-14 flex items-center gap-2"
            >
              <s.icon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium leading-snug">{s.label}</span>
            </button>
          ))}
        </div>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-card">
          <div className="mx-auto w-full max-w-md">
            <DrawerHeader className="text-left">
              <DrawerTitle className="font-serif text-2xl">{active?.label}</DrawerTitle>
              <DrawerDescription className="sr-only">
                What this state means and how to respond
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-2">
              <div className="rounded-2xl bg-secondary p-4">
                <p className="text-xs uppercase tracking-wide text-primary font-medium">
                  What baby is telling you
                </p>
                <p className="text-sm mt-2 leading-relaxed">{active?.telling}</p>
              </div>

              <p className="text-xs uppercase tracking-wide text-primary font-medium mt-5">
                Co-regulation you can offer
              </p>
              <ul className="mt-2 space-y-2">
                {active?.actions.map((a, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="grid place-items-center h-5 w-5 shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-medium mt-0.5">
                      {i + 1}
                    </span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 pt-5 flex flex-col gap-2">
              <Button className="rounded-full w-full" onClick={save}>
                Save to daily timeline
              </Button>
              <Button
                variant="ghost"
                className="rounded-full w-full"
                onClick={() => setOpen(false)}
              >
                Not now
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
