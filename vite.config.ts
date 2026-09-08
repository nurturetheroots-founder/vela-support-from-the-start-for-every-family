// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  vite: { 
    plugins: [mcpPlugin()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("lucide-react")) {
                return "lucide";
              }
              if (id.includes("@supabase")) {
                return "supabase";
              }
              if (id.includes("@tanstack/react-router") || id.includes("@tanstack/router-plugin") || id.includes("@tanstack/react-start")) {
                return "tanstack";
              }
              if (id.includes("react-dom") || id.includes("react/")) {
                return "react-core";
              }
              if (id.includes("date-fns")) {
                return "date-fns";
              }
              if (id.includes("recharts")) {
                return "recharts";
              }
              return "vendor";
            }
          }
        }
      }
    }
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
