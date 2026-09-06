import { Link } from "@tanstack/react-router";
import {
  Brain,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  X,
} from "lucide-react";
import {
  ReactNode,
  useState,
} from "react";
import { CookieConsent } from "@/components/CookieConsent";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({
  children,
}: AppShellProps) {
  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* FUNDO */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />

        <div className="absolute -left-40 top-[700px] h-[500px] w-[500px] rounded-full bg-purple-700/10 blur-[140px]" />

        <div className="absolute -right-40 top-[1000px] h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[140px]" />
      </div>

      <div className="relative flex min-h-screen">
        {/* SIDEBAR DESKTOP */}

        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-800 bg-slate-950/80 backdrop-blur-xl md:flex md:flex-col">
          {/* LOGO */}

          <div className="flex h-20 items-center border-b border-slate-800 px-6">
            <Link
              to="/"
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              <img
                src="/favicon.ico"
                alt="DecidlyAI"
                className="h-10 w-10 shrink-0 object-contain"
              />

              <span className="flex items-center text-2xl font-bold leading-none tracking-tight">
                <span className="text-white">
                  Decidly
                </span>

                <span className="text-violet-400">
                  AI
                </span>
              </span>
            </Link>
          </div>

          {/* NAVEGAÇÃO */}

          <nav className="flex-1 space-y-2 p-4">
            <AppNavLink
              to="/dashboard"
              icon={
                <LayoutDashboard className="h-5 w-5" />
              }
            >
              Dashboard
            </AppNavLink>

            <AppNavLink
              to="/decisoes"
              icon={
                <Brain className="h-5 w-5" />
              }
            >
              Decisões
            </AppNavLink>

            <AppNavLink
              to="/decisoes/nova"
              icon={
                <Plus className="h-5 w-5" />
              }
            >
              Nova decisão
            </AppNavLink>

            <div className="my-4 border-t border-slate-800" />

            <AppNavLink
              to="/perfil"
              icon={
                <CircleUserRound className="h-5 w-5" />
              }
            >
              Perfil
            </AppNavLink>

            <AppNavLink
              to="/configuracoes"
              icon={
                <Settings className="h-5 w-5" />
              }
            >
              Configurações
            </AppNavLink>
          </nav>

          {/* SAIR */}

          <div className="border-t border-slate-800 p-4">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-5 w-5" />

              Sair
            </button>
          </div>
        </aside>

        {/* ÁREA PRINCIPAL */}

        <div className="flex min-h-screen w-full flex-col md:pl-72">
          {/* HEADER */}

          <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 backdrop-blur-xl md:px-8">
            {/* LOGO MOBILE */}

            <Link
              to="/"
              className="flex items-center gap-2 transition-opacity hover:opacity-80 md:hidden"
            >
              <img
                src="/favicon.ico"
                alt="DecidlyAI"
                className="h-9 w-9 shrink-0 object-contain"
              />

              <span className="flex items-center text-xl font-bold leading-none tracking-tight">
                <span className="text-white">
                  Decidly
                </span>

                <span className="text-violet-400">
                  AI
                </span>
              </span>
            </Link>

            {/* TÍTULO DESKTOP */}

            <div className="hidden md:block">
              <p className="text-sm text-slate-500">
                DecidlyAI
              </p>

              <p className="mt-1 text-lg font-semibold text-white">
                Organize suas decisões
              </p>
            </div>

            {/* AÇÕES */}

            <div className="flex items-center gap-3">
              <Link
                to="/perfil"
                className="hidden items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 transition hover:border-violet-500/40 hover:bg-slate-900 sm:flex"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                  <CircleUserRound className="h-5 w-5" />
                </div>

                <span className="text-sm font-medium text-slate-300">
                  Meu perfil
                </span>
              </Link>

              {/* MENU MOBILE */}

              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(
                    (current) => !current,
                  )
                }
                aria-label={
                  mobileMenuOpen
                    ? "Fechar menu"
                    : "Abrir menu"
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 text-slate-300 transition hover:border-violet-500 hover:text-white md:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </header>

          {/* MENU MOBILE */}

          {mobileMenuOpen ? (
            <div className="fixed inset-x-0 top-20 z-50 border-b border-slate-800 bg-slate-950/95 p-5 backdrop-blur-xl md:hidden">
              <nav className="space-y-2">
                <MobileNavLink
                  to="/dashboard"
                  icon={
                    <LayoutDashboard className="h-5 w-5" />
                  }
                  onClick={closeMobileMenu}
                >
                  Dashboard
                </MobileNavLink>

                <MobileNavLink
                  to="/decisoes"
                  icon={
                    <Brain className="h-5 w-5" />
                  }
                  onClick={closeMobileMenu}
                >
                  Decisões
                </MobileNavLink>

                <MobileNavLink
                  to="/decisoes/nova"
                  icon={
                    <Plus className="h-5 w-5" />
                  }
                  onClick={closeMobileMenu}
                >
                  Nova decisão
                </MobileNavLink>

                <MobileNavLink
                  to="/perfil"
                  icon={
                    <CircleUserRound className="h-5 w-5" />
                  }
                  onClick={closeMobileMenu}
                >
                  Perfil
                </MobileNavLink>

                <MobileNavLink
                  to="/configuracoes"
                  icon={
                    <Settings className="h-5 w-5" />
                  }
                  onClick={closeMobileMenu}
                >
                  Configurações
                </MobileNavLink>

                <div className="my-4 border-t border-slate-800" />

                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                >
                  <LogOut className="h-5 w-5" />

                  Sair
                </button>
              </nav>
            </div>
          ) : null}

          {/* CONTEÚDO DA PÁGINA */}

          <div className="flex-1 px-5 py-8 pb-28 md:px-8 md:py-10">
            {children}
          </div>

          {/* FOOTER GLOBAL */}

          <footer className="border-t border-slate-800 bg-slate-950/70 px-5 py-8 backdrop-blur-xl md:px-8">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center text-sm text-slate-500 md:flex-row md:text-left">
              {/* COPYRIGHT */}

              <span>
                © 2026 DecidlyAI
              </span>

              {/* LINKS LEGAIS */}

              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
                <Link
                  to="/terms"
                  className="transition hover:text-violet-300"
                >
                  Termos de Uso
                </Link>

                <Link
                  to="/privacy"
                  className="transition hover:text-violet-300"
                >
                  Política de Privacidade
                </Link>

                <Link
                  to="/cookies"
                  className="transition hover:text-violet-300"
                >
                  Política de Cookies
                </Link>
              </div>
            </div>
          </footer>

          {/* NAVEGAÇÃO MOBILE */}

          <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 px-2 py-2 backdrop-blur-xl md:hidden">
            <div className="mx-auto grid max-w-lg grid-cols-4">
              <MobileBottomNavLink
                to="/dashboard"
                icon={
                  <LayoutDashboard className="h-5 w-5" />
                }
                label="Início"
              />

              <MobileBottomNavLink
                to="/decisoes"
                icon={
                  <Brain className="h-5 w-5" />
                }
                label="Decisões"
              />

              <MobileBottomNavLink
                to="/decisoes/nova"
                icon={
                  <Plus className="h-5 w-5" />
                }
                label="Nova"
                highlighted
              />

              <MobileBottomNavLink
                to="/perfil"
                icon={
                  <CircleUserRound className="h-5 w-5" />
                }
                label="Perfil"
              />
            </div>
          </nav>
        </div>
      </div>

      {/* AVISO DE COOKIES */}

      <CookieConsent />
    </main>
  );
}

function AppNavLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
    >
      <span className="text-slate-500">
        {icon}
      </span>

      {children}
    </Link>
  );
}

function MobileNavLink({
  to,
  icon,
  children,
  onClick,
}: {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
    >
      <span className="text-violet-400">
        {icon}
      </span>

      {children}
    </Link>
  );
}

function MobileBottomNavLink({
  to,
  icon,
  label,
  highlighted = false,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  highlighted?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition ${
        highlighted
          ? "text-violet-400"
          : "text-slate-500 hover:text-slate-200"
      }`}
    >
      {highlighted ? (
        <span className="flex h-10 w-10 -translate-y-3 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-950/40">
          {icon}
        </span>
      ) : (
        icon
      )}

      <span
        className={
          highlighted
            ? "-mt-3"
            : ""
        }
      >
        {label}
      </span>
    </Link>
  );
}