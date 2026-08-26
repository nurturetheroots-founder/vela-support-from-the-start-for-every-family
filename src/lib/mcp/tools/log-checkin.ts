import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_checkin",
  title: "Log a daily check-in",
  description:
    "Save a daily check-in for the signed-in parent: mood (1-5), sleep quality, feeding status, and an optional note.",
  inputSchema: {
    mood_score: z.number().int().describe("Mood from 1 (heavy) to 5 (light)."),
    sleep_quality: z.string().optional().describe("Short sleep description, e.g. 'broken', 'ok', 'rested'."),
    feeding_status: z.string().optional().describe("Short feeding description, e.g. 'smooth', 'tough'."),
    note: z.string().optional().describe("Anything the parent wants to remember about today."),
    logged_date: z.string().optional().describe("Date in YYYY-MM-DD. Defaults to today."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ mood_score, sleep_quality, feeding_status, note, logged_date }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const mood = Math.min(Math.max(Math.round(mood_score), 1), 5);
    const date = logged_date ?? new Date().toISOString().slice(0, 10);
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("parent_daily_checkins")
      .upsert(
        {
          parent_id: ctx.getUserId(),
          logged_date: date,
          mood_score: mood,
          sleep_quality: sleep_quality ?? null,
          feeding_status: feeding_status ?? null,
          parent_health_notes: note ?? null,
          requires_support_flag: mood <= 2,
        },
        { onConflict: "parent_id,logged_date" },
      )
      .select();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Check-in saved for ${date}.` }],
      structuredContent: { checkin: data?.[0] ?? null },
    };
  },
});
