import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ReviewQueue } from "@/components/ReviewQueue";

export const Route = createFileRoute("/review-queue")({
  head: () => ({
    meta: [
      { title: "Review queue — Vela" },
      {
        name: "description",
        content:
          "Review, edit, approve, or dismiss the gentle outreach drafts Vela prepared from recent rhythm patterns.",
      },
      { property: "og:title", content: "Review queue — Vela" },
      {
        property: "og:description",
        content: "Review, edit, approve, or dismiss the outreach drafts Vela prepared from recent rhythm patterns.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReviewQueuePage,
});

function ReviewQueuePage() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Nothing is sent without your okay. Adjust the wording if it doesn't sound like you.
        </p>
        <ReviewQueue />
      </div>
    </AppShell>
  );
}
