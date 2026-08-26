import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: RedirectPayload | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: RedirectPayload | null; error: { message: string } | null }>;
};

type RedirectPayload = { redirect_url?: string; redirect_to?: string };
type AuthorizationDetails = RedirectPayload & { client?: { name?: string } };

function oauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md px-6 py-16 text-foreground">
      <h1 className="font-serif text-2xl">We couldn't load this request</h1>
      <p className="mt-3 text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "this app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect was returned. Please try connecting again.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16 text-foreground">
      <h1 className="font-serif text-3xl leading-snug">Connect {clientName} to Vela</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {clientName} is asking to use Vela as you. It will be able to read your profile, check-ins,
        screenings, and notices, and add new check-ins on your behalf. You can disconnect at any time.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-8 flex gap-3">
        <Button disabled={busy} onClick={() => decide(true)}>
          Allow
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => decide(false)}>
          Not now
        </Button>
      </div>
    </main>
  );
}
