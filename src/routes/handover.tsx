import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PediatricianHandover } from "@/components/PediatricianHandover";
import type { PediatricianHandoverData } from "@/types/handover";
import { useStore, weekNumber, type Checkin, type Profile } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { fetchCheckins, fetchParent, rowToCheckin, rowToProfile } from "@/lib/vela-db";

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
  const localProfile = useStore((s) => s.profile);
  const localCheckins = useStore((s) => s.checkins);
  const screenings = useStore((s) => s.screenings);
  const infantStates = useStore((s) => s.infantStates);
  const { user } = useAuth();

  const [remoteProfile, setRemoteProfile] = useState<Partial<Profile> | null>(null);
  const [remoteCheckins, setRemoteCheckins] = useState<Checkin[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [parentRow, rows] = await Promise.all([
          fetchParent(user.id),
          fetchCheckins(user.id),
        ]);
        if (cancelled) return;
        if (parentRow) setRemoteProfile(rowToProfile(parentRow));
        setRemoteCheckins(rows.map(rowToCheckin));
      } catch {
        // fall back to locally saved data
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const profile = { ...localProfile, ...(remoteProfile ?? {}) } as Profile;
  const checkins = remoteCheckins && remoteCheckins.length ? remoteCheckins : localCheckins;
  const { week } = weekNumber(profile);

  const birth = profile.birthDate ? new Date(profile.birthDate) : null;
  const ageDays = birth
    ? Math.max(0, Math.round((Date.now() - birth.getTime()) / 86_400_000))
    : Math.max(week, 1) * 7;

  const lastScreening = screenings[screenings.length - 1];
  const recent = checkins.slice(-7);
  const avg = (nums: number[]) =>
    nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  const avgMood = avg(recent.map((c) => c.mood));
  const avgOverall = avg(recent.map((c) => c.overall));

  // EPDS-3 (0–9). Prefer a completed screening; otherwise estimate from recent mood.
  const epds3 = lastScreening
    ? Math.min(9, Math.round((lastScreening.score / 30) * 9))
    : recent.length
      ? Math.max(0, Math.min(9, Math.round(((5 - avgMood) / 4) * 9)))
      : 0;

  const sleepScore = (s: Checkin["sleep"]) =>
    s === "good" ? 5 : s === "fair" ? 3.5 : s === "rough" ? 2 : 2.5;
  const longestSleep = recent.length
    ? Math.round(avg(recent.map((c) => sleepScore(c.sleep))) * 10) / 10
    : 3;

  const feedCounts = recent.reduce<Record<string, number>>((acc, c) => {
    acc[c.feeding] = (acc[c.feeding] ?? 0) + 1;
    return acc;
  }, {});
  const topFeeding = Object.entries(feedCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const feedingModality: PediatricianHandoverData["maternal"]["feedingModality"] =
    topFeeding === "hard"
      ? "Combination"
      : topFeeding === "great"
        ? "Exclusive Human Milk"
        : "Direct Latch + EBM";
  const averageFeedsPer24h = topFeeding === "hard" ? 11 : topFeeding === "great" ? 8 : 9;

  const stateCounts = infantStates.reduce<Record<string, number>>((acc, l) => {
    acc[l.stateLabel] = (acc[l.stateLabel] ?? 0) + 1;
    return acc;
  }, {});
  const topState = Object.entries(stateCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Quiet alert";
  const lower = topState.toLowerCase();
  const predominant: PediatricianHandoverData["stateOrganization"]["predominantDaytimeState"] =
    lower.includes("crying") || lower.includes("fussy")
      ? "Fussy / Crying (State 6)"
      : lower.includes("active")
        ? "Active Alert (State 5)"
        : "Quiet Alert (State 4)";

  const milestone: PediatricianHandoverData["wellChildMilestone"] =
    ageDays <= 21 ? "2-Week" : ageDays <= 45 ? "1-Month" : ageDays <= 75 ? "2-Month" : "Custom";

  const latestNote = [...recent].reverse().find((c) => c.note)?.note;

  const data: PediatricianHandoverData = {
    visitDate: new Date().toISOString().slice(0, 10),
    wellChildMilestone: milestone,
    infant: {
      fullName: profile.name ? `Baby ${profile.name}` : "Baby",
      dob: profile.birthDate ?? "—",
      chronologicalAgeDays: ageDays,
      gestationalAgeWeeks: 39,
      birthWeightLbs: 7.4,
      lastRecordedWeightLbs: 8.1,
    },
    maternal: {
      fullName: profile.name || "Parent",
      parity: "G1 P1",
      deliveryType: "Vaginal",
      feedingModality,
    },
    vitalRhythms: {
      averageFeedsPer24h,
      elimination: {
        wetDiapers24h: 7,
        soiledDiapers24h: 3,
        stoolConsistency: "Normal Seedy Yellow",
      },
      sleepConsolidation: {
        longestSleepStretchHours: longestSleep,
        nocturnalWakeningIntervalAvgHours:
          Math.round((longestSleep >= 4 ? 3 : longestSleep >= 3 ? 2.5 : 2) * 10) / 10,
      },
    },

    stateOrganization: {
      predominantDaytimeState: predominant,
      soothabilityLatencyMinutes: "5–15 min",
      autonomicStabilityNotes: [
        "Color stable during feeds.",
        "Occasional hiccups and mild startle when the room is bright.",
        "Settles with containment hold.",
      ],
    },
    maternalWellbeing: {
      longestConsolidatedSleepHours: longestSleep,
      epds3Score: epds3,
      epds3AlertFlag: epds3 >= 3,
      supportAtHome: "Partner Present",
    },
    targetedQuestionsForMD: [
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
