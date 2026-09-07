import { useState, type ReactNode, type ComponentType } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A calm, collapsible section. Keeps the first viewport light by letting each
 * area of the dashboard stay closed until a parent chooses to open it.
 */
export function DisclosureSection({
  title,
  hint,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mb-3 overflow-hidden rounded-2xl border border-border/60 bg-card/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 text-left min-h-14"
      >
        {Icon ? (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        ) : (
          <span className="h-0 w-0" />
        )}
        <span className="min-w-0">
          <span className="block font-serif text-lg leading-tight">{title}</span>
          {hint && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{hint}</span>}
        </span>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}
