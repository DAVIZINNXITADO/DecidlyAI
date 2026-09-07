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
      {/* CONTEÚDO */}

      <main className="flex-1">
        {children}
      </main>

      {/* FOOTER */}

      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-5xl px-6 py-12 md:px-8">
          {/* LINKS */}

          <div className="grid grid-cols-2 gap-x-12 gap-y-5 text-sm md:gap-x-24">
            {/* ESQUERDA */}

            <div className="flex flex-col gap-5">
              <Link
                to="/terms"
                className="w-fit text-slate-400 transition hover:text-violet-300"
              >
                Termos de Uso
              </Link>

              <Link
                to="/privacy"
                className="w-fit text-slate-400 transition hover:text-violet-300"
              >
                Política de Privacidade
              </Link>

              <Link
                to="/cookies"
                className="w-fit text-slate-400 transition hover:text-violet-300"
              >
                Política de Cookies
              </Link>
            </div>

            {/* DIREITA */}

            <div className="flex flex-col items-end gap-5">
              <a
                href="mailto:decidlyia@outlook.com?subject=Suporte%20DecidlyAI"
                className="w-fit text-slate-400 transition hover:text-violet-300"
              >
                Suporte
              </a>

              <a
                href="mailto:decidlyia@outlook.com?subject=Feedback%20DecidlyAI"
                className="w-fit text-slate-400 transition hover:text-violet-300"
              >
                Enviar feedback
              </a>

              <a
                href="mailto:decidlyia@outlook.com?subject=Relat%C3%B3rio%20de%20problema%20DecidlyAI"
                className="w-fit text-slate-400 transition hover:text-violet-300"
              >
                Reportar um problema
              </a>
            </div>
          </div>

          {/* BLOG CENTRALIZADO */}

          <div className="mt-10 flex justify-center">
            <a
              href="https://URL-DO-SEU-BLOG.com"
              className="text-sm font-medium text-slate-400 transition hover:text-violet-300"
            >
              Blog
            </a>
          </div>

          {/* DIVISOR */}

          <div className="my-10 h-px bg-slate-800" />

          {/* COPYRIGHT */}

          <p className="text-center text-sm text-slate-500">
            © 2026 DecidlyAI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}