import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { getState } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Globe2, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import emptyIllustration from "@/assets/empty-providers.jpg";

export const Route = createFileRoute("/providers")({
  head: () => ({
    meta: [
      { title: "Provider Directory — Vela" },
      {
        name: "description",
        content:
          "Find perinatal providers near you: IBCLC lactation consultants, perinatal mental health clinicians, pelvic floor PTs, and postpartum doulas.",
      },
      { property: "og:title", content: "Provider Directory — Vela" },
      {
        property: "og:description",
        content:
          "Search perinatal specialists by type, coverage, name, or city — lactation, mental health, pelvic floor, and postpartum doula care.",
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

const TYPES = [
  "All",
  "IBCLC Lactation",
  "Perinatal Mental Health",
  "Pelvic Floor PT",
  "Postpartum Doula",
] as const;

const COVERAGES = [
  "Carrot Fertility Approved",
  "Insurance/Superbill",
  "Private Pay",
] as const;

type ProviderType = (typeof TYPES)[number];
type Coverage = (typeof COVERAGES)[number];

interface Provider {
  id: string;
  name: string;
  credential: string;
  type: Exclude<ProviderType, "All">;
  city: string;
  languages: string;
  blurb: string;
  coverage: Coverage[];
}

const providers: Provider[] = [
  {
    id: "p1",
    name: "Maya Reyes",
    credential: "IBCLC",
    type: "IBCLC Lactation",
    city: "San Francisco, CA",
    languages: "English · Spanish",
    blurb: "Home and video visits for latch, supply, and weaning at your own pace.",
    coverage: ["Insurance/Superbill", "Carrot Fertility Approved"],
  },
  {
    id: "p2",
    name: "Dana Whitfield",
    credential: "LCSW, PMH-C",
    type: "Perinatal Mental Health",
    city: "Oakland, CA",
    languages: "English",
    blurb: "Therapy for postpartum anxiety, intrusive thoughts, and birth processing.",
    coverage: ["Insurance/Superbill", "Private Pay"],
  },
  {
    id: "p3",
    name: "Priya Nair",
    credential: "DPT",
    type: "Pelvic Floor PT",
    city: "Berkeley, CA",
    languages: "English · Hindi",
    blurb: "Core and pelvic floor recovery after vaginal birth or cesarean.",
    coverage: ["Insurance/Superbill"],
  },
  {
    id: "p4",
    name: "Aisha Okafor",
    credential: "CPD",
    type: "Postpartum Doula",
    city: "Oakland, CA",
    languages: "English · Yoruba",
    blurb: "Overnight and daytime support with a focus on Black maternal health.",
    coverage: ["Private Pay", "Carrot Fertility Approved"],
  },
  {
    id: "p5",
    name: "Linh Tran",
    credential: "IBCLC, RN",
    type: "IBCLC Lactation",
    city: "San Jose, CA",
    languages: "English · Vietnamese",
    blurb: "NICU graduates, bottle refusal, and pumping plans that fit real life.",
    coverage: ["Insurance/Superbill", "Private Pay"],
  },
  {
    id: "p6",
    name: "Sam Okonkwo",
    credential: "PMHNP",
    type: "Perinatal Mental Health",
    city: "San Francisco, CA",
    languages: "English",
    blurb: "Medication consults for perinatal mood, including while breastfeeding.",
    coverage: ["Insurance/Superbill", "Carrot Fertility Approved"],
  },
  {
    id: "p7",
    name: "Renata Alves",
    credential: "DPT",
    type: "Pelvic Floor PT",
    city: "Daly City, CA",
    languages: "English · Portuguese",
    blurb: "Diastasis, leaking, and returning to movement without pushing through pain.",
    coverage: ["Private Pay"],
  },
  {
    id: "p8",
    name: "Jordan Kim",
    credential: "CPD, CLC",
    type: "Postpartum Doula",
    city: "Berkeley, CA",
    languages: "English · Korean",
    blurb: "Daytime care for twins and second-time families, with sibling support.",
    coverage: ["Private Pay", "Insurance/Superbill"],
  },
];

function ProvidersPage() {
  const [type, setType] = useState<ProviderType>("All");
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return providers.filter((p) => {
      if (type !== "All" && p.type !== type) return false;
      if (coverage.length && !coverage.every((c) => p.coverage.includes(c))) return false;
      if (q && !`${p.name} ${p.city}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [type, coverage, query]);

  function toggleCoverage(c: Coverage) {
    setCoverage((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  return (
    <AppShell>
      <h1 className="font-serif text-3xl">Provider &amp; specialist directory</h1>
      <p className="mt-2 text-muted-foreground">
        Perinatal-trained care near you. Filter by what you need and how you'd like to pay.
      </p>

      <div className="mt-6 rounded-2xl bg-card border border-border/60 p-4 space-y-4">
        <div className="relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or city — e.g. San Francisco, Oakland"
            aria-label="Search providers by name or city"
            className="pl-9 rounded-full bg-background"
          />
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-primary mb-2">Type</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-primary mb-2">Coverage</p>
          <div className="flex flex-wrap gap-2">
            {COVERAGES.map((c) => (
              <Chip key={c} active={coverage.includes(c)} onClick={() => toggleCoverage(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        {results.length} {results.length === 1 ? "provider" : "providers"}
      </p>

      {results.length > 0 ? (
        <div className="mt-3 grid sm:grid-cols-2 gap-3">
          {results.map((p) => (
            <article key={p.id} className="rounded-2xl bg-card border border-border/60 p-5">
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

              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.coverage.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px]"
                  >
                    <BadgeCheck className="h-3 w-3 text-primary" />
                    {c}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-card border border-border/60 p-8 text-center">
          <img
            src={emptyIllustration}
            alt="Illustration of cupped hands holding a small sprouting plant"
            loading="lazy"
            width={768}
            height={576}
            className="mx-auto w-56 max-w-full rounded-2xl"
          />
          <h2 className="font-serif text-xl mt-5">No matches yet</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            We haven't added a provider that fits this combination. Try a nearby city or fewer
            filters — and our care team can help you look further.
          </p>
          <button
            onClick={() => {
              setType("All");
              setCoverage([]);
              setQuery("");
            }}
            className="mt-5 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium min-h-11"
          >
            Clear filters
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