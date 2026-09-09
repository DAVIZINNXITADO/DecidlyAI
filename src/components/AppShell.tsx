import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950">
        <div className="mx-auto w-full max-w-6xl px-6 py-10 md:px-8">
          {/* LINKS */}

          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-sm text-slate-400">
            {/* LINHA 1 */}

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              <Link
                to="/cookies"
                className="transition-colors hover:text-violet-300"
              >
                Cookies
              </Link>

              <span className="text-slate-700">•</span>

              <a
                href="mailto:decidlyia@outlook.com?subject=Suporte%20DecidlyAI"
                className="transition-colors hover:text-violet-300"
              >
                Suporte
              </a>
            </div>

            {/* LINHA 2 */}

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              <Link
                to="/privacy"
                className="transition-colors hover:text-violet-300"
              >
                Privacidade
              </Link>

              <span className="text-slate-700">•</span>

              <Link
                to="/tecnologia"
                className="transition-colors hover:text-violet-300"
              >
                Tecnologia
              </Link>

              <span className="text-slate-700">•</span>

              <a
                href="#planos"
                className="transition-colors hover:text-violet-300"
              >
                Ver planos
              </a>

            </div>

            {/* LINHA 3 */}

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              <Link
                to="/terms"
                className="transition-colors hover:text-violet-300"
              >
                Termos
              </Link>

              <span className="text-slate-700">•</span>

              <Link
                to="/cookies"
                className="transition-colors hover:text-violet-300"
              >
                Preferências de cookies
              </Link>
            </div>

            {/* BLOG */}

          </div>

          {/* DIVISOR */}

          <div className="my-9 h-px bg-slate-800/80" />

          {/* COPYRIGHT */}

          <p className="text-center text-sm text-slate-500">
            © 2026 DecidlyAI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
