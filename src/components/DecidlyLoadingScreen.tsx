import { useEffect, useRef, useState } from "react";

interface DecidlyLoadingScreenProps {
  message?: string;
  detail?: string;
}

export function DecidlyLoadingScreen({
  message = "Organizando seus próximos passos",
  detail = "A clareza está tomando forma…",
}: DecidlyLoadingScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useGifFallback, setUseGifFallback] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let disposed = false;
    let autoplayTimer: number | undefined;

    const clearAutoplayTimer = () => {
      if (autoplayTimer !== undefined) {
        window.clearTimeout(autoplayTimer);
        autoplayTimer = undefined;
      }
    };

    const showGifFallback = () => {
      clearAutoplayTimer();
      if (disposed) return;
      video.pause();
      setUseGifFallback(true);
    };

    const markVideoPlaying = () => {
      clearAutoplayTimer();
      if (!disposed) setUseGifFallback(false);
    };

    const startPlayback = () => {
      if (disposed) return;
      clearAutoplayTimer();
      setUseGifFallback(false);
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;

      try {
        void video.play().then(markVideoPlaying, showGifFallback);
      } catch {
        showGifFallback();
      }

      autoplayTimer = window.setTimeout(() => {
        if (video.paused || video.currentTime < 0.08) showGifFallback();
      }, 1200);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && video.paused) startPlayback();
    };

    video.addEventListener("playing", markVideoPlaying);
    video.addEventListener("ended", startPlayback);
    video.addEventListener("error", showGifFallback);
    video.addEventListener("loadeddata", startPlayback);
    window.addEventListener("pageshow", startPlayback);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    startPlayback();

    return () => {
      disposed = true;
      clearAutoplayTimer();
      video.removeEventListener("playing", markVideoPlaying);
      video.removeEventListener("ended", startPlayback);
      video.removeEventListener("error", showGifFallback);
      video.removeEventListener("loadeddata", startPlayback);
      window.removeEventListener("pageshow", startPlayback);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      video.pause();
    };
  }, []);

  return (
    <main
      className="decidly-loading-screen fixed inset-0 z-[9999] flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-white"
      role="status"
      aria-live="polite"
      aria-label={message}
      aria-describedby="decidly-loading-detail"
    >
      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <div className="decidly-loading-logo-frame relative aspect-square overflow-hidden rounded-[30px] border-2 border-violet-300/75 bg-white shadow-[0_0_0_1px_rgba(139,92,246,.12),0_0_56px_rgba(139,92,246,.26)]">
          <video
            ref={videoRef}
            className="h-full w-full bg-white object-contain"
            width={512}
            height={512}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/decidly-logo-spinner-poster.png"
            aria-hidden="true"
            tabIndex={-1}
            hidden={useGifFallback}
          >
            <source src="/decidly-logo-spinner.mp4" type="video/mp4" />
          </video>
          {useGifFallback && (
            <img
              src="/decidly-spinner-loop.gif"
              alt=""
              width={260}
              height={260}
              className="h-full w-full bg-white object-contain"
              aria-hidden="true"
            />
          )}
        </div>

        <p className="mt-6 max-w-[25rem] text-center text-lg font-semibold leading-snug text-white sm:text-xl">
          <span className="block">Decidir é fácil.</span>
          <span className="mt-1 block">Decidir certo é que é difícil.</span>
        </p>
        <p className="mt-2 text-sm font-medium tracking-wide text-violet-300">— Davi</p>
        <span id="decidly-loading-detail" className="sr-only">
          {detail}
        </span>
      </div>
    </main>
  );
}
