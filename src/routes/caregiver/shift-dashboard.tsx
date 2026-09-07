import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/auth-gate";
import { CareTracker } from "@/components/care/care-tracker";

export const Route = createFileRoute("/caregiver/shift-dashboard")({
  head: () => ({
    meta: [
      { title: "Caregiver Shift Dashboard — Vela" },
      {
        name: "description",
        content:
          "The invited caregiver's home: log feeds, diapers, sleep and observations for the family you support, then leave a warm morning handover.",
      },
      { property: "og:title", content: "Caregiver Shift Dashboard — Vela" },
      {
        property: "og:description",
        content: "Log tonight's care and hand the morning over to the family you support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AuthGate>
      <CareTracker showParentLink={false} />
    </AuthGate>
  ),
});
