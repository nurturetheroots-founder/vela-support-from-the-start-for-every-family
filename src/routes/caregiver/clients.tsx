import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/auth-gate";
import { ClientList } from "@/components/care/client-list";

export const Route = createFileRoute("/caregiver/clients")({
  head: () => ({
    meta: [
      { title: "Client Dashboard — Vela for Doulas" },
      {
        name: "description",
        content:
          "Every family a doula supports in one place, with the last 24 hours of feeds, diapers and sleep for each case.",
      },
      { property: "og:title", content: "Client Dashboard — Vela for Doulas" },
      {
        property: "og:description",
        content: "Track each family you support, shift by shift.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AuthGate>
      <ClientList />
    </AuthGate>
  ),
});
