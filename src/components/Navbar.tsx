import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

function scrollToSection(sectionId: string) {
  const target = document.getElementById(sectionId);

  if (!target) {
    return;
  }

  const targetTop =
    target.getBoundingClientRect().top +
    window.scrollY;

  window.scrollTo({
    top: targetTop,
    behavior: "smooth",
  });
}

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function handleSectionClick(sectionId: string) {
    closeMobileMenu();

    /*
     * No mobile, esperamos o React remover o menu
     * antes de medir a posição da seção.
     */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToSection(sectionId);
      });
    });
  }

  function handleHomeClick() {
    closeMobileMenu();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-xl transition-colors duration-200">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        {/* LOGO */}

        <Link
          to="/"
          onClick={(event) => {
            if (window.location.pathname === "/") {
              event.preventDefault();
              handleHomeClick();
              return;
            }

            closeMobileMenu();
          }}
          className="interactive-scale flex items-center gap-3 rounded-xl transition-opacity hover:opacity-90"
          aria-label="Voltar para o início"
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
          <button
            type="button"
            onClick={() =>
              handleSectionClick("como-funciona")
            }
            className="rounded-lg px-1 py-2 transition-colors hover:text-white focus-visible:text-white"
          >
            Como funciona
          </button>

          <button
            type="button"
            onClick={() =>
              handleSectionClick("recursos")
            }
            className="rounded-lg px-1 py-2 transition-colors hover:text-white focus-visible:text-white"
          >
            Recursos
          </button>

          <button
            type="button"
            onClick={() =>
              handleSectionClick("planos")
            }
            className="rounded-lg px-1 py-2 transition-colors hover:text-white focus-visible:text-white"
          >
            Planos
          </button>
        </div>

        {/* BOTÕES DESKTOP */}

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="interactive-lift rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-violet-500 hover:text-white"
          >
            Entrar
          </Link>

          <Link
            to="/login"
            className="interactive-lift rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 hover:shadow-violet-950/50"
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
          className="interactive-scale flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 text-slate-300 transition hover:border-violet-500 hover:text-white md:hidden"
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
        <div className="border-t border-slate-800 bg-slate-950/95 px-6 py-5 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            <button
              type="button"
              onClick={() =>
                handleSectionClick(
                  "como-funciona",
                )
              }
              className="rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
            >
              Como funciona
            </button>

            <button
              type="button"
              onClick={() =>
                handleSectionClick("recursos")
              }
              className="rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
            >
              Recursos
            </button>

            <button
              type="button"
              onClick={() =>
                handleSectionClick("planos")
              }
              className="rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
            >
              Planos
            </button>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="interactive-lift flex items-center justify-center rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-violet-500 hover:text-white"
              >
                Entrar
              </Link>

              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="interactive-lift flex items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500"
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