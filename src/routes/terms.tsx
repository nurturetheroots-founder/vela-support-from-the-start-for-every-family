import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { legal } from "@/lib/microcopy";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Medical Disclaimer — Vela" },
      {
        name: "description",
        content:
          "Vela's terms of service and medical disclaimer: what Vela is, what it isn't, and where to turn in a crisis.",
      },
      { property: "og:title", content: "Terms & Medical Disclaimer — Vela" },
      {
        property: "og:description",
        content: "What Vela is, what it isn't, and where to turn in a crisis.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <AppShell>
      <h1 className="font-serif text-3xl">Terms and Disclaimers</h1>
      <p className="mt-3 text-muted-foreground leading-relaxed">
        The plain-language version, while our full terms are being finalized.
      </p>

      <div className="mt-7 space-y-4">
        <section className="rounded-2xl bg-secondary p-6">
          <h2 className="font-serif text-xl">Medical disclaimer</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{legal.disclaimer}</p>
        </section>
        <section className="rounded-2xl bg-secondary p-6">
          <h2 className="font-serif text-xl">Screening tools</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{legal.epdsNudge}</p>
        </section>
        <section className="rounded-2xl bg-secondary p-6">
          <h2 className="font-serif text-xl">Your privacy</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your check-ins, screenings, and notes stay yours. Nothing is shared without you asking.
          </p>
        </section>
      </div>

      <div className="mt-8">
        <Link to="/support">
          <Button variant="outline" className="rounded-full">
            Back to support
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}
