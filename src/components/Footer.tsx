import { Link } from "@tanstack/react-router";
import { useLanguageContext } from "../lib/LanguageProvider";
import { t } from "../lib/i18n";

export function Footer() {
  const { language } = useLanguageContext();
  return (
    <footer className="relative z-10 border-t border-slate-800 bg-slate-950/70 px-5 py-8 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 text-center text-sm text-slate-500 md:flex-row md:text-left">
        {/* COPYRIGHT */}

        <span>
          © 2026 DecidlyAI
        </span>

        {/* LINKS LEGAIS */}

        <nav
          aria-label={t(language, "legal.links")}
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2"
        >
          <Link
            to="/terms"
            className="rounded-lg px-2 py-1.5 transition hover:text-violet-300 focus-visible:text-violet-300"
          >
            {t(language, "legal.terms")}
          </Link>

          <Link
            to="/privacy"
            className="rounded-lg px-2 py-1.5 transition hover:text-violet-300 focus-visible:text-violet-300"
          >
            {t(language, "legal.privacy")}
          </Link>

          <Link
            to="/cookies"
            className="rounded-lg px-2 py-1.5 transition hover:text-violet-300 focus-visible:text-violet-300"
          >
            {t(language, "legal.cookies")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
