import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { initPostHog } from "./analytics-utils";

export function Analytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancelled = false;
    void initPostHog().then((posthog) => {
      if (!posthog || cancelled) return;
      posthog.capture("$pageview", { $current_url: window.location.href });
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
