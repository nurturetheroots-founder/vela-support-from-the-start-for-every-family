import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/auth-gate";
import { DoulaOnboarding } from "@/components/care/doula-onboarding";

export const Route = createFileRoute("/caregiver/onboarding")({
  head: () => ({
    meta: [
      { title: "Provider Setup — Vela for Doulas" },
      {
        name: "description",
        content:
          "Set up your doula profile, add the families you support with their invite codes, and open your client dashboard.",
      },
      { property: "og:title", content: "Provider Setup — Vela for Doulas" },
      {
        property: "og:description",
        content: "Set up your provider profile and add the families you support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AuthGate>
      <DoulaOnboarding />
    </AuthGate>
  ),
});
