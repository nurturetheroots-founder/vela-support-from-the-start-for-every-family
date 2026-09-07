import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

let initialized = false;

const FALLBACK_TOKEN = "phc_ANLxu5buY5J4tPL977GrZLEaacto8wLcBrw72tAetykh";
const FALLBACK_REGION = "us";

async function initPostHog() {
  if (initialized || typeof window === "undefined") return null;
  const token = import.meta.env["VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY"] || FALLBACK_TOKEN;
  if (!token) return null;
  const region = import.meta.env["VITE_LOVABLE_CONNECTOR_POSTHOG_REGION"] || FALLBACK_REGION;
  const apiHost = region === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com";
  const { default: posthog } = await import("posthog-js");
  posthog.init(token, {
    api_host: apiHost,
    defaults: "2026-05-30",
    person_profiles: "identified_only",
    capture_pageview: false,
    persistence: "localStorage",
  });
  initialized = true;
  return posthog;
}


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

export const posthog = {
  identify: (id: string, properties?: Record<string, any>) => {
    if (typeof window === "undefined") return;
    import("posthog-js").then(({ default: ph }) => {
      ph.identify(id, properties);
    }).catch(() => {});
  },
  reset: () => {
    if (typeof window === "undefined") return;
    import("posthog-js").then(({ default: ph }) => {
      ph.reset();
    }).catch(() => {});
  },
  capture: (event: string, properties?: Record<string, any>) => {
    if (typeof window === "undefined") return;
    import("posthog-js").then(({ default: ph }) => {
      ph.capture(event, properties);
    }).catch(() => {});
  }
};
