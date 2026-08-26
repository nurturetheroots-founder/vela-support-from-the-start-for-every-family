import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { educationModules } from "@/lib/education";

export default defineTool({
  name: "list_education",
  title: "List education modules",
  description:
    "Browse Vela's fourth-trimester learning library. Optionally filter by week number or a keyword.",
  inputSchema: {
    week: z.number().int().optional().describe("Only return modules for this postpartum week."),
    query: z.string().optional().describe("Keyword to match against title, tags, and excerpt."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ week, query }) => {
    const q = query?.trim().toLowerCase();
    const modules = educationModules
      .filter((m) => (week ? m.week === week : true))
      .filter((m) =>
        q
          ? [m.title, m.excerpt, ...m.tags].some((field) => field.toLowerCase().includes(q))
          : true,
      )
      .map(({ id, week: w, title, readTime, tags, excerpt }) => ({
        id,
        week: w,
        title,
        readTime,
        tags,
        excerpt,
      }));
    return {
      content: [{ type: "text", text: JSON.stringify(modules) }],
      structuredContent: { modules },
    };
  },
});
