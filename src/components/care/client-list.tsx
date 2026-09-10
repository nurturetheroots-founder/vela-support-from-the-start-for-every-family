import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Lock, Plus, Users } from "lucide-react";
import { listClientOverviews, relativeTime } from "@/lib/doula-clients";
import { formatDuration, setSelectedFamilyId } from "@/lib/care-log";
import { CaregiverInviteDialog } from "@/components/caregiver-invite-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useNightDim, NightDimToggle } from "@/components/care/night-mode";
import { cn } from "@/lib/utils";

/** The doula's case list: every family they support, with tonight's activity. */
export function ClientList() {
  const { session, loading } = useAuth();
  const { dim, toggle } = useNightDim();
  const [inviteOpen, setInviteOpen] = useState(false);

  const clientsQuery = useQuery({
    queryKey: ["doula-clients", session?.user?.id ?? "none"],
    enabled: !loading && !!session,
    queryFn: listClientOverviews,
  });

  const clients = clientsQuery.data ?? [];
  const busy = loading || clientsQuery.isPending;

  return (
    <div className={cn("min-h-dvh bg-night text-night-text", dim && "night-dim")}>
      <div className="mx-auto max-w-2xl px-5 pb-40 pt-6">
        <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-night-muted">
              <Users className="h-3.5 w-3.5" /> Your clients
            </p>
            <h1 className="mt-1 truncate font-serif text-2xl text-night-text">Client dashboard</h1>
          </div>
          <NightDimToggle dim={dim} onToggle={toggle} />
        </header>

        {busy ? (
          <div className="flex items-center gap-2 text-night-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your clients…
          </div>
        ) : clients.length === 0 ? (
          <div className="rounded-3xl bg-night-soft p-6 ring-1 ring-night-line">
            <h2 className="font-serif text-xl text-night-text">No families yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-night-muted">
              Add a family with the 6-character code they sent you. They'll appear here with each
              shift you log.
            </p>
            <button
              onClick={() => setInviteOpen(true)}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-clay-soft px-5 text-sm font-medium text-night"
            >
              <Plus className="h-4 w-4" /> Add a family
            </button>
          </div>
        ) : (
          <ul className="space-y-4">
            {clients.map((c) => (
              <li key={c.familyId}>
                <Link
                  to="/caregiver/shift-dashboard"
                  onClick={() => setSelectedFamilyId(c.familyId)}
                  className="block rounded-3xl bg-night-soft p-5 ring-1 ring-night-line transition-colors hover:bg-night-raised"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-serif text-xl text-night-text">{c.babyName}</h2>
                      <p className="mt-0.5 text-sm text-night-muted">
                        Last entry: {relativeTime(c.lastLoggedAt)}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-night-muted" />
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl bg-night-raised px-2 py-3">
                      <dt className="text-xs text-night-muted">Feeds</dt>
                      <dd className="mt-1 text-lg text-night-text">{c.metrics.feed_count}</dd>
                    </div>
                    <div className="rounded-2xl bg-night-raised px-2 py-3">
                      <dt className="text-xs text-night-muted">Diapers</dt>
                      <dd className="mt-1 text-lg text-night-text">
                        {c.metrics.wet_diapers + c.metrics.dirty_diapers}
                      </dd>
                    </div>
                    <div className="rounded-2xl bg-night-raised px-2 py-3">
                      <dt className="text-xs text-night-muted">Longest sleep</dt>
                      <dd className="mt-1 text-lg text-night-text">
                        {formatDuration(c.metrics.longest_sleep_stretch_mins)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs text-night-muted">Last 24 hours · {c.logCount} entries</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {clients.length > 0 && (
          <button
            onClick={() => setInviteOpen(true)}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-night-soft px-5 text-sm text-night-text ring-1 ring-night-line"
          >
            <Plus className="h-4 w-4" /> Add a family
          </button>
        )}

        <div className="mt-8 flex items-start gap-3 rounded-3xl bg-night-soft p-5 ring-1 ring-night-line">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-night-muted" />
          <p className="text-sm leading-relaxed text-night-muted">
            Parent check-ins and screenings stay private to the parent. If they want you to see how
            they're doing, they can send you a summary from their own app.
          </p>
        </div>
      </div>

      <CaregiverInviteDialog
        open={inviteOpen}
        onOpenChange={(v) => {
          setInviteOpen(v);
          if (!v) void clientsQuery.refetch();
        }}
      />
    </div>
  );
}
