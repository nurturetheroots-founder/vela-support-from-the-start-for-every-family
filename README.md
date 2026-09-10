Vela

Doula-first postpartum support platform, brand-aligned with Nurture the Roots™.

Vela extends trauma-informed postpartum care into a digital companion for families and the caregivers who support them — pairing daily wellness tracking with clinical screening, care coordination, and a clean handoff to pediatric providers.

Table of Contents
Overview
Core Features
Roles
Tech Stack
Architecture
MCP Data Bridge
Security & RLS
Design System
Getting Started
Overview

Vela is the tech extension of an in-person postpartum doula practice. It's built to feel less like a health app and more like a steady, knowledgeable presence — sharp where it needs to be (clinical screening, data integrity) and warm where it counts (daily check-ins, caregiver support).

Core Features
Home Dashboard — at-a-glance view of recent check-ins, alerts, and support resources
Onboarding — guided setup for new parents and caregivers
Daily Check-in — mood, sleep, and feeding tracking
EPDS Clinical Screening — Edinburgh Postnatal Depression Scale, with a Question 10 crisis intercept modal for immediate safety routing
Support Hub — curated education and resources
Pediatrician Handover Report (/handover) — exportable summary for provider visits
Care & Shift Tracker — timers and logs for caregiver shifts
Shift Handover Generator — structured handoff notes between caregivers
Draft Review & Approval Queue — parents review and approve agent-generated text before it's sent or saved
Roles

Vela uses role-based access control (RBAC) with two roles:

Role	Access
parent	Full access to their own wellness data, check-ins, screenings, and the Draft Review & Approval Queue
caregiver	Scoped to care_logs and shift_handovers only — no access to maternal wellness or private check-in records
Tech Stack
Frontend
React 19 + TypeScript
TanStack Start (SSR), TanStack Router (file-based), TanStack Query
Vite 7 + Tailwind CSS v4
shadcn/ui + Radix, Lucide icons, Sonner toasts, Recharts, React Hook Form + Zod
Deployed as a Progressive Web App (PWA) with shortcuts to /care and /dashboard
Backend & Data
Lovable Cloud (Supabase Postgres) — auth, database, storage
Drizzle — migrations
TanStack server functions (createServerFn) — app logic
Cloudflare Workers — edge runtime for public HTTP routes under /api/public/* (webhooks, backend agents)
PostHog (US host, identified-only profiles) — analytics
Resend — transactional email
Architecture
┌─────────────────────────────┐
│   React 19 + TanStack Start │  ← SSR, file-based routing
│   (PWA: /care, /dashboard)  │
└──────────────┬───────────────┘
               │ TanStack Query / createServerFn
┌──────────────▼───────────────┐
│  Lovable Cloud (Supabase)    │  ← Postgres, Auth, Storage
│  Migrations via Drizzle      │
│  RLS enforced everywhere     │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│  Cloudflare Workers          │  ← /api/public/* webhooks & agents
└───────────────────────────────┘
               │
┌──────────────▼───────────────┐
│  MCP Server at /mcp          │  ← Supabase OAuth protected
└───────────────────────────────┘
MCP Data Bridge

Vela exposes a Model Context Protocol (MCP) server at /mcp, protected by Supabase OAuth.

Available actions:

get_profile
list_checkins
log_checkin
list_screenings
list_alerts
list_education
Security & RLS

Security is non-negotiable and enforced at the database layer, not just the app layer:

Row-Level Security (RLS) is strictly enforced everywhere. Families only ever see their own data.
Caregivers are scoped to care_logs and shift_handovers only. They must never have access to maternal wellness data or private check-in records — this is a hard boundary, not a UI-level filter.
SECURITY DEFINER functions are locked down entirely from public or anonymous execution.
Design System
Token	Value
Cream	
#FAF6F1
Sand (light)	
#F3EEE6
Sand (dark)	
#E5DDD1
Blush	
#FFDFD0
Charcoal	
#2B2829
Terracotta	
#CE7951

Typography: Lora (headings), Inter (body)

Getting Started
bash
# Clone the repo
git clone https://github.com/<org>/vela.git
cd vela

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run the dev server
npm run dev

Fill in Supabase, PostHog, and Resend credentials in .env before running locally.

Vela — the tech extension of Nurture the Roots.
