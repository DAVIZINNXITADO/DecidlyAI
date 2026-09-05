import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        {/* LOGO COM CÉREBRO */}

        <Link
          to="/"
          onClick={closeMobileMenu}
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
            <img
              src="/favicon.ico"
              alt="DecidlyAI"
              className="h-full w-full object-cover"
            />
          </div>

          <span className="text-2xl font-bold leading-none tracking-tight">
            <span className="text-white">
              Decidly
            </span>

            <span className="text-violet-400">
              AI
            </span>
          </span>
        </Link>

        {/* MENU DESKTOP */}

        <div className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          <Link
            to="/"
            hash="como-funciona"
            className="transition hover:text-white"
          >
            Como funciona
          </Link>

          <Link
            to="/"
            hash="recursos"
            className="transition hover:text-white"
          >
            Recursos
          </Link>

          <Link
            to="/"
            hash="planos"
            className="transition hover:text-white"
          >
            Planos
          </Link>
        </div>

        {/* BOTÕES DESKTOP */}

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-violet-500 hover:text-white"
          >
            Entrar
          </Link>

          <Link
            to="/login"
            className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Começar
          </Link>
        </div>

        {/* BOTÃO MOBILE */}

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
          aria-expanded={mobileMenuOpen}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 text-slate-300 transition hover:border-violet-500 hover:text-white md:hidden"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* MENU MOBILE */}

      {mobileMenuOpen ? (
        <div className="border-t border-slate-800 bg-slate-950 px-6 py-5 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            <Link
              to="/"
              hash="como-funciona"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
            >
              Como funciona
            </Link>

            <Link
              to="/"
              hash="recursos"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
            >
              Recursos
            </Link>

            <Link
              to="/"
              hash="planos"
              onClick={closeMobileMenu}
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
            >
              Planos
            </Link>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="flex items-center justify-center rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-violet-500 hover:text-white"
              >
                Entrar
              </Link>

              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="flex items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                Começar
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}