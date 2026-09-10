import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { fetchCheckins, fetchParent, rowToCheckin, rowToProfile } from "@/lib/vela-db";
import { getState, hydrateFromRemote } from "@/lib/store";
import { fetchScreenings } from "@/lib/screenings";
import { isGuest } from "@/lib/guest";
import { cachedRole } from "@/lib/roles";

/**
 * Client-side gate for the signed-in experience. Renders a calm waiting state
 * while the session resolves, then hydrates the local store from the database.
 */
export function AuthGate({
  children,
  requireOnboarded = false,
}: {
  children: React.ReactNode;
  requireOnboarded?: boolean;
}) {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    setGuest(isGuest());
  }, []);

  useEffect(() => {
    if (loading) return;
    if (isGuest()) {
      // Demo mode — everything lives in the local store on this device.
      setHydrated(true);
      return;
    }
    if (!user) {
      nav({ to: "/auth" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [parent, rows, screenings] = await Promise.all([
          fetchParent(user.id),
          fetchCheckins(user.id),
          fetchScreenings(),
        ]);
        if (cancelled) return;
        hydrateFromRemote(parent ? rowToProfile(parent) : {}, rows.map(rowToCheckin), screenings);
      } catch {
        // Offline or slow connection — the local copy still works.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user, nav]);

  useEffect(() => {
    // Caregivers never go through parent onboarding.
    if (hydrated && requireOnboarded && cachedRole() !== "caregiver" && !getState().profile.onboarded) {
      nav({ to: "/onboarding" });
    }
  }, [hydrated, requireOnboarded, nav]);


  if (loading || (!user && !guest) || !hydrated) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center gap-3 px-6 text-center"
        style={{ backgroundImage: "var(--gradient-welcome)", backgroundAttachment: "fixed" }}
      >
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Getting your space ready.</p>
      </div>
    );
  }


  return <>{children}</>;
}
