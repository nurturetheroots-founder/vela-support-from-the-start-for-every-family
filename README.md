 # 📱 Vela (by Nurture the Roots)
    
    Vela is a dedicated digital sanctuary built to operationalize deep, high-touch postpartum care and nocturnal support. Created by a seasoned birth worker, Vela bridges the gap between clinical excellence and the intimate reality of the fourth trimester. 
    
    It is designed to protect the fragile, sacred space of early parenthood--ensuring that the vulnerable work of healing, emotional screening, and middle-of-the-night recovery is guarded by absolute privacy and clinical attunement.
    
    ---
    
    ## 🧭 The Core Purpose & Philosophy
    
    Vela exists to serve families and care teams with unconditional support, structural integrity, and respect for parental intuition:
    
    *   **A Sanctuary for Vulnearbility:** Early parenting requires absolute psychological safety. A parent's inner world, emotional screening data, and private mental health reflections are locked entirely to them. No outside roles, systems, or caregivers can breach this space, keeping it a zero-judgment zone for recovery.
    *   **Intuition-First Telemetry:** We honor maternal agency. Technical elements like daily summaries or text handovers sit strictly in a *Pending Review Queue*. The parent is always the pilot of their care team, approving what is shared with their wider support network.
    *   **Attuned Environmental Integration:** Our system design respects the reality of the 3 AM nursery. Workflows are optimized for low-glare, nocturnal rhythms to preserve circadian health and keep transitions dim, quiet, and peaceful.
    
    ---
    
    ## 🛠️ System Architecture & Constraints
    
    Vela's technical codebase maps directly to our high-touch standard of care:
    
    *   **Frontend Interface:** Driven by **TanStack Router / TanStack Start** for crisp, reliable navigation through the onboarding and daily check-in touchpoints.
    *   **Secure Backend:** Built on **Supabase PostgreSQL (Postgres 16)**. Security is structural here--Row-Level Security (RLS) is intentionally configured with restrictive policies to mathematically lock wellness data behind individual parent validation. 
    *   **The service_role Override Block:** To ensure privacy cannot be bypassed, the master `service_role` grant is explicitly revoked from the private wellness tables (`private_checkins`, `epds_screenings`, and `checkins`). Server-side automation cannot cross into private parent metrics.
    
    ---
    
    ## 📋 Additive Table Index Mapping
    
    The database schema directly supports the active frontend features:
    
    *   `public.profiles` - Primary user identity (tracks individual roles and core account creation details).
    *   `public.parents` - Onboarding data workspace (manages custom focuses, zip code mapping, and the `consented_at` entry gate).
    *   `public.babies` - Relational mapping for infant tracking components.
    *   `public.care_logs` & `public.shift_handovers` - Shared operational communication feeds for caregivers and doulas to coordinate midnight metrics cleanly.
    *   `public.checkins` - Live historical table tracking parent mood and energy levels over time.
    
    ---
    
    ## 🧪 Regression Testing & Boundaries
    
    Before running any schema migrations or deploying changes live to `https://nurturetheroots.co`, the system's security boundaries must be explicitly verified:
    
    ```bash
    # Run the 27-assertion regression testing suite to verify RLS isolation boundaries
    cd drizzle/tests
    chmod +x run_layer2_rls.sh
    ./run_layer2_rls.sh
    ```
    All 27 assertions must pass successfully to confirm that no caregiver or external role can visibility leak parent-restricted files.
    
