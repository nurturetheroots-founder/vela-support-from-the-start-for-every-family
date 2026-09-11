export interface EducationModule {
  id: string;
  week: number;
  title: string;
  readTime: number;
  tags: string[];
  excerpt: string;
  body: string[];
}

export const educationModules: EducationModule[] = [
  {
    id: "w1",
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
    id: "w2",
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
    id: "w3",
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
    id: "w4",
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
    id: "w5",
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
    id: "w6",
    week: 6,
    title: "The six-week mark: what it actually means",
    readTime: 5,
    tags: ["recovery", "mental health"],
    excerpt: "The six-week visit isn't a finish line — here's a more honest map.",
    body: [
      "The six-week visit was designed for medical clearance, not emotional or identity recovery. Those take time, and the fourth trimester is still unfolding.",
      "You may feel more like yourself, or less. Both are common. There's no set timeline for feeling 'back to normal' — because normal has shifted.",
      "We'll do an EPDS screening around now. It's not a test — it's a way to make sure support finds you if you need it.",
    ],
  },
  {
    id: "w7",
    week: 7,
    title: "Building rhythms that fit your family",
    readTime: 4,
    tags: ["newborn care", "recovery"],
    excerpt: "Routines vs. rhythms — and why the latter is kinder in month two.",
    body: [
      "Week seven often brings a vague sense that things should feel more predictable by now. They might, or they might not — and neither means you're doing it wrong.",
      "Rhythms are looser than routines. They bend around bad nights, growth spurts, and days when everything feels off. That's the point.",
      "One reliable anchor is enough: a walk after the first feed, a song before naps, or a single deep breath before picking baby up. Start small.",
    ],
  },
  {
    id: "w8",
    week: 8,
    title: "Your changing body, eight weeks in",
    readTime: 4,
    tags: ["recovery"],
    excerpt: "What healing looks like now, and when to check in with a provider.",
    body: [
      "By eight weeks, most bodies have settled into a new baseline. You might have more energy, or you might still feel like you're operating at half power.",
      "Pelvic floor symptoms, persistent pain, or bleeding that returns after stopping are worth mentioning at your visit. You don't have to wait for the 'right' time.",
      "Gentle movement is welcome when it feels good. There's no required timeline for exercise — only what your body is ready for.",
    ],
  },
  {
    id: "w9",
    week: 9,
    title: "The social shift: visitors, boundaries, and isolation",
    readTime: 5,
    tags: ["mental health"],
    excerpt: "Why the two-month mark can feel surprisingly lonely — and what helps.",
    body: [
      "By week nine, the initial wave of support often slows. Visitors taper, partners return to work, and the quiet can feel heavier than expected.",
      "This is a common time for loneliness to surface — not because anything is wrong with you, but because the scaffolding has changed.",
      "Small connections matter: a text thread with another parent, a walk with a neighbor, or even a brief voice note. You don't have to do this in silence.",
    ],
  },
  {
    id: "w10",
    week: 10,
    title: "Sleep evolution at two months",
    readTime: 4,
    tags: ["newborn care"],
    excerpt: "What changes at ten weeks — and what still counts as normal.",
    body: [
      "Around ten weeks, some babies start stretching their first sleep stretch. Others don't. Both are well within the range of normal.",
      "You might be experimenting with swaddles, bassinet transitions, or sidecar setups. There's no single right answer — only what helps everyone rest a little more.",
      "Your sleep matters just as much as theirs. One longer stretch for you can shift your whole day. Protect it however you can.",
    ],
  },
  {
    id: "w11",
    week: 11,
    title: "Feeding at two and a half months",
    readTime: 4,
    tags: ["feeding"],
    excerpt: "Growth spurts, supply worries, and when to reach out for help.",
    body: [
      "Week eleven sometimes brings a growth spurt — more feeds, more fussing, and more questions about whether baby is getting enough.",
      "If you're breastfeeding, cluster feeding is usually a sign that baby is increasing your supply, not that it's failing. If it hurts or you're unsure, a lactation consult is worth it.",
      "However you feed, you're doing enough. The goal is a fed baby and a parent who feels supported in their choices.",
    ],
  },
  {
    id: "w12",
    week: 12,
    title: "The three-month turning point",
    readTime: 5,
    tags: ["mental health", "newborn care"],
    excerpt: "What's shifting at twelve weeks — for baby, for you, and for your sense of self.",
    body: [
      "At three months, many babies begin to interact more deliberately — smiles, coos, longer awake windows. It's a subtle but real shift.",
      "For you, this can bring a mix of relief and grief. The newborn fog may be lifting, and with it comes more space to feel everything you didn't have room for before.",
      "We'll do another EPDS screening around now. Even if things feel better, checking in is part of tending to yourself.",
    ],
  },
  {
    id: "w13",
    week: 13,
    title: "Returning to work, or not",
    readTime: 5,
    tags: ["recovery", "mental health"],
    excerpt: "Navigating leave endings, identity shifts, and the logistics of care.",
    body: [
      "For many parents, week thirteen is when leave ends or decisions about work crystallize. Both paths — returning or staying — come with real ambivalence.",
      "If you're going back, the transition is usually harder in anticipation than in reality. If you're staying, the isolation can surprise you.",
      "There's no universally right choice. There's only the one that fits your family, with support wrapped around it.",
    ],
  },
  {
    id: "w14",
    week: 14,
    title: "Your relationship, fourteen weeks in",
    readTime: 4,
    tags: ["mental health"],
    excerpt: "How partnership changes when a baby enters the picture — and how to stay connected.",
    body: [
      "By fourteen weeks, the early survival mode has softened for some couples — and revealed cracks for others. Both are normal.",
      "Small rituals help: a five-minute check-in at the end of the day, trading off who handles the night wake, or simply saying 'this is hard' out loud.",
      "Intimacy may look different now. Desire often returns slowly, and sometimes not at all for a while. There's no deadline for feeling like partners again.",
    ],
  },
  {
    id: "w15",
    week: 15,
    title: "Movement and mood",
    readTime: 4,
    tags: ["recovery", "mental health"],
    excerpt: "Gentle ways to come back into your body in month four.",
    body: [
      "Fifteen weeks is a good time to notice what your body is asking for — not what a program says, but what actually feels restorative.",
      "Walking, stretching, dancing in the kitchen, or lying on the floor and breathing deeply all count as movement. There's no minimum.",
      "If you're still carrying tension, heaviness, or a sense that your body isn't yours, a pelvic-floor physical therapist can be transformative.",
    ],
  },
  {
    id: "w16",
    week: 16,
    title: "Closing the fourth trimester",
    readTime: 5,
    tags: ["mental health", "recovery"],
    excerpt: "What month four means — and why the need for support doesn't end here.",
    body: [
      "The fourth trimester is a framework, not a deadline. At four months, some things feel easier and some things feel harder. That's the texture of this season.",
      "If Vela has been helpful, you can keep your check-ins and learning going. If you're ready to step back, you'll carry what you've learned with you.",
      "We'll do a final EPDS screening around now. However you're feeling, it's worth naming — and it's worth having someone witness it.",
    ],
  },
];
