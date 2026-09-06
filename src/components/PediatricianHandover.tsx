import { Printer } from "lucide-react";

export interface HandoverData {
  patientName: string;
  dateOfBirth: string;
  chronologicalAge: string;
  gestationalAge: string;
  visitMilestone: string;
  motherName: string;
  nutrition: {
    avgFeeds: string;
    modality: string;
    wetDiapers: string;
    dirtyDiapers: string;
    stoolCharacteristic: string;
  };
  regulation: {
    primaryDaytimeState: string;
    avgSoothingLatency: string;
    autonomicNotes: string;
  };
  maternal: {
    longestSleepStretch: string;
    epds3Score: number; // 0-9
  };
  priorities: string[];
}

export const defaultHandoverData: HandoverData = {
  patientName: "—",
  dateOfBirth: "—",
  chronologicalAge: "—",
  gestationalAge: "—",
  visitMilestone: "2-Week Well-Child",
  motherName: "—",
  nutrition: {
    avgFeeds: "—",
    modality: "—",
    wetDiapers: "—",
    dirtyDiapers: "—",
    stoolCharacteristic: "—",
  },
  regulation: {
    primaryDaytimeState: "—",
    avgSoothingLatency: "—",
    autonomicNotes: "—",
  },
  maternal: { longestSleepStretch: "—", epds3Score: 0 },
  priorities: ["", "", ""],
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

export function PediatricianHandover({ data = defaultHandoverData }: { data?: HandoverData }) {
  const { nutrition, regulation, maternal } = data;

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
        <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
          Vela Clinical Dyad Summary
        </h1>
        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
          <Field label="Patient Name" value={data.patientName} />
          <Field label="Date of Birth" value={data.dateOfBirth} />
          <Field label="Chronological Age" value={data.chronologicalAge} />
          <Field label="Gestational Age" value={data.gestationalAge} />
          <Field label="Visit Milestone" value={data.visitMilestone} />
          <Field label="Mother's Name" value={data.motherName} />
        </dl>
        <p className="mt-4 text-[11px] italic text-slate-500">
          Prepared via Vela Postpartum Companion with Nurture The Roots.
        </p>
      </header>

      {/* Clinical grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
        <Section title="Nutrition &amp; Elimination (Last 48 Hours)">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Average Feeds / 24h" value={nutrition.avgFeeds} />
            <Field
              label="Feeding Modality"
              value={
                <span className="inline-block rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-800">
                  {nutrition.modality}
                </span>
              }
            />
            <Field label="Wet Diapers / 24h" value={nutrition.wetDiapers} />
            <Field label="Dirty Diapers / 24h" value={nutrition.dirtyDiapers} />
            <div className="col-span-2">
              <Field label="Stool Characteristic" value={nutrition.stoolCharacteristic} />
            </div>
          </dl>
        </Section>

        <Section title="Brazelton NBO &amp; Infant State Regulation">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Primary Daytime State" value={regulation.primaryDaytimeState} />
            <Field label="Avg. Soothing Latency" value={regulation.avgSoothingLatency} />
            <div className="col-span-2">
              <Field label="Autonomic Stability Notes" value={regulation.autonomicNotes} />
            </div>
          </dl>
        </Section>

        <Section title="Maternal Postpartum Recovery &amp; EPDS-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Longest Consolidated Sleep (24h)" value={maternal.longestSleepStretch} />
            <Field
              label="EPDS-3 Score"
              value={
                <span className="font-medium tabular-nums">
                  {maternal.epds3Score} <span className="text-slate-500 font-normal">/ 9</span>
                </span>
              }
            />
            <div className="col-span-2">
              <div
                className="h-1.5 w-full rounded-full bg-slate-200 print:border print:border-slate-300"
                role="img"
                aria-label={`EPDS-3 score ${maternal.epds3Score} of 9`}
              >
                <div
                  className="h-full rounded-full bg-slate-800"
                  style={{ width: `${Math.min(Math.max(maternal.epds3Score, 0), 9) * (100 / 9)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                EPDS-3 is a three-item subscale reported for clinician review. Not a diagnosis.
              </p>
            </div>
          </dl>
        </Section>

        <Section title="Parent Priority Agenda for Physician">
          <ul className="space-y-3">
            {data.priorities.slice(0, 3).map((item, i) => (
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
