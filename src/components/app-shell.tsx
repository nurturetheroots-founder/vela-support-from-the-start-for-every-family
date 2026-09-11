import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Home, ClipboardCheck, BookOpen, HeartHandshake, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { problem } from "@/lib/microcopy";
import { LegalFooter } from "@/components/legal-footer";

const nav = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/checkin", label: "Check-in", icon: ClipboardCheck },
  { to: "/education", label: "Learn", icon: BookOpen },
  { to: "/support", label: "Support", icon: HeartHandshake },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <div
      className="min-h-dvh bg-background flex flex-col"
      style={{ backgroundImage: "var(--gradient-welcome)", backgroundAttachment: "fixed" }}
    >
      {offline && (
        <div
          role="status"
          className="bg-secondary text-foreground text-center text-sm px-5 py-2 leading-relaxed"
        >
          {problem.offline}
        </div>
      )}
      <header className="border-b border-border/50 bg-welcome-base/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="grid place-items-center h-8 w-8 rounded-full bg-primary text-primary-foreground">
              <Heart className="h-4 w-4" fill="currentColor" />
            </span>
            <span className="font-serif text-lg font-semibold">Vela</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-6">{children}</main>
      <LegalFooter className="max-w-2xl w-full mx-auto pb-28" />
      <nav className="fixed bottom-0 inset-x-0 border-t border-border/50 bg-welcome-base/90 backdrop-blur">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {nav.map((n) => {
            const active = pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 min-h-14 text-xs transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
