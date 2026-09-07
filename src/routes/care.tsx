import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/auth-gate";
import { CareTracker } from "@/components/care/care-tracker";

export const Route = createFileRoute("/care")({
  head: () => ({
    meta: [
      { title: "Shift & Care Tracker — Vela" },
      {
        name: "description",
        content:
          "A one-handed, low-glare way for postpartum caregivers to log feeds, diapers, sleep and observations, then hand the night over to parents.",
      },
      { property: "og:title", content: "Shift & Care Tracker — Vela" },
      {
        property: "og:description",
        content: "Low-glare shift logging for postpartum caregivers, with a warm morning handover for parents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AuthGate>
      <CareTracker />
    </AuthGate>
  ),
});
