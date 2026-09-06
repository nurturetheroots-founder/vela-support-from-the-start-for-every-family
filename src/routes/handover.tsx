import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PediatricianHandover, type HandoverData } from "@/components/PediatricianHandover";
import { useStore, weekNumber } from "@/lib/store";

export const Route = createFileRoute("/handover")({
  head: () => ({
    meta: [
      { title: "Pediatrician Handover Summary — Vela" },
      {
        name: "description",
        content:
          "A printable one-page clinical summary of feeding, elimination, infant state regulation, and maternal recovery to bring to your next well-child visit.",
      },
      { property: "og:title", content: "Pediatrician Handover Summary — Vela" },
      {
        property: "og:description",
        content: "A printable one-page summary to bring to your next well-child visit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HandoverPage,
});

function HandoverPage() {
  const profile = useStore((s) => s.profile);
  const checkins = useStore((s) => s.checkins);
  const screenings = useStore((s) => s.screenings);
  const infantStates = useStore((s) => s.infantStates);
  const { week } = weekNumber(profile);

  const birth = profile.birthDate ? new Date(profile.birthDate) : null;
  const ageDays = birth
    ? Math.max(0, Math.round((Date.now() - birth.getTime()) / 86_400_000))
    : Math.max(week, 1) * 7;

  const lastScreening = screenings[screenings.length - 1];
  const epds3 = lastScreening
    ? Math.min(9, Math.round((lastScreening.score / 30) * 9))
    : 2;

  const recentSleep = checkins.slice(-3).map((c) => c.sleep);
  const longestSleep = recentSleep.includes("good")
    ? "4–5 hours"
    : recentSleep.includes("fair")
      ? "3 hours"
      : "2 hours";

  const stateCounts = infantStates.reduce<Record<string, number>>((acc, l) => {
    acc[l.stateLabel] = (acc[l.stateLabel] ?? 0) + 1;
    return acc;
  }, {});
  const predominant =
    Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Quiet alert";

  const milestone =
    ageDays <= 21 ? "2-Week Well-Child" : ageDays <= 45 ? "1-Month Well-Child" : "2-Month Well-Child";

  const data: HandoverData = {
    patientName: profile.name ? `Baby ${profile.name}` : "Baby (demo)",
    dateOfBirth: profile.birthDate ?? "—",
    chronologicalAge: `${ageDays} days`,
    gestationalAge: "39 weeks 9 days at birth",
    visitMilestone: milestone,
    motherName: profile.name || "Parent (demo)",
    nutrition: {
      avgFeeds: "9 per 24h",
      modality: "Direct latch + expressed milk",
      wetDiapers: "7 per 24h",
      dirtyDiapers: "3 per 24h",
      stoolCharacteristic: "Normal seedy yellow",
    },
    regulation: {
      primaryDaytimeState: predominant,
      avgSoothingLatency: "5–15 min",
      autonomicNotes:
        "Color stable during feeds; occasional hiccups and mild startle when the room is bright. Settles with containment hold.",
    },
    maternal: { longestSleepStretch: longestSleep, epds3Score: epds3 },
    priorities: [
      "Feeding comfort — latch pain in the evenings",
      "Sleep stretches: what is typical at this age?",
      "Weight gain check and next visit timing",
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-[8.5in] px-5 pt-5 print:hidden">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
      <PediatricianHandover data={data} />
    </div>
  );
}
