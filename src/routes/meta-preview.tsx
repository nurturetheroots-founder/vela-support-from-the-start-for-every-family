import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/meta-preview")({
  head: () => ({
    meta: [
      { title: "Meta preview — Vela (internal)" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MetaPreview,
});

const ROUTES = [
  { path: "/", label: "Landing" },
  { path: "/dashboard", label: "Home dashboard" },
  { path: "/checkin", label: "Daily check-in" },
  { path: "/education", label: "Learning" },
  { path: "/screening", label: "EPDS screening" },
  { path: "/support", label: "Support" },
  { path: "/onboarding", label: "Onboarding" },
];

type Tags = Record<string, string>;
type Level = "pass" | "warn" | "fail";
type Check = { label: string; level: Level; detail: string };

function parseTags(html: string): Tags {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tags: Tags = {};
  const title = doc.querySelector("title")?.textContent?.trim();
  if (title) tags["title"] = title;
  doc.querySelectorAll("meta").forEach((m) => {
    const key = m.getAttribute("name") ?? m.getAttribute("property");
    const content = m.getAttribute("content");
    if (key && content) tags[key] = content;
  });
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href");
  if (canonical) tags["canonical"] = canonical;
  return tags;
}

function runChecks(tags: Tags): Check[] {
  const checks: Check[] = [];
  const push = (label: string, level: Level, detail: string) =>
    checks.push({ label, level, detail });

  const title = tags["title"];
  if (!title) push("Title", "fail", "No <title> found.");
  else if (title.length > 60)
    push("Title", "warn", `${title.length} chars — over 60, may truncate in search results.`);
  else push("Title", "pass", `${title.length} chars.`);

  const desc = tags["description"];
  if (!desc) push("Description", "fail", "No meta description found.");
  else if (desc.length > 160)
    push("Description", "warn", `${desc.length} chars — over 160, may truncate.`);
  else if (desc.length < 50) push("Description", "warn", `${desc.length} chars — quite short.`);
  else push("Description", "pass", `${desc.length} chars.`);

  for (const key of ["og:title", "og:description", "og:type"]) {
    if (tags[key]) push(key, "pass", tags[key]);
    else push(key, "warn", "Missing.");
  }

  const ogImage = tags["og:image"];
  if (!ogImage) push("og:image", "warn", "Missing — hosting will supply a fallback preview.");
  else if (!/^https:\/\//.test(ogImage))
    push("og:image", "fail", "Must be an absolute https URL for crawlers.");
  else push("og:image", "pass", ogImage);

  const card = tags["twitter:card"];
  if (!card) push("twitter:card", "warn", "Missing — X/Twitter falls back to a plain link.");
  else push("twitter:card", "pass", card);

  if (tags["twitter:title"] || tags["og:title"])
    push("twitter:title", "pass", tags["twitter:title"] ?? "Falls back to og:title.");
  else push("twitter:title", "warn", "Missing.");

  if (tags["robots"]?.includes("noindex"))
    push("robots", "warn", `${tags["robots"]} — this page is hidden from search.`);

  return checks;
}

function MetaPreview() {
  const [path, setPath] = useState("/");
  const [tags, setTags] = useState<Tags | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const load = useCallback(async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${target}?meta-preview=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setTags(parseTags(await res.text()));
    } catch (e) {
      setTags(null);
      setError(
        e instanceof Error
          ? e.message
          : "We couldn't reach that page just now. Try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(path);
  }, [path, load]);

  const checks = tags ? runChecks(tags) : [];
  const failCount = checks.filter((c) => c.level === "fail").length;
  const warnCount = checks.filter((c) => c.level === "warn").length;

  const fullUrl = `${origin}${path}`;
  const shareTitle = tags?.["og:title"] ?? tags?.["title"] ?? "";
  const shareDesc = tags?.["og:description"] ?? tags?.["description"] ?? "";
  const shareImage = tags?.["og:image"];
  const twitterTitle = tags?.["twitter:title"] ?? shareTitle;
  const twitterDesc = tags?.["twitter:description"] ?? shareDesc;
  const twitterImage = tags?.["twitter:image"] ?? shareImage;
  const host = origin.replace(/^https?:\/\//, "");

  return (
    <div
      className="min-h-dvh bg-background"
      style={{ backgroundImage: "var(--gradient-welcome)", backgroundAttachment: "fixed" }}
    >
      <div className="max-w-3xl mx-auto px-5 py-10 space-y-8">
        <header className="space-y-2">
          <Badge variant="secondary" className="rounded-full">
            Internal tool
          </Badge>
          <h1 className="font-serif text-3xl leading-snug">Meta &amp; share preview</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-prose">
            Fetches each page&apos;s server-rendered HTML and reads the tags a crawler would see.
            Run it after changing titles, descriptions, or share images.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {ROUTES.map((r) => (
            <button
              key={r.path}
              onClick={() => setPath(r.path)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                path === r.path
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <code className="text-sm text-muted-foreground truncate">{fullUrl}</code>
          <Button size="sm" variant="outline" onClick={() => void load(path)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Checking" : "Re-check"}
          </Button>
        </div>

        {error && (
          <p className="rounded-2xl bg-destructive/10 text-destructive p-4 text-sm">{error}</p>
        )}

        {tags && (
          <>
            <section className="space-y-4">
              <h2 className="font-serif text-xl">Current tags</h2>
              <div className="rounded-2xl bg-secondary p-6 space-y-4">
                <Field label="Title" value={tags["title"]} />
                <Field label="Description" value={tags["description"]} />
                <Field label="Canonical" value={tags["canonical"]} />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-xl">Link checker</h2>
              <p className="text-sm text-muted-foreground">
                {failCount === 0 && warnCount === 0
                  ? "Everything checks out."
                  : `${failCount} problem${failCount === 1 ? "" : "s"}, ${warnCount} suggestion${warnCount === 1 ? "" : "s"}.`}
              </p>
              <ul className="rounded-2xl border border-border/60 divide-y divide-border/60 overflow-hidden">
                {checks.map((c) => (
                  <li key={c.label} className="flex gap-3 p-4">
                    <LevelIcon level={c.level} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-sm text-muted-foreground break-words">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-xl">How it will look when shared</h2>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Open Graph (Facebook, LinkedIn, iMessage)
                </p>
                <div className="rounded-xl overflow-hidden border border-border/60 bg-card max-w-lg">
                  {shareImage && (
                    <img
                      src={shareImage}
                      alt=""
                      loading="lazy"
                      className="w-full aspect-[1.91/1] object-cover bg-secondary"
                    />
                  )}
                  <div className="p-4 space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{host}</p>
                    <p className="font-medium leading-snug">{shareTitle || "No og:title"}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {shareDesc || "No og:description"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Twitter Card ({tags["twitter:card"] ?? "no card type"})
                </p>
                <div className="rounded-2xl overflow-hidden border border-border/60 bg-card max-w-lg">
                  {twitterImage && (
                    <img
                      src={twitterImage}
                      alt=""
                      loading="lazy"
                      className="w-full aspect-[1.91/1] object-cover bg-secondary"
                    />
                  )}
                  <div className="p-4 space-y-1">
                    <p className="font-medium leading-snug">{twitterTitle || "No twitter:title"}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {twitterDesc || "No twitter:description"}
                    </p>
                    <p className="text-xs text-muted-foreground pt-1">{host}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl">Force a crawler refresh</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
                Platforms cache the preview they last scraped, so changes here won&apos;t show in
                shared links until they re-fetch. These debuggers re-scrape on demand (use the
                published URL).
              </p>
              <div className="flex flex-wrap gap-2">
                <DebuggerLink
                  href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(fullUrl)}`}
                  label="Facebook debugger"
                />
                <DebuggerLink
                  href={`https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(fullUrl)}`}
                  label="LinkedIn inspector"
                />
                <DebuggerLink
                  href="https://cards-dev.twitter.com/validator"
                  label="X card validator"
                />
              </div>
            </section>

            <details className="rounded-2xl bg-secondary p-6">
              <summary className="cursor-pointer text-sm font-medium">
                All tags found ({Object.keys(tags).length})
              </summary>
              <dl className="mt-4 space-y-2 text-sm">
                {Object.entries(tags).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3">
                    <dt className="text-muted-foreground truncate">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {value ? (
        <p className="leading-relaxed break-words">{value}</p>
      ) : (
        <p className="text-muted-foreground italic">Not set</p>
      )}
      {value && <p className="text-xs text-muted-foreground">{value.length} characters</p>}
    </div>
  );
}

function LevelIcon({ level }: { level: Level }) {
  if (level === "pass") return <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />;
  if (level === "warn") return <AlertTriangle className="h-5 w-5 shrink-0 text-muted-foreground" />;
  return <XCircle className="h-5 w-5 shrink-0 text-destructive" />;
}

function DebuggerLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm hover:bg-secondary/70 transition-colors"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
