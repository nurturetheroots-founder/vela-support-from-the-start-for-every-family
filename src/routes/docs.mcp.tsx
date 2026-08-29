import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  MCP_ENDPOINT,
  MCP_METADATA_URL,
  SITE_ORIGIN,
  clientConfigExample,
  cloudShellNodeSnippet,
  cloudShellSnippet,
  curlExample,
  mcpManifest,
  schemaFields,
  toolExamples,
} from "@/lib/mcp-docs";

const PAGE_URL = `${SITE_ORIGIN}/docs/mcp`;
const TITLE = "Vela MCP Tool Documentation — Schemas, Examples, Auth";
const DESCRIPTION =
  "Integration reference for Vela's MCP server: endpoint, OAuth 2.1 flow, tool schemas, and copy-paste request examples for agents.";

export const Route = createFileRoute("/docs/mcp")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: McpDocsPage,
});

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl bg-foreground/90 p-4 text-xs leading-relaxed text-background">
      <code>{children}</code>
    </pre>
  );
}

function CopyableCode({ children, label }: { children: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative mt-3">
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/15 px-3 py-1.5 text-[11px] font-medium text-background transition hover:bg-background/25"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto rounded-xl bg-foreground/90 p-4 pt-12 text-xs leading-relaxed text-background">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-primary">
      {children}
    </span>
  );
}


function McpDocsPage() {
  const { tools, server } = mcpManifest.mcp;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Developer reference</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">Vela MCP tool documentation</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
          Vela exposes a Model Context Protocol server so an assistant can act on behalf of a signed-in
          parent — reading their check-ins, screenings, and notices, and logging a new check-in. Everything
          below is generated from the live server manifest, so it stays in step with what is actually
          advertised.
        </p>
      </header>

      <section className="mt-10 rounded-2xl bg-secondary p-6">
        <h2 className="font-serif text-xl">Connection details</h2>
        <dl className="mt-4 space-y-3 text-sm">
          {[
            ["Server name", server.name],
            ["Version", server.version],
            ["Endpoint", MCP_ENDPOINT],
            ["Transport", "Streamable HTTP (JSON-RPC 2.0)"],
            ["Protected resource metadata", MCP_METADATA_URL],
            ["Machine-readable docs", `${SITE_ORIGIN}/api/public/mcp-docs`],
          ].map(([label, value]) => (
            <div key={label} className="grid gap-1 sm:grid-cols-[220px_1fr]">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-all font-mono text-[13px]">{value}</dd>
            </div>
          ))}
        </dl>
        <Code>{clientConfigExample()}</Code>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Most clients (Claude, ChatGPT, Cursor, Codex) only need the URL — they discover authentication
          automatically and open a browser window for approval.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Cloud Shell quickstart</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Running your agent from Cloud Shell (or any terminal)? Paste this in to set the environment,
          discover the authorization server, and confirm the tools your agent can reach.
        </p>
        <CopyableCode label="Cloud Shell setup">{cloudShellSnippet()}</CopyableCode>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Once the token is in place, this is the smallest client that hands Vela&apos;s tools to a model.
        </p>
        <CopyableCode label="Node MCP client">{cloudShellNodeSnippet()}</CopyableCode>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Keep the access token in an environment variable — never commit it, and never pass it into model
          context. Each token is scoped to one parent, so tools only ever see that family&apos;s data.
        </p>
      </section>


      <section className="mt-8">
        <h2 className="font-serif text-2xl">Authentication</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Every tool call requires a parent&apos;s OAuth 2.1 access token. There are no API keys and no
          anonymous access.
        </p>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed">
          {[
            <>
              Call the endpoint without a token. It returns <code className="font-mono">401</code> with a{" "}
              <code className="font-mono">WWW-Authenticate</code> header pointing at{" "}
              <span className="break-all font-mono text-[13px]">{MCP_METADATA_URL}</span>.
            </>,
            <>
              Fetch that protected-resource metadata to find the authorization server:{" "}
              <span className="break-all font-mono text-[13px]">{mcpManifest.auth?.issuer}</span>.
            </>,
            <>
              Register your client dynamically (RFC 7591) at the authorization server&apos;s registration
              endpoint, or reuse a registration you already hold.
            </>,
            <>
              Run the authorization-code flow with PKCE. The parent signs in to Vela and lands on the in-app
              consent screen at{" "}
              <span className="break-all font-mono text-[13px]">{SITE_ORIGIN}/.lovable/oauth/consent</span>,
              where they approve or deny your client by name.
            </>,
            <>
              Send the resulting access token as{" "}
              <code className="font-mono">Authorization: Bearer &lt;token&gt;</code> on every request. Tools
              run as that parent and row-level security limits every query to their own family&apos;s data.
            </>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {i + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Tokens must carry the <code className="font-mono">authenticated</code> audience and an OAuth
          client claim. A session token copied out of the web app is rejected on purpose.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">Tools</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tools.length} tools, generated from the manifest.
        </p>

        <div className="mt-6 space-y-6">
          {tools.map((tool) => {
            const fields = schemaFields(tool.inputSchema);
            const example = toolExamples[tool.name];
            return (
              <article key={tool.name} className="rounded-2xl bg-card/70 p-6 ring-1 ring-border">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-mono text-base">{tool.name}</h3>
                  {tool.annotations?.readOnlyHint ? <Badge>read-only</Badge> : <Badge>writes data</Badge>}
                  {tool.annotations?.idempotentHint ? <Badge>idempotent</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{tool.title}</p>
                <p className="mt-3 text-sm leading-relaxed">{tool.description}</p>

                <h4 className="mt-5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Input schema
                </h4>
                {fields.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No arguments.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {fields.map((f) => (
                      <li key={f.name} className="text-sm leading-relaxed">
                        <span className="font-mono">{f.name}</span>{" "}
                        <span className="text-xs text-muted-foreground">({f.type})</span>{" "}
                        {f.required ? (
                          <span className="text-xs font-medium text-primary">required</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">optional</span>
                        )}
                        {f.description ? (
                          <span className="block text-muted-foreground">{f.description}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                <h4 className="mt-5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  Example request
                </h4>
                <Code>{curlExample(tool)}</Code>

                {example ? (
                  <>
                    <h4 className="mt-5 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                      Example result
                    </h4>
                    <Code>{example.result}</Code>
                    {example.notes ? (
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{example.notes}</p>
                    ) : null}
                  </>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-2xl bg-secondary p-6">
        <h2 className="font-serif text-xl">Working with this data responsibly</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>Vela is a support companion, not medical care, and never a substitute for a clinician.</li>
          <li>
            EPDS scores are screening signals. Do not present a band or score as a diagnosis, and never
            imply urgency the parent did not ask for.
          </li>
          <li>
            If a parent describes thoughts of self-harm, surface the 988 Suicide &amp; Crisis Lifeline and
            the National Maternal Mental Health Hotline at 1-833-943-5746 rather than continuing a tool
            flow.
          </li>
          <li>Keep language warm, plain, and gender-neutral. Avoid &quot;should&quot; and &quot;bounce back.&quot;</li>
        </ul>
      </section>

      <p className="mt-10 text-xs text-muted-foreground">
        Server instructions given to connecting assistants: {server.title} — v{server.version}.
      </p>
    </main>
  );
}
