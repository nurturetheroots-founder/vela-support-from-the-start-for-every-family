import manifest from "../../.lovable/mcp/manifest.json";

export type JsonSchema = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
  items?: JsonSchema;
};

export type ManifestTool = {
  name: string;
  title?: string;
  description?: string;
  annotations?: Record<string, boolean>;
  inputSchema?: JsonSchema;
  outputSchema?: JsonSchema | null;
};

export type McpManifest = {
  version: number;
  sdk_version?: string;
  path: string;
  auth?: {
    type: string;
    issuer?: string;
    accepted_audiences?: string[];
  };
  mcp: {
    server: { name: string; version: string; title?: string; instructions?: string };
    tools: ManifestTool[];
  };
};

export const mcpManifest = manifest as unknown as McpManifest;

export const SITE_ORIGIN = "https://vela-maternity-care.lovable.app";
export const MCP_ENDPOINT = `${SITE_ORIGIN}${mcpManifest.path}`;
export const MCP_METADATA_URL = `${SITE_ORIGIN}/.well-known/oauth-protected-resource`;

/** Human-readable notes and a sample call for every advertised tool. */
export const toolExamples: Record<
  string,
  { arguments: Record<string, unknown>; result: string; notes?: string }
> = {
  get_profile: {
    arguments: {},
    result:
      '{"display_name":"Ashlee","stage":"postpartum","birth_date":"2026-06-02","focus_areas":["sleep","feeding","mood"]}',
    notes: "Scoped to the signed-in parent. There is no way to request another family's profile.",
  },
  list_checkins: {
    arguments: { limit: 7 },
    result:
      '[{"logged_date":"2026-08-25","mood_score":2,"sleep_quality":"broken","feeding_status":"tough","note":"Long night."}]',
    notes: "Newest first. Defaults to 14 when limit is omitted.",
  },
  log_checkin: {
    arguments: {
      mood_score: 4,
      sleep_quality: "ok",
      feeding_status: "smooth",
      note: "Short walk outside today.",
      logged_date: "2026-08-26",
    },
    result: '{"id":"…","logged_date":"2026-08-26","mood_score":4}',
    notes:
      "The only writing tool. One check-in per parent per date — logging again for the same date updates that day.",
  },
  list_screenings: {
    arguments: { limit: 5 },
    result: '[{"administered_at":"2026-08-01T10:12:00Z","total_score":11,"band":"elevated"}]',
    notes:
      "EPDS results are screening signals, not a diagnosis. Never present a band as a clinical conclusion.",
  },
  list_alerts: {
    arguments: {},
    result: '[{"id":"…","kind":"low_mood_streak","status":"open","created_at":"2026-08-25T09:00:00Z"}]',
    notes: "Support notices raised by Vela. Read-only; acknowledgement happens in the app.",
  },
  list_education: {
    arguments: { week: 3 },
    result: '[{"id":"w3-sleep-rhythms","week":3,"title":"Sleep and wake rhythms","minutes":4}]',
    notes: "Public learning library content. Not parent-specific.",
  },
};

export function curlExample(tool: ManifestTool): string {
  const args = toolExamples[tool.name]?.arguments ?? {};
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: tool.name, arguments: args },
  };
  return [
    `curl -X POST ${MCP_ENDPOINT} \\`,
    `  -H "Authorization: Bearer $ACCESS_TOKEN" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "Accept: application/json, text/event-stream" \\`,
    `  -d '${JSON.stringify(body)}'`,
  ].join("\n");
}

export function clientConfigExample(): string {
  return JSON.stringify(
    {
      mcpServers: {
        vela: {
          type: "http",
          url: MCP_ENDPOINT,
        },
      },
    },
    null,
    2,
  );
}

/** Copy-ready Cloud Shell setup: env vars + discovery + a first authenticated call. */
export function cloudShellSnippet(): string {
  return [
    "# 1. Point your agent at Vela's MCP server",
    `export VELA_MCP_URL="${MCP_ENDPOINT}"`,
    `export VELA_MCP_METADATA="${MCP_METADATA_URL}"`,
    "",
    "# 2. Discover the authorization server (no token needed)",
    'curl -s "$VELA_MCP_METADATA" | jq .',
    "",
    "# 3. After the OAuth 2.1 + PKCE flow, export the parent's access token",
    'export VELA_ACCESS_TOKEN="<paste access token>"',
    "",
    "# 4. Verify the connection by listing the tools your agent can call",
    'curl -s -X POST "$VELA_MCP_URL" \\',
    '  -H "Authorization: Bearer $VELA_ACCESS_TOKEN" \\',
    '  -H "Content-Type: application/json" \\',
    '  -H "Accept: application/json, text/event-stream" \\',
    `  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq .`,
  ].join("\n");
}

/** Node/AI SDK client an in-Cloud-Shell agent can run directly. */
export function cloudShellNodeSnippet(): string {
  return [
    "// npm i @ai-sdk/mcp",
    'import { createMCPClient } from "@ai-sdk/mcp";',
    "",
    "const client = await createMCPClient({",
    "  transport: {",
    '    type: "http",',
    "    url: process.env.VELA_MCP_URL!,",
    "    headers: { Authorization: `Bearer ${process.env.VELA_ACCESS_TOKEN}` },",
    '    redirect: "error",',
    "  },",
    "});",
    "",
    "const tools = await client.tools(); // pass into streamText/generateText",
    "console.log(Object.keys(tools));",
    "await client.close();",
  ].join("\n");
}

export function requiredFields(schema?: JsonSchema): string[] {
  return schema?.required ?? [];
}

export function schemaFields(schema?: JsonSchema) {
  const props = schema?.properties ?? {};
  const required = new Set(requiredFields(schema));
  return Object.entries(props).map(([name, field]) => ({
    name,
    type: field.type ?? "any",
    required: required.has(name),
    description: field.description ?? "",
  }));
}

/** The machine-readable document served at /api/public/mcp-docs. */
export function docsDocument() {
  return {
    server: {
      name: mcpManifest.mcp.server.name,
      title: mcpManifest.mcp.server.title,
      version: mcpManifest.mcp.server.version,
      endpoint: MCP_ENDPOINT,
      transport: "streamable-http",
      documentation: `${SITE_ORIGIN}/docs/mcp`,
    },
    auth: {
      type: mcpManifest.auth?.type ?? "none",
      flow: "OAuth 2.1 authorization code with PKCE",
      issuer: mcpManifest.auth?.issuer,
      accepted_audiences: mcpManifest.auth?.accepted_audiences,
      dynamic_client_registration: true,
      protected_resource_metadata: MCP_METADATA_URL,
      consent_screen: `${SITE_ORIGIN}/.lovable/oauth/consent`,
      notes:
        "Discover the authorization server from the protected-resource metadata, register dynamically, then send the access token as a Bearer header on every MCP request. Tools act as the signed-in parent and row-level security applies.",
    },
    tools: mcpManifest.mcp.tools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      annotations: tool.annotations,
      input_schema: tool.inputSchema,
      example: toolExamples[tool.name] ?? null,
    })),
  };
}
