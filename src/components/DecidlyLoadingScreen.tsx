import decidlyaiMarkUrl from "../assets/decidlyai-mark-160.png";

interface DecidlyLoadingScreenProps {
  message?: string;
  detail?: string;
}

export function DecidlyLoadingScreen({
  message = "Organizando seus próximos passos",
  detail = "A clareza está tomando forma…",
}: DecidlyLoadingScreenProps) {
  return (
    <div
      className="decidly-loading fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] px-6 text-white"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div
        className="decidly-loading-grid pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <div
        className="decidly-loading-orb decidly-loading-orb-one pointer-events-none absolute"
        aria-hidden="true"
      />
      <div
        className="decidly-loading-orb decidly-loading-orb-two pointer-events-none absolute"
        aria-hidden="true"
      />

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <div
          className="decidly-lamp relative flex h-44 w-44 items-center justify-center"
          aria-hidden="true"
        >
          <div className="decidly-lamp-beam absolute inset-0 rounded-full" />
          <div className="decidly-lamp-ring absolute inset-5 rounded-full border border-violet-300/25" />
          <div className="decidly-lamp-ring decidly-lamp-ring-delayed absolute inset-9 rounded-full border border-fuchsia-200/20" />
          <div className="decidly-lamp-rays absolute inset-0 rounded-full" />
          <div className="decidly-lamp-core relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] border border-violet-200/60 bg-[#14112b] shadow-[0_0_70px_rgba(139,92,246,.55)]">
            <div className="decidly-lamp-shine absolute inset-0 bg-gradient-to-br from-white/25 via-violet-400/10 to-transparent" />
            <img
              src={decidlyaiMarkUrl}
              alt=""
              width={96}
              height={96}
              className="relative h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-violet-300">
          <span className="decidly-loading-dot h-1.5 w-1.5 rounded-full bg-violet-300" />
          DecidlyAI
          <span className="decidly-loading-dot decidly-loading-dot-delay h-1.5 w-1.5 rounded-full bg-fuchsia-300" />
        </div>

        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {message}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">{detail}</p>

        <div className="decidly-loading-progress mt-8 h-1.5 w-52 overflow-hidden rounded-full bg-white/10">
          <div className="decidly-loading-progress-bar h-full w-2/5 rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-300 to-violet-400" />
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-300/80" />
          <span>Pense melhor. Decida com clareza.</span>
          <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300/80" />
        </div>
      </div>
    </div>
  );
}
