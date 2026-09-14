/*
 * Service worker mínimo e seguro.
 * Se no futuro quiser monetizar com anúncios, use uma rede séria
 * (ex: Google AdSense/Ad Manager) pelo método oficial dela —
 * nunca via hijack de service worker como estava antes.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});