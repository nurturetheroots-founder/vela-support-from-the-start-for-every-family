import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

let initialized = false;

async function initPostHog() {
  if (initialized || typeof window === "undefined") return null;
  const token = import.meta.env["VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY"];
  if (!token) return null;
  const region = import.meta.env["VITE_LOVABLE_CONNECTOR_POSTHOG_REGION"] || "eu";
  const apiHost = region === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com";
  const { default: posthog } = await import("posthog-js");
  posthog.init(token, {
    api_host: apiHost,
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
