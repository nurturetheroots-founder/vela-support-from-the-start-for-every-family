import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

let posthogPromise: Promise<any> | null = null;

const FALLBACK_TOKEN = "phc_ANLxu5buY5J4tPL977GrZLEaacto8wLcBrw72tAetykh";
const FALLBACK_REGION = "us";

async function initPostHog() {
  if (typeof window === "undefined") return null;
  if (posthogPromise) return posthogPromise;

  posthogPromise = (async () => {
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
    return posthog;
  })();

  return posthogPromise;
}

export function identifyUser(userId: string, email?: string) {
  if (typeof window === "undefined") return;
  void initPostHog().then((ph) => {
    if (ph) {
      ph.identify(userId, { email, role: "client" });
    }
  });
}

export function resetUser() {
  if (typeof window === "undefined") return;
  void initPostHog().then((ph) => {
    if (ph) {
      ph.reset();
    }
  });
}

export function captureEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window === "undefined") return;
  void initPostHog().then((ph) => {
    if (ph) {
      ph.capture(eventName, properties);
    }
  });
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
