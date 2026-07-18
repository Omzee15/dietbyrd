import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

// The service worker's own skipWaiting/clientsClaim (registerType:
// 'autoUpdate' in vite.config.ts) only affects *new* requests -- a tab that
// was already open keeps rendering the old cached bundle indefinitely,
// since nothing tells it a new deploy exists. Browsers only re-check the SW
// on their own schedule (roughly every 24h, or on a fresh navigation), so a
// user who leaves a tab/PWA open across a deploy can be stuck on stale
// content -- old image references, old copy, old bugs -- for a very long
// time. This polls for updates every 60s and offers a one-tap refresh once
// one is found, instead of relying on the user to guess to hard-reload.
export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60_000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm">
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-white"
        style={{ backgroundColor: "var(--navy, #0B1528)" }}
      >
        <RefreshCw size={18} className="shrink-0" />
        <p className="text-sm flex-1">A new version of DietByRD is available.</p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
          style={{ backgroundColor: "var(--teal, #0b6e4f)" }}
        >
          Refresh
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-white/60 hover:text-white shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
