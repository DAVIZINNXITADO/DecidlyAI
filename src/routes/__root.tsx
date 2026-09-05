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
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">
          404
        </h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Página não encontrada
        </h2>

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

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
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

export const Route =
  createRootRouteWithContext<{
    queryClient: QueryClient;
  }>()({
    head: () => ({
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, viewport-fit=cover",
        },

        {
          title:
            "DecidlyAI | Tome decisões com mais clareza",
        },

        {
          name: "description",
          content:
            "DecidlyAI é uma plataforma para ajudar você a organizar pensamentos, analisar possibilidades e tomar decisões com mais clareza.",
        },

        {
          name: "keywords",
          content:
            "DecidlyAI, inteligência artificial, IA, decisões, tomada de decisão, produtividade, análise, organização",
        },

        {
          name: "author",
          content: "DecidlyAI",
        },

        {
          name: "robots",
          content:
            "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        },

        {
          name: "theme-color",
          content: "#020617",
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
          content:
            "DecidlyAI | Tome decisões com mais clareza",
        },

        {
          property: "og:description",
          content:
            "Uma plataforma para ajudar você a organizar possibilidades, analisar opções e tomar decisões com mais clareza.",
        },

        {
          property: "og:type",
          content: "website",
        },

        {
          property: "og:site_name",
          content: "DecidlyAI",
        },

        {
          property: "og:locale",
          content: "pt_BR",
        },

        {
          name: "twitter:card",
          content: "summary",
        },

        {
          name: "twitter:title",
          content:
            "DecidlyAI | Tome decisões com mais clareza",
        },

        {
          name: "twitter:description",
          content:
            "Organize possibilidades, analise opções e tome decisões com mais clareza.",
        },
      ],

      links: [
        {
          rel: "stylesheet",
          href: appCss,
        },

        {
          rel: "icon",
          href: "/favicon.ico",
          type: "image/x-icon",
        },

        {
          rel: "manifest",
          href: "/manifest.webmanifest",
        },

        {
          rel: "apple-touch-icon",
          href: "/appicon-192.png",
        },
      ],
    }),

    shellComponent: RootShell,

    component: RootComponent,

    notFoundComponent: NotFoundComponent,

    errorComponent: ErrorComponent,
  });

function RootShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="pt-BR">
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
  const { queryClient } =
    Route.useRouteContext();

  return (
    <QueryClientProvider
      client={queryClient}
    >
      {/* Required: nested routes render here. */}
      <Outlet />
    </QueryClientProvider>
  );
}