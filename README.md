# 📱 Vela (by Nurture the Roots)

Vela is a premium, high-touch maternal wellness and night-nursery tracking application built for modern families and specialized birth workers. The platform is designed with a fundamental focus on **maternal psychological safety, zero-glare nursery ergonomics, and rigid data isolation boundaries**.

---

## 🚀 Phase 1 Production Architecture Overview

Vela is built on an isolated, edge-optimized serverless stack:

*   **Frontend Routing:** Single-Page Application (SPA) architecture utilizing **TanStack Router / TanStack Start** for crisp, declarative state management.
*   **Hosting & Deployment:** Automatically built and securely deployed globally via **Netlify** at `https://nurturetheroots.co`.
*   **Database Infrastructure:** Scaled via **Supabase PostgreSQL (Postgres 16)** under the centralized `Nurture The Roots` master container.
*   **Communication Layer:** Edge-triggered loops driven by **Resend** for transactional pipeline confirmation.
*   **Marketing & Community List:** Handled via **Flodesk** at `https://nurturetheroots.co` (completely isolated from the application database layer).

---

## 🛡️ Critical Data Security & Core RLS Rules

Maternal wellness data belongs entirely to the parent. The database enforces structural isolation via strict **Row-Level Security (RLS)** and specialized PostgreSQL function grants. 

### 1. The Isolation Constraints
*   **Care Logs & Shift Handovers:** Authenticated profiles with validated Caregiver metadata roles are granted standard `SELECT` and `INSERT` permissions.
*   **Private Check-ins & EPDS Screenings:** Enforced by an absolute, structural `RESTRICTIVE` block. **ONLY the matching parent user ID can read or modify these records.** Caregivers, secondary account views, and default system tokens are entirely blocked from accessing emotional telemetry or mood indicators.
*   **The service_role Restriction:** The default `service_role` grant is explicitly revoked from the private wellness schemas to prevent server-side keys from bypassing client privacy rules.

### 2. Architectural Guardrails (DO NOT REMOVE)
*   Never drop or modify the `*_isolation` restrictive policy blocks.
*   Never remove the explicit `EXECUTE` privileges granted to `has_family_permission` or `is_valid_member_permissions` inside the data filters—doing so will silently halt all read requests on active care feeds.

---

## 📋 Table Index Mapping (Live Additive Schema)

The database schema maps directly to the active TanStack layout components:

*   `public.profiles` - Primary identity mapping (holds names, due dates, baby birthdays, and system roles).
*   `public.parents` - Core onboarding engine (stores custom focuses, zip code validation, insurance properties, and the `consented_at` onboarding gate).
*   `public.babies` - Relational mapping for infant tracking.
*   `public.care_logs` - Nocturnal care entries (feedings, diaper logs, timers).
*   `public.shift_handovers` - Dedicated coordination summaries for overnight changovers.
*   `public.checkins` - Historical wellness log (tracks user mood, energy indices, and dates).
*   `public.private_checkins` - Hardened, isolated private daily parent reflections.
*   `public.epds_screenings` - Postpartum depression screening data. Includes a server-computed `q10_emergency_state` function that overrides client-side data if a critical distress indicator is triggered.

---

## 🛠️ Local Development & QA Testing

To verify the security boundaries locally before running migrations against the production database, run the behavior suite:

```bash
# Execute the 27-assertion local database simulation test suite
cd drizzle/tests
chmod +x run_layer2_rls.sh
./run_layer2_rls.sh
```

Ensure all 27 constraints pass successfully before pushing any updates live to `main`.
