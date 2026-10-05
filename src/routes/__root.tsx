import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorRouteComponent,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import decidlyaiMarkUrl from "../assets/decidlyai-mark-80.webp";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { hasStoredSupabaseSession } from "../lib/supabase-session";
import { LanguageProvider } from "../lib/LanguageProvider";
import { CookieConsent } from "../components/CookieConsent";
import { resolveRouteSeo, SITE_URL } from "../lib/seo";

const organizationSchema = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "DecidlyAI",
  url: SITE_URL,
  logo: `${SITE_URL}/appicon-512.png`,
  description: "Inteligência artificial para organizar decisões com clareza e autonomia.",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@graph": [
    organizationSchema,
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "DecidlyAI",
      alternateName: ["Decidly AI", "DecidlyAI"],
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "pt-BR",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#webapplication`,
      name: "DecidlyAI",
      url: SITE_URL,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      image: `${SITE_URL}/social-preview.png`,
      description:
        "Organize dilemas, compare critérios e explore possibilidades com inteligência artificial, mantendo a decisão final com você.",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "pt-BR",
    },
  ],
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o início
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
    reportLovableError(error, {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Você pode tentar novamente ou voltar para o início.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: ({ matches }) => {
    const currentMatch = matches[matches.length - 1];
    const isUnmatchedPath = matches.length === 1 && currentMatch?.routeId === "__root__";
    const seo = resolveRouteSeo(
      currentMatch?.pathname ?? "/",
      isUnmatchedPath || matches.some((match) => match.status === "notFound"),
      matches.some((match) => match.status === "error"),
    );

    return {
      meta: [
        {
          charSet: "utf-8",
        },

        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },

        { title: seo.title },

        {
          name: "description",
          content: seo.description,
        },

        {
          name: "keywords",
          content: seo.keywords,
        },

        {
          name: "author",
          content: "DecidlyAI",
        },

        {
          name: "application-name",
          content: "DecidlyAI",
        },

        {
          name: "robots",
          content: seo.robots,
        },

        {
          name: "theme-color",
          content: "#151322",
        },

        {
          name: "mobile-web-app-capable",
          content: "yes",
        },

        {
          name: "apple-mobile-web-app-capable",
          content: "yes",
        },

        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },

        {
          name: "apple-mobile-web-app-title",
          content: "DecidlyAI",
        },

        {
          property: "og:title",
          content: seo.title,
        },

        {
          property: "og:description",
          content: seo.description,
        },

        {
          property: "og:type",
          content: seo.ogType ?? "website",
        },

        ...(seo.canonical ? [{ property: "og:url" as const, content: seo.canonical }] : []),

        {
          property: "og:site_name",
          content: "DecidlyAI",
        },

        {
          property: "og:image",
          content: `${SITE_URL}/social-preview.png`,
        },

        {
          property: "og:image:width",
          content: "1200",
        },

        {
          property: "og:image:height",
          content: "600",
        },

        {
          property: "og:image:alt",
          content: "DecidlyAI — clareza para decisões importantes",
        },

        {
          property: "og:locale",
          content: "pt_BR",
        },

        {
          name: "twitter:card",
          content: "summary_large_image",
        },

        {
          name: "twitter:image",
          content: `${SITE_URL}/social-preview.png`,
        },

        {
          name: "twitter:image:alt",
          content: "DecidlyAI — clareza para decisões importantes",
        },

        {
          name: "twitter:title",
          content: seo.title,
        },

        {
          name: "twitter:description",
          content: seo.description,
        },
      ],

      links: [
        {
          rel: "icon",
          href: decidlyaiMarkUrl,
          type: "image/webp",
        },

        ...(seo.canonical ? [{ rel: "canonical" as const, href: seo.canonical }] : []),

        {
          rel: "manifest",
          href: "/manifest.webmanifest",
        },

        {
          rel: "apple-touch-icon",
          href: "/appicon-192.png",
        },
      ],

      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(websiteSchema),
        },
        ...(seo.faqs?.length
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: seo.faqs.map(({ question, answer }) => ({
                    "@type": "Question",
                    name: question,
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: answer,
                    },
                  })),
                }),
              },
            ]
          : []),
      ],
    };
  },

  shellComponent: RootShell,

  component: RootComponent,

  notFoundComponent: NotFoundComponent,

  errorComponent: ErrorComponent as unknown as ErrorRouteComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <link rel="preload" href={appCss} as="style" />
        <link
          rel="stylesheet"
          href={appCss}
          data-app-stylesheet="true"
        />
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

  useEffect(() => {
    const injectAhrefs = () => {
      if (document.getElementById("decidly-ahrefs-analytics")) return;
      const script = document.createElement("script");
      script.id = "decidly-ahrefs-analytics";
      script.src = "https://analytics.ahrefs.com/analytics.js";
      script.dataset["key"] = "HeI8uYMvnd18q5sJLYvuww";
      script.async = true;
      document.head.appendChild(script);
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const requestIdleCallback = idleWindow.requestIdleCallback;
    const cancelIdleCallback = idleWindow.cancelIdleCallback;
    const idleHandle = requestIdleCallback
      ? requestIdleCallback(injectAhrefs, { timeout: 2500 })
      : window.setTimeout(injectAhrefs, 2500);

    const applyDocumentPreferences = (theme: string, language: string) => {
      const safeTheme = theme === "high_contrast" || theme === "compact" ? theme : "violet";
      window.localStorage.setItem("decidly-theme", safeTheme);
      window.localStorage.setItem("decidly-language", language === "en-US" ? "en" : language);
      document.documentElement.dataset["theme"] = safeTheme;
      document.documentElement.classList.add("dark");
      document.documentElement.lang = language === "en" ? "en-US" : language;
      document.body.dataset["theme"] = safeTheme;
    };

    const localTheme = window.localStorage.getItem("decidly-theme") || "dark";
    const localLanguage = window.localStorage.getItem("decidly-language") || "pt-BR";
    applyDocumentPreferences(localTheme, localLanguage);

    const syncAccountPreferences = async () => {
      if (!hasStoredSupabaseSession()) return;

      const { supabase } = await import("../lib/supabase");
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;
      const [{ data: preferences }, { data: profile }] = await Promise.all([
        supabase.from("user_preferences").select("tema,idioma_preferido").eq("user_id", user.id).maybeSingle(),
        Promise.resolve({ data: user.user_metadata as { theme?: string; language?: string } | undefined }),
      ]);
      const savedTheme = preferences?.tema === "high_contrast" || preferences?.tema === "compact" ? preferences.tema : "violet";
      const savedLanguage = preferences?.idioma_preferido === "en-US" ? "en-US" : preferences?.idioma_preferido === "pt-BR" ? "pt-BR" : profile?.language === "en-US" ? "en-US" : "pt-BR";
      applyDocumentPreferences(savedTheme || profile?.theme || localTheme, savedLanguage || localLanguage);
    };

    void syncAccountPreferences().catch(() => undefined);
    return () => {
      if (cancelIdleCallback) {
        cancelIdleCallback(idleHandle as number);
      } else {
        window.clearTimeout(idleHandle as number);
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Outlet />
        <CookieConsent />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
