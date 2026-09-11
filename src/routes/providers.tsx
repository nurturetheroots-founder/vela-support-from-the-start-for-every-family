import { empty, cta } from "@/lib/microcopy";
import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getState } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import emptyIllustration from "@/assets/empty-providers.jpg";

export const Route = createFileRoute("/providers")({
  head: () => ({
    meta: [
      { title: "Find Perinatal Support — Vela" },
      {
        name: "description",
        content:
          "A small, hand-picked look at the kinds of perinatal support near you — feeding help, someone to talk with, body recovery, and postpartum doula care.",
      },
      { property: "og:title", content: "Find Perinatal Support — Vela" },
      {
        property: "og:description",
        content:
          "A few examples of the perinatal professionals families work with — feeding support, emotional support, body recovery, and doula care.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getState().profile.onboarded) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: ProvidersPage,
});

const TYPES = ["All", "Feeding support", "Emotional support", "Body recovery"] as const;

type ProviderType = (typeof TYPES)[number];

interface Provider {
  id: string;
  name: string;
  credential: string;
  type: Exclude<ProviderType, "All">;
  city: string;
  languages: string;
  blurb: string;
}

const providers: Provider[] = [
  {
    id: "p1",
    name: "Maya Reyes",
    credential: "IBCLC",
    type: "Feeding support",
    city: "San Francisco, CA",
    languages: "English · Spanish",
    blurb:
      "Sits with you at home or on video while feeding finds its rhythm — latch, supply, or easing into a new routine.",
  },
  {
    id: "p2",
    name: "Dana Whitfield",
    credential: "LCSW, PMH-C",
    type: "Emotional support",
    city: "Oakland, CA",
    languages: "English",
    blurb:
      "A steady place to talk through the tender parts of new parenthood — worry, big feelings, or your birth story.",
  },
  {
    id: "p3",
    name: "Priya Nair",
    credential: "DPT",
    type: "Body recovery",
    city: "Berkeley, CA",
    languages: "English · Hindi",
    blurb:
      "Gentle, unhurried work on core and pelvic floor as your body settles after birth, however yours arrived.",
  },
];

function ProvidersPage() {
  const [type, setType] = useState<ProviderType>("All");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((p) => {
      if (type !== "All" && p.type !== type) return false;
      if (q && !`${p.name} ${p.city}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [type, query]);

  return (
    <AppShell>
      <h1 className="font-serif text-3xl">A few people who can help</h1>
      <p className="mt-2 text-muted-foreground">
        A small sample of the perinatal professionals families lean on. Have a look, no commitment —
        we'll help you find the right fit whenever you're ready.
      </p>

      <div className="mt-6 rounded-2xl bg-card/70 border border-border/60 p-4 space-y-4">
        <div className="relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Look by name or city — e.g. San Francisco, Oakland"
            aria-label="Search providers by name or city"
            className="pl-9 rounded-full bg-background"
          />
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-primary mb-2">
            What you're looking for
          </p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        {results.length} {results.length === 1 ? "example" : "examples"}
      </p>

      {results.length > 0 ? (
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          {results.map((p) => (
            <article key={p.id} className="rounded-2xl bg-card/70 border border-border/60 p-5">
              <div className="flex items-start gap-3">
                <span className="h-11 w-11 shrink-0 rounded-full bg-primary/10 text-primary grid place-items-center font-serif text-lg">
                  {p.name.charAt(0)}
                </span>
                <div className="min-w-0">
                  <h2 className="font-medium leading-tight">
                    {p.name}
                    <span className="text-muted-foreground font-normal">, {p.credential}</span>
                  </h2>
                  <p className="text-xs text-primary mt-0.5">{p.type}</p>
                </div>
              </div>

              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{p.blurb}</p>

              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> {p.city}
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe2 className="h-3 w-3" /> {p.languages}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-card/70 border border-border/60 p-8 text-center">
          <img
            src={emptyIllustration}
            alt="Illustration of cupped hands holding a small sprouting plant"
            loading="lazy"
            width={768}
            height={576}
            className="mx-auto w-56 max-w-full rounded-2xl"
          />
          <h2 className="font-serif text-xl mt-5">{empty.noProviderMatchesTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {empty.noProviderMatches}
          </p>
          <button
            onClick={() => {
              setType("All");
              setQuery("");
            }}
            className="mt-5 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium min-h-11"
          >
            {cta.clearFilters}
          </button>
        </div>
      )}
    </AppShell>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-2 text-sm transition-colors border",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-secondary text-foreground border-transparent hover:bg-sand-deep",
      )}
    >
      {children}
    </button>
  );
}
