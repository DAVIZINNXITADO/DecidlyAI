import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-8 text-center text-sm text-slate-500 md:flex-row md:text-left">
        <Link
          to="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl">
            <img
              src="/favicon.ico"
              alt="DecidlyAI"
              className="h-full w-full object-cover"
            />
          </div>

          <span className="flex items-center text-lg font-bold leading-none tracking-tight">
            <span className="text-slate-300">
              Decidly
            </span>

            <span className="text-violet-400">
              AI
            </span>
          </span>
        </Link>

        <span>
          © 2026 DecidlyAI
        </span>

        <span>
          Decida com mais clareza.
        </span>
      </div>
    </footer>
  );
}