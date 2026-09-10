import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "vela.care.dim";

/**
 * Amber "dim" mode for overnight shifts. Adds `.night-dim` to the tracker
 * wrapper, which swaps every night token for a blue-free amber equivalent.
 */
export function useNightDim() {
  const [dim, setDim] = useState(false);

  useEffect(() => {
    setDim(window.localStorage.getItem(KEY) === "1");
  }, []);

  function toggle() {
    setDim((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }

  return { dim, toggle };
}

export function NightDimToggle({ dim, onToggle }: { dim: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={dim}
      aria-label={dim ? "Turn off amber night mode" : "Turn on amber night mode"}
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-full ring-1 transition-colors",
        dim
          ? "bg-clay-soft text-night ring-clay-soft"
          : "bg-night-soft text-night-text ring-night-line",
      )}
    >
      {dim ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}
