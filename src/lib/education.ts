export interface EducationModule {
  week: number;
  title: string;
  readTime: number;
  tags: string[];
  excerpt: string;
  body: string[];
}

export const educationModules: EducationModule[] = [
  {
    week: 1,
    title: "The first week: settling in together",
    readTime: 4,
    tags: ["recovery", "newborn care"],
    excerpt: "What's normal in week one — for your body, your baby, and your nervous system.",
    body: [
      "Week one is mostly a blur, and that's okay. Your body is doing enormous repair work while your baby is learning that life outside the womb is safe.",
      "Expect cluster feeds, day-night confusion, and big emotional weather. None of it means anything is wrong.",
      "What helps: short sleep windows when baby sleeps, warm food someone else made, and a low bar for everything that isn't feeding or resting.",
    ],
  },
  {
    week: 2,
    title: "Feeding rhythms: what 'going well' actually looks like",
    readTime: 5,
    tags: ["feeding"],
    excerpt: "Cluster feeding, growth spurts, and how to tell if baby is getting enough.",
    body: [
      "By week two, most babies are feeding every 2–3 hours, sometimes back-to-back. This is biology, not a problem to fix.",
      "Wet diapers and steady weight gain are the signals that matter. Feed length and schedule rarely are.",
      "If feeding hurts past the first few seconds of latch, that's worth getting help with — pain isn't part of the deal.",
    ],
  },
  {
    week: 3,
    title: "Postpartum hormones and your mood",
    readTime: 4,
    tags: ["mental health"],
    excerpt: "Baby blues, the third-week dip, and when to reach for more support.",
    body: [
      "Around week three many parents hit a hormonal dip. Tears that come from nowhere. A flatness that feels strange.",
      "Baby blues usually lift by week four. If they don't, or if they sharpen into anxiety, intrusive thoughts, or numbness, that's worth flagging.",
      "Your daily check-ins help us notice patterns gently — you don't have to track this alone.",
    ],
  },
  {
    week: 4,
    title: "Sleep without sleep training",
    readTime: 5,
    tags: ["newborn care"],
    excerpt: "What you can do at one month that supports rest for everyone.",
    body: [
      "Newborn sleep is wild because newborn sleep is supposed to be wild. There's nothing to train at four weeks.",
      "What you can do: light during the day, dim at night, and let baby fall asleep however they fall asleep.",
      "Your sleep is the bigger lever right now. One uninterrupted four-hour stretch can change a whole week.",
    ],
  },
  {
    week: 5,
    title: "Your body, five weeks in",
    readTime: 4,
    tags: ["recovery"],
    excerpt: "Bleeding, healing, and gentle ways to start moving again.",
    body: [
      "Lochia (postpartum bleeding) usually tapers around now. Bright red return after it slowed is a signal to rest more, not push through.",
      "Walking is enough. Anything that isn't walking can wait for your six-week visit.",
      "If something feels wrong in your body, trust that and ask. You know your baseline better than any chart.",
    ],
  },
  {
    week: 6,
    title: "The six-week mark: what it actually means",
    readTime: 5,
    tags: ["recovery", "mental health"],
    excerpt: "The six-week visit isn't a finish line — here's a more honest map.",
    body: [
      "The six-week visit was designed for medical clearance, not emotional or identity recovery. Those take much longer.",
      "You may feel more like yourself, or less. Both are common. Postpartum is closer to 12 months than 6 weeks.",
      "We'll do an EPDS screening around now. It's not a test — it's a way to make sure support finds you if you need it.",
    ],
  },
];