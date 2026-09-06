import { Printer } from "lucide-react";
import type { PediatricianHandoverData } from "@/types/handover";

export const defaultHandoverData: PediatricianHandoverData = {
  visitDate: "—",
  wellChildMilestone: "2-Week",
  infant: {
    fullName: "—",
    dob: "—",
    chronologicalAgeDays: 0,
    gestationalAgeWeeks: 0,
  },
  maternal: {
    fullName: "—",
    parity: "—",
    deliveryType: "Vaginal",
    feedingModality: "Exclusive Human Milk",
  },
  vitalRhythms: {
    averageFeedsPer24h: 0,
    elimination: { wetDiapers24h: 0, soiledDiapers24h: 0, stoolConsistency: "Transitional" },
    sleepConsolidation: { longestSleepStretchHours: 0, nocturnalWakeningIntervalAvgHours: 0 },
  },
  stateOrganization: {
    predominantDaytimeState: "Quiet Alert (State 4)",
    soothabilityLatencyMinutes: "5–15 min",
    autonomicStabilityNotes: [],
  },
  maternalWellbeing: {
    longestConsolidatedSleepHours: 0,
    epds3Score: 0,
    epds3AlertFlag: false,
    supportAtHome: "Partner Present",
  },
  targetedQuestionsForMD: ["", "", ""],
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 mt-0.5 break-words">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-slate-300 rounded-md p-4 break-inside-avoid print:rounded-none">
      <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-slate-900 border-b border-slate-300 pb-2 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-800">
      {children}
    </span>
  );
}

