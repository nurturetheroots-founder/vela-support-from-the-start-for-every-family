import { createFileRoute } from "@tanstack/react-router";
import { docsDocument } from "@/lib/mcp-docs";

export const Route = createFileRoute("/api/public/mcp-docs")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify(docsDocument(), null, 2), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300",
            "access-control-allow-origin": "*",
          },
        }),
    },
  },
});
