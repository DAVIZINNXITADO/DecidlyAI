// Shared ambient types for the Cloudflare Turnstile widget, so every route
// reads the same contract instead of declaring it locally.
export {};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (errorCode?: string | number) => void;
        },
      ) => string | number;

      reset: (widgetId?: string | number) => void;

      remove: (widgetId?: string | number) => void;
    };
  }
}
