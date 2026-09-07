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
      {/* CONTEÚDO DA PÁGINA */}

      <main className="flex-1 px-5 py-10 md:px-8 md:py-14">
        {children}
      </main>

      {/* FOOTER */}

      <footer className="border-t border-slate-800 bg-slate-950/70 px-5 py-12 backdrop-blur-xl md:px-8">
        <div className="mx-auto max-w-4xl">
          {/* DUAS COLUNAS */}

          <div className="grid grid-cols-[1fr_auto_1fr] gap-y-6 text-sm">
            {/* LINHA 1 */}

            <Link
              to="/terms"
              className="text-right text-slate-400 transition hover:text-violet-300"
            >
              Termos de Uso
            </Link>

            <span className="px-8 text-slate-700">
              |
            </span>

            <a
              href="mailto:decidlyia@outlook.com?subject=Suporte%20DecidlyAI"
              className="text-left text-slate-400 transition hover:text-violet-300"
            >
              Suporte
            </a>

            {/* LINHA 2 */}

            <Link
              to="/privacy"
              className="text-right text-slate-400 transition hover:text-violet-300"
            >
              Política de Privacidade
            </Link>

            <span className="px-8 text-slate-700">
              |
            </span>

            <a
              href="mailto:decidlyia@outlook.com?subject=Feedback%20DecidlyAI"
              className="text-left text-slate-400 transition hover:text-violet-300"
            >
              Enviar feedback
            </a>

            {/* LINHA 3 */}

            <Link
              to="/cookies"
              className="text-right text-slate-400 transition hover:text-violet-300"
            >
              Política de Cookies
            </Link>

            <span className="px-8 text-slate-700">
              |
            </span>

            <a
              href="mailto:decidlyia@outlook.com?subject=Relat%C3%B3rio%20de%20problema%20DecidlyAI"
              className="text-left text-slate-400 transition hover:text-violet-300"
            >
              Reportar um problema
            </a>
          </div>

          {/* BOTÃO BLOG NO MEIO */}

          <div className="mt-8 flex justify-center">
            <Link
              to="/blog"
              className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-300"
            >
              Blog
            </Link>
          </div>

          {/* LINHA */}

          <div className="my-10 border-t border-slate-800" />

          {/* COPYRIGHT */}

          <p className="text-center text-sm text-slate-500">
            © 2026 DecidlyAI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}