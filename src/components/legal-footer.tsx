import { Link } from "@tanstack/react-router";
import { legal } from "@/lib/microcopy";
import { cn } from "@/lib/utils";

/** Persistent medical / crisis disclosure shown at the bottom of every screen. */
export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "border-t border-border/50 px-5 py-6 text-center text-xs leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <p className="mx-auto max-w-md">{legal.disclaimer}</p>
      <Link
        to="/terms"
        className="mt-2 inline-block font-medium text-foreground/70 underline-offset-4 hover:underline"
      >
        {legal.termsLink}
      </Link>
    </footer>
  );
}
