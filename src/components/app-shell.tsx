import { Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, type ReactNode } from "react";
import { Home, ClipboardCheck, BookOpen, HeartHandshake, Heart, Bell, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { problem } from "@/lib/microcopy";
import { LegalFooter } from "@/components/legal-footer";
import { endGuest } from "@/lib/guest";
import { cachedRole, fetchRoleInfo, type AppRole } from "@/lib/roles";


const caregiverNav = [{ to: "/caregiver/shift-dashboard", label: "Shift", icon: Moon }];

const nav = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/checkin", label: "Check-in", icon: ClipboardCheck },
  { to: "/education", label: "Learn", icon: BookOpen },
  { to: "/support", label: "Support", icon: HeartHandshake },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [offline, setOffline] = useState(false);
  const [openAlerts, setOpenAlerts] = useState(0);
  const [role, setRole] = useState<AppRole>("parent");

  useEffect(() => {
    setRole(cachedRole());
    void fetchRoleInfo().then((info) => setRole(info.role));
  }, []);

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

  useEffect(() => {
    let active = true;
    supabase
      .from("escalations")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .then(({ count }) => {
        if (active) setOpenAlerts(count ?? 0);
      });
    return () => {
      active = false;
    };
  }, [pathname]);


  const tabs = role === "caregiver" ? caregiverNav : nav;

  return (
    <div
      className="min-h-dvh bg-background flex flex-col"
      style={{ backgroundImage: "var(--gradient-welcome)", backgroundAttachment: "fixed" }}
    >
      {offline && (
        <div role="status" className="bg-secondary text-foreground text-center text-sm px-5 py-2 leading-relaxed">
          {problem.offline}
        </div>
      )}
      <header className="border-b border-border/50 bg-welcome-base/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to={role === "caregiver" ? "/caregiver/shift-dashboard" : "/dashboard"} className="flex items-center gap-2">
            <span className="grid place-items-center h-8 w-8 rounded-full bg-primary text-primary-foreground">
              <Heart className="h-4 w-4" fill="currentColor" />
            </span>
            <span className="font-serif text-lg font-semibold">Vela</span>
          </Link>
          <div className="flex items-center gap-3">
            {role !== "caregiver" && (
            <Link
              to="/alerts"
              aria-label={openAlerts > 0 ? `Your notices, ${openAlerts} new` : "Your notices"}
              className="relative grid place-items-center h-10 w-10 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bell className="h-5 w-5" />
              {openAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 grid place-items-center min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                  {openAlerts}
                </span>
              )}
            </Link>
            )}
            <button
              type="button"
              onClick={async () => {
                endGuest();
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>

        </div>

      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 pt-6 pb-28">{children}</main>
      <LegalFooter className="max-w-2xl w-full mx-auto pb-28" />
      <nav className="fixed bottom-0 inset-x-0 border-t border-border/50 bg-welcome-base/90 backdrop-blur">
        <div className={cn("max-w-2xl mx-auto grid", tabs.length === 1 ? "grid-cols-1" : "grid-cols-4")}>
          {tabs.map((n) => {
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