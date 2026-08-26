import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_checkins",
  title: "List daily check-ins",
  description:
    "List the signed-in parent's recent daily check-ins (mood, sleep, feeding, notes), newest first.",
  inputSchema: {
    limit: z.number().int().optional().describe("How many check-ins to return. Defaults to 14."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const take = Math.min(Math.max(limit ?? 14, 1), 90);
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("parent_daily_checkins")
      .select(
        "checkin_id, logged_date, mood_score, sleep_quality, feeding_status, overall_score, parent_health_notes, requires_support_flag",
      )
      .eq("parent_id", ctx.getUserId())
      .order("logged_date", { ascending: false })
      .limit(take);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { checkins: data ?? [] },
    };
  },
});
