type PostHogLike = {
  init: (token: string, config: Record<string, unknown>) => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (id: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

let posthogPromise: Promise<PostHogLike | null> | null = null;

const FALLBACK_TOKEN = "phc_ANLxu5buY5J4tPL977GrZLEaacto8wLcBrw72tAetykh";
const FALLBACK_REGION = "us";

function delayUntilLoadOrInteraction(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    let resolved = false;
    const trigger = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      // Yield to the main thread even further to ensure FCP completes
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(() => resolve());
      } else {
        setTimeout(resolve, 50);
      }
    };

    const cleanup = () => {
      window.removeEventListener("load", trigger);
      window.removeEventListener("mousemove", trigger);
      window.removeEventListener("mousedown", trigger);
      window.removeEventListener("touchstart", trigger);
      window.removeEventListener("scroll", trigger);
      window.removeEventListener("keydown", trigger);
    };

    if (document.readyState === "complete") {
      trigger();
    } else {
      window.addEventListener("load", trigger, { passive: true });
      window.addEventListener("mousemove", trigger, { passive: true });
      window.addEventListener("mousedown", trigger, { passive: true });
      window.addEventListener("touchstart", trigger, { passive: true });
      window.addEventListener("scroll", trigger, { passive: true });
      window.addEventListener("keydown", trigger, { passive: true });
    }
  });
}

export async function initPostHog(): Promise<PostHogLike | null> {
  if (typeof window === "undefined") return null;
  if (posthogPromise) return posthogPromise;

  posthogPromise = (async () => {
    // Delay initialization until page is loaded or user has interacted
    await delayUntilLoadOrInteraction();

    const token = import.meta.env["VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY"] || FALLBACK_TOKEN;
    if (!token) return null;
    const region = import.meta.env["VITE_LOVABLE_CONNECTOR_POSTHOG_REGION"] || FALLBACK_REGION;
    const apiHost = region === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com";
    
    // Import the slim version to avoid bundling session recording, rrweb, or autocapture modules
    // @ts-ignore
    const { default: posthog } = await import("posthog-js/dist/module.slim.js");
    
    posthog.init(token, {
      api_host: apiHost,
      defaults: "2026-05-30",
      person_profiles: "identified_only",
      capture_pageview: false,
      persistence: "localStorage",
      // Performance optimizations: explicitly disable unused, heavy features
      autocapture: false,
      capture_heatmaps: false,
      disable_session_recording: true,
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

export function captureEvent(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  void initPostHog().then((ph) => {
    if (ph) {
      ph.capture(eventName, properties);
    }
  });
}
