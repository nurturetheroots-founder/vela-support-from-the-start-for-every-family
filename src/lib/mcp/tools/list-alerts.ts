import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_alerts",
  title: "List support notices",
  description:
    "List the signed-in family's support notices (escalations) — what triggered each one and whether it's still open.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("escalations")
      .select("id, triggered_at, trigger_type, trigger_detail, status, resolved_at")
      .order("triggered_at", { ascending: false })
      .limit(25);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { alerts: data ?? [] },
    };
  },
});
