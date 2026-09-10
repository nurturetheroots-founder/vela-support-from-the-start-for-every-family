import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { identifyUser, resetUser } from "@/lib/analytics-utils";
import { endGuest } from "@/lib/guest";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A real session means the demo is over, however it ended: signing up from
    // inside the demo, or signing in on a device that once browsed as a guest.
    // Clearing the flag here stops it outliving the demo and hiding
    // account-only features from someone who now has an account.
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (s) endGuest();
      setSession(s);
      setLoading(false);
      if (event === "SIGNED_IN" && s?.user) {
        identifyUser(s.user.id, s.user.email);
      } else if (event === "SIGNED_OUT") {
        resetUser();
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) endGuest();
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}