export function PediatricianHandover({
  data = defaultHandoverData,
}: {
  data?: PediatricianHandoverData;
}) {
  const { infant, maternal, vitalRhythms, stateOrganization, maternalWellbeing } = data;
  const { elimination, sleepConsolidation } = vitalRhythms;
  const epds = Math.min(Math.max(maternalWellbeing.epds3Score, 0), 9);
  const weeks = Math.floor(infant.chronologicalAgeDays / 7);
  const days = infant.chronologicalAgeDays % 7;

  return (
    <div className="mx-auto w-full max-w-[8.5in] bg-white text-slate-900 font-sans p-5 sm:p-8 print:p-0 print:max-w-none">
      {/* Action bar */}
      <div className="flex justify-end mb-5 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          <Printer className="h-4 w-4" />
          Export PDF / Print for Doctor
        </button>
      </div>

      {/* Header */}
      <header className="border-b-2 border-slate-900 pb-4 mb-5">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            Vela Clinical Dyad Summary
          </h1>
          <span className="text-[11px] text-slate-500 whitespace-nowrap">
            Visit date: {data.visitDate}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          <Field label="Patient Name" value={infant.fullName} />
          <Field label="Date of Birth" value={infant.dob} />
          <Field
            label="Chronological Age"
            value={`${infant.chronologicalAgeDays} days (${weeks}w ${days}d)`}
          />
          <Field label="Gestational Age at Birth" value={`${infant.gestationalAgeWeeks} weeks`} />
          <Field label="Visit Milestone" value={`${data.wellChildMilestone} Well-Child`} />
          <Field label="Mother's Name" value={maternal.fullName} />
          {(infant.birthWeightLbs !== undefined || infant.lastRecordedWeightLbs !== undefined) && (
            <>
              <Field
                label="Birth Weight"
                value={infant.birthWeightLbs !== undefined ? `${infant.birthWeightLbs} lbs` : "—"}
              />
              <Field
                label="Last Recorded Weight"
                value={
                  infant.lastRecordedWeightLbs !== undefined
                    ? `${infant.lastRecordedWeightLbs} lbs`
                    : "—"
                }
              />
            </>
          )}
          <Field label="Parity" value={maternal.parity} />
          <Field label="Delivery Type" value={maternal.deliveryType} />
        </dl>
        <p className="mt-4 text-[11px] italic text-slate-500">
          Prepared via Vela Postpartum Companion with Nurture The Roots.
        </p>
      </header>

      {/* Clinical grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
        <Section title="Nutrition &amp; Elimination (Last 48 Hours)">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field
              label="Average Feeds / 24h"
              value={<span className="tabular-nums">{vitalRhythms.averageFeedsPer24h}</span>}
            />
            <Field label="Feeding Modality" value={<Badge>{maternal.feedingModality}</Badge>} />
            <Field
              label="Wet Diapers / 24h"
              value={<span className="tabular-nums">{elimination.wetDiapers24h}</span>}
            />
            <Field
              label="Soiled Diapers / 24h"
              value={<span className="tabular-nums">{elimination.soiledDiapers24h}</span>}
            />
            <div className="col-span-2">
              <Field label="Stool Consistency" value={elimination.stoolConsistency} />
            </div>
          </dl>
        </Section>

        <Section title="Brazelton NBO &amp; Infant State Regulation">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Predominant Daytime State" value={stateOrganization.predominantDaytimeState} />
            <Field
              label="Soothability Latency"
              value={stateOrganization.soothabilityLatencyMinutes}
            />
            <Field
              label="Longest Infant Sleep Stretch"
              value={`${sleepConsolidation.longestSleepStretchHours} h`}
            />
            <Field
              label="Avg. Nocturnal Waking Interval"
              value={`${sleepConsolidation.nocturnalWakeningIntervalAvgHours} h`}
            />
            <div className="col-span-2">
              <dt className="text-[10px] uppercase tracking-wider text-slate-500">
                Autonomic Stability Notes
              </dt>
              <dd className="mt-1">
                {stateOrganization.autonomicStabilityNotes.length ? (
                  <ul className="list-disc pl-4 space-y-1 text-sm text-slate-900">
                    {stateOrganization.autonomicStabilityNotes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-slate-900">—</span>
                )}
              </dd>
            </div>
          </dl>
        </Section>

        <Section title="Maternal Postpartum Recovery &amp; EPDS-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field
              label="Longest Consolidated Sleep (24h)"
              value={`${maternalWellbeing.longestConsolidatedSleepHours} h`}
            />
            <Field
              label="EPDS-3 Score"
              value={
                <span className="font-medium tabular-nums">
                  {epds} <span className="text-slate-500 font-normal">/ 9</span>
                  {maternalWellbeing.epds3AlertFlag && (
                    <span className="ml-2 rounded-full border border-slate-400 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                      Review indicated
                    </span>
                  )}
                </span>
              }
            />
            <div className="col-span-2">
              <div
                className="h-1.5 w-full rounded-full bg-slate-200 print:border print:border-slate-300"
                role="img"
                aria-label={`EPDS-3 score ${epds} of 9`}
              >
                <div
                  className="h-full rounded-full bg-slate-800"
                  style={{ width: `${epds * (100 / 9)}%` }}
                />
              </div>
            </div>
            <div className="col-span-2">
              <Field label="Support at Home" value={maternalWellbeing.supportAtHome} />
              <p className="mt-2 text-[11px] text-slate-500">
                EPDS-3 is a three-item subscale reported for clinician review. Not a diagnosis.
              </p>
            </div>
          </dl>
        </Section>

        <Section title="Parent Priority Agenda for Physician">
          <ul className="space-y-3">
            {data.targetedQuestionsForMD.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 border border-slate-400 rounded-[2px]"
                />
                <span className="text-sm text-slate-900 border-b border-dotted border-slate-300 flex-1 min-h-5">
                  {item}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-slate-500">
            For parent and clinician to review together during the exam.
          </p>
        </Section>
      </div>

      <footer className="mt-6 border-t border-slate-300 pt-3 text-[10px] text-slate-500">
        This summary is a caregiver-reported record intended to support conversation at a scheduled
        visit. It is not a diagnostic tool and does not replace clinical evaluation.
      </footer>
    </div>
  );
}

export default PediatricianHandover;
