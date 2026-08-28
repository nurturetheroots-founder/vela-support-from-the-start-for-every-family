import { useAgentTasks } from "@/lib/agent-tasks";
import { ShieldCheck } from "lucide-react";

/**
 * A quiet, ambient indicator that background work is underway.
 * Renders nothing when there is nothing running.
 */
export function AgentStatus({ className = "" }: { className?: string }) {
  const tasks = useAgentTasks();
  if (tasks.length === 0) return null;

  const current = tasks[tasks.length - 1];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-sm ${className}`}
    >
      <span className="relative grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
        <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <ShieldCheck className="relative h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground/90">{current.label}</p>
        {tasks.length > 1 && (
          <p className="text-xs text-muted-foreground mt-0.5">{tasks.length} tasks in progress</p>
        )}
      </div>
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </span>
    </div>
  );
}
