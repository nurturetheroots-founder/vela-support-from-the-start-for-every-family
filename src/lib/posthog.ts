export const posthog = {
  identify: (id: string, properties?: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    import("posthog-js")
      .then(({ default: ph }) => {
        ph.identify(id, properties);
      })
      .catch(() => {});
  },
  reset: () => {
    if (typeof window === "undefined") return;
    import("posthog-js")
      .then(({ default: ph }) => {
        ph.reset();
      })
      .catch(() => {});
  },
  capture: (event: string, properties?: Record<string, unknown>) => {
    if (typeof window === "undefined") return;
    import("posthog-js")
      .then(({ default: ph }) => {
        ph.capture(event, properties);
      })
      .catch(() => {});
  },
};
