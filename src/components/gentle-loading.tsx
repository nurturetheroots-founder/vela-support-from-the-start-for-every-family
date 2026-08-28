import { cn } from "@/lib/utils";

/**
 * A quiet, non-robotic loading state: three softly breathing dots and
 * slowly fading reassurance text. No progress bars, no spinners.
 */
export function GentleLoading({
  message = "Vela is gently organizing your thoughts for your support team…",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-3 rounded-2xl bg-card/60 px-4 py-4 animate-in fade-in duration-700",
        className,
      )}
    >
      <span className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-gentle-pulse"
            style={{ animationDelay: `${i * 0.45}s` }}
          />
        ))}
      </span>
      <span className="text-sm text-muted-foreground leading-relaxed animate-gentle-fade">
        {message}
      </span>
    </div>
  );
}
