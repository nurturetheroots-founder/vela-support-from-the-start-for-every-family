export interface PediatricianHandoverData {
  visitDate: string;
  wellChildMilestone: "2-Week" | "1-Month" | "2-Month" | "Custom";
  infant: {
    fullName: string;
    dob: string;
    chronologicalAgeDays: number;
    gestationalAgeWeeks: number;
    birthWeightLbs?: number;
    lastRecordedWeightLbs?: number;
  };
  maternal: {
    fullName: string;
    parity: string;
    deliveryType: "Vaginal" | "Cesarean";
    feedingModality:
      | "Exclusive Human Milk"
      | "Direct Latch + EBM"
      | "Combination"
      | "Exclusive Formula";
  };
  vitalRhythms: {
    averageFeedsPer24h: number;
    elimination: {
      wetDiapers24h: number;
      soiledDiapers24h: number;
      stoolConsistency: "Meconium" | "Transitional" | "Normal Seedy Yellow" | "Atypical";
    };
    sleepConsolidation: {
      longestSleepStretchHours: number;
      nocturnalWakeningIntervalAvgHours: number;
    };
  };
  stateOrganization: {
    predominantDaytimeState:
      | "Quiet Alert (State 4)"
      | "Active Alert (State 5)"
      | "Fussy / Crying (State 6)";
    soothabilityLatencyMinutes: "< 5 min" | "5–15 min" | "> 15 min (Prolonged)";
    autonomicStabilityNotes: string[];
  };
  maternalWellbeing: {
    longestConsolidatedSleepHours: number;
    epds3Score: number;
    epds3AlertFlag: boolean;
    supportAtHome: "Solo Primary" | "Partner Present" | "Doula / Family Support";
  };
  targetedQuestionsForMD: string[];
}
