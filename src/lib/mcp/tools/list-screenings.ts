import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_screenings",
  title: "List EPDS screenings",
  description:
    "List the signed-in family's completed EPDS screenings with total score, date, and what prompted each one.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("epds_administrations")
      .select("id, administered_at, local_date, total_score, trigger_reason")
      .order("administered_at", { ascending: false })
      .limit(25);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { screenings: data ?? [] },
    };
  },
});
