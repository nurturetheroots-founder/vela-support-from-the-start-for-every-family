/**
 * Vela microcopy system.
 *
 * One home for tone. Every heading, button label, empty state, and error message
 * in the app should come from here so the voice stays warm, grounded, and
 * non-clinical everywhere.
 *
 * Voice rules baked into these strings:
 *  - Speak with the parent, never at them. No "should", no urgency, no "bounce back".
 *  - Name the feeling before the action.
 *  - Gender-neutral, family-structure-neutral.
 *  - Offers, not gates: every CTA is an invitation the parent can decline.
 */

/** Time-aware greeting used on dashboards and welcome moments. */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Still awake";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Greeting with an optional first name, already punctuated. */
export function greetName(name?: string, date?: Date): string {
  return `${greeting(date)}${name ? `, ${name}` : ""}.`;
}

/** Button and link labels. Verbs are gentle and optional-feeling. */
export const cta = {
  start: "Start check-in",
  continue: "Continue",
  save: "Save today's check-in",
  saveLog: "Save to daily timeline",
  back: "Back",
  backHome: "Back to home",
  tryAgain: "Try once more",
  clearFilters: "Clear filters",
  readGuide: "Read this week's guide",
  browseGuides: "Browse all guides",
  takeScreening: "Take the screening",
  findDoula: "Talk with a doula",
  findTherapist: "Start a referral",
  seeSupport: "See support options",
  seeDirectory: "Find someone near you",
  notNow: "Not right now",
  done: "Done for now",
} as const;

/** Section headings, kept short and human. */
export const heading = {
  dashboard: "Today",
  checkin: "How's today?",
  guides: "Weekly guides",
  screening: "A gentle check-in on you",
  support: "Support",
  directory: "Provider & specialist directory",
  symptoms: "Your safety & care always come first",
  timeline: "What to expect next.",
} as const;

/** Supporting lines that sit under headings. */
export const subhead = {
  checkin: "Sixty seconds, whenever you can. There are no wrong answers here.",
  guides:
    "Short reads that meet you where your week is. Take them in any order, or skip one entirely — nothing here is homework.",
  support: "Three ways to be held. Use one, use all — at whatever pace feels right.",
  screening:
    "There are no right answers. Pick whatever feels closest to your last seven days, and we'll talk through what it means together at the end.",
} as const;

/** Empty and no-data states. Absence is never framed as failure. */
export const empty = {
  noCheckinsYet:
    "Nothing logged yet, and that's a fine place to start. Sixty seconds, whenever you have them.",
  checkedInToday: "Rest easy — today is already noted. We'll be here again tomorrow.",
  noStatesToday: "Nothing logged yet today — no rush.",
  noGuideMatches: "Nothing here matches yet. Try another word, or clear the filter.",
  noProviderMatchesTitle: "No matches yet",
  noProviderMatches:
    "We haven't added a provider that fits this combination. Try a nearby city or fewer filters — and our care team can help you look further.",
  noScreeningsYet: "No screenings yet. One will come around gently when it's time.",
  noHistory: "Nothing saved here yet. Whatever you log, it stays yours.",
} as const;

/** Errors and loading. Always take the blame off the parent. */
export const problem = {
  notFoundTitle: "This page isn't here.",
  notFound:
    "Nothing is broken on your end — this path just doesn't exist anymore. Let's get you back to somewhere steady.",
  errorTitle: "This didn't load — and that's on us.",
  error:
    "Something hiccuped on our side, not yours. Your check-ins and notes are safe. Try once more, or head home and come back whenever.",
  fetchFailed: "We couldn't reach that page just now. Try again in a moment.",
  offline: "You're offline right now. Anything you write will be waiting when you're back.",
  loading: "One moment — gathering your week.",
  saving: "Saving, gently.",
} as const;

/** Confirmations, toasts, and after-the-fact reassurance. */
export const affirm = {
  checkinSaved: "Thank you for checking in.",
  checkinSavedBody: "Showing up for yourself, even for a minute, is care. We'll be here tomorrow.",
  checkinFlaggedBody:
    "We've noticed a few harder days in a row. There's nothing wrong with you — and you don't have to ride this out alone. A doula or a screening might help.",
  stateLogged: (time: string) => `State logged at ${time}`,
  privacy: "Private to you. Nothing is shared without you asking.",
} as const;

/** Screening result framing, per band. */
export const screeningBand = {
  low: "This week looks steady, and that's worth noticing.",
  mid: "There's some heaviness sitting with you right now.",
  high: "You deserve a real person alongside you today.",
} as const;

/** Safety, medical, and crisis disclosures. Same words everywhere. */
export const legal = {
  disclaimer:
    "Vela is a supportive companion, not a clinician or medical provider. If you are experiencing a medical emergency or mental health crisis, call 911, 988, or your healthcare provider immediately.",
  termsLink: "Terms of Service & Medical Disclaimer",
  onboardingConsent:
    "I understand that Vela is a support tool and does not provide medical or psychiatric advice, diagnosis, or treatment. I agree to the Terms of Service.",
  epdsNudge:
    "Your well-being matters. The EPDS is a screening tool, not a diagnosis. If you are feeling overwhelmed or in crisis, please call or text 988 (Suicide & Crisis Lifeline) or the National Maternal Mental Health Hotline at 1-833-TLC-MAMA.",
  crisisTitle: "Let's get a person alongside you right now.",
  crisisBody:
    "What you shared points to more than a hard week. You are not failing, and you don't have to hold this alone. Please reach out to one of these lines now, or seek immediate medical attention if you feel unsafe.",
} as const;

export const microcopy = {
  greeting,
  greetName,
  cta,
  heading,
  subhead,
  empty,
  problem,
  affirm,
  screeningBand,
  legal,
} as const;
