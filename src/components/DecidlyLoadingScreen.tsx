import { useEffect, useRef } from "react";
import decidlyaiMarkUrl from "../assets/decidlyai-mark-160.png";

interface DecidlyLoadingScreenProps {
  message?: string;
  detail?: string;
}

export function DecidlyLoadingScreen({
  message = "Organizando seus próximos passos",
  detail = "A clareza está tomando forma…",
}: DecidlyLoadingScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (reducedMotion.matches) {
        video.pause();
        return;
      }
      void video.play().catch(() => undefined);
    };

    syncPlayback();
    reducedMotion.addEventListener("change", syncPlayback);
    return () => {
      reducedMotion.removeEventListener("change", syncPlayback);
      video.pause();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-6 text-zinc-900"
      role="status"
      aria-live="polite"
      aria-label={message}
      aria-describedby="decidly-loading-detail"
    >
      <video
        ref={videoRef}
        className="h-auto w-[80vw] max-w-[320px] motion-reduce:hidden"
        width={512}
        height={512}
        muted
        loop
        playsInline
        preload="auto"
        poster={decidlyaiMarkUrl}
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/decidly-logo-spinner.mp4" type="video/mp4" />
        <img
          src={decidlyaiMarkUrl}
          alt=""
          width={160}
          height={160}
          className="mx-auto h-40 w-40 object-contain"
        />
      </video>
      <img
        src={decidlyaiMarkUrl}
        alt=""
        width={160}
        height={160}
        className="hidden h-auto w-[80vw] max-w-[320px] object-contain motion-reduce:block"
      />

      <p className="mt-4 max-w-[25rem] text-center text-lg font-semibold leading-snug text-zinc-800 sm:text-xl">
        <span className="block">Decidir é fácil.</span>
        <span className="mt-1 block">Decidir certo é que é difícil.</span>
      </p>
      <p className="mt-2 text-sm font-medium tracking-wide text-zinc-500">— Davi</p>
      <span id="decidly-loading-detail" className="sr-only">
        {detail}
      </span>
    </div>
  );
}
