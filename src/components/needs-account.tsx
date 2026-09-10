import { Link } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown in demo mode where a feature genuinely cannot work without an account.
 *
 * Demo mode keeps everything on the device and never signs in, so anything that
 * writes to the database refuses. Left alone those features fail with a generic
 * error — "couldn't create a code", "check your connection" — which reads as a
 * broken app rather than a missing account. This says the real reason instead.
 *
 * `tone` follows the surface it sits on: the care tracker is the night palette,
 * everything else is the daytime one.
 */
export function NeedsAccount({
  title,
  body,
  tone = "light",
}: {
  title: string;
  body: string;
  tone?: "light" | "night";
}) {
  const night = tone === "night";
  return (
    <section
      className={
        night
          ? "rounded-3xl border border-night-line bg-night-soft p-6"
          : "rounded-3xl border border-border/50 bg-card/80 p-6"
      }
    >
      <h2
        className={
          night
            ? "flex items-center gap-2 font-serif text-xl text-night-text"
            : "flex items-center gap-2 font-serif text-xl"
        }
      >
        <UserPlus className={night ? "h-5 w-5 text-clay-soft" : "h-5 w-5 text-primary"} />
        {title}
      </h2>
      <p
        className={
          night
            ? "mt-2 text-sm leading-relaxed text-night-muted"
            : "mt-2 text-sm leading-relaxed text-muted-foreground"
        }
      >
        {body}
      </p>
      <Button
        asChild
        className={
          night
            ? "mt-4 min-h-11 rounded-full bg-clay-soft px-6 text-night hover:bg-clay-soft/90"
            : "mt-4 min-h-11 rounded-full px-6"
        }
      >
        <Link to="/auth">Create an account</Link>
      </Button>
      <p className={night ? "mt-3 text-xs text-night-muted" : "mt-3 text-xs text-muted-foreground"}>
        Everything you entered in the demo stays on this device.
      </p>
    </section>
  );
}
