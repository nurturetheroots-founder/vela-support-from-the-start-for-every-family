import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { problem, cta } from "@/lib/microcopy";

function NotFoundComponent() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4"
      style={{ backgroundImage: "var(--gradient-welcome)", backgroundAttachment: "fixed" }}
    >
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-primary">Vela</p>
        <h1 className="mt-4 font-serif text-3xl text-foreground">{problem.notFoundTitle}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{problem.notFound}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {cta.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4"
      style={{ backgroundImage: "var(--gradient-welcome)", backgroundAttachment: "fixed" }}
    >
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl text-foreground">{problem.errorTitle}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{problem.error}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Back to home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Vela — Fourth Trimester Care, Birth to 4 Months" },
      {
        name: "description",
        content:
          "Vela companions you from birth to 4 months with daily check-ins, weekly learning, gentle mood screening, and real human support when you need it.",
      },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Vela — Fourth Trimester Care, Birth to 4 Months" },
      {
        property: "og:description",
        content:
          "Vela companions you from birth to 4 months with daily check-ins, weekly learning, gentle mood screening, and real human support when you need it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Vela — Fourth Trimester Care, Birth to 4 Months" },
      {
        name: "twitter:description",
        content:
          "Vela companions you from birth to 4 months with daily check-ins, weekly learning, gentle mood screening, and real human support when you need it.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/AQ2lCvbMjJa5vC9jf05TYfDbSXt2/social-images/social-1782279181753-Branding_photos-50.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/AQ2lCvbMjJa5vC9jf05TYfDbSXt2/social-images/social-1782279181753-Branding_photos-50.webp",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
