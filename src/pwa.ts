type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
};

function isNativeApp(): boolean {
  const cap = (window as Window & { Capacitor?: CapacitorGlobal }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * Registreert de service worker alleen in de gebouwde website.
 * In een latere Capacitor-app laden de bestanden uit de app-bundel;
 * een worker zou die cache in de weg zitten.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (isNativeApp()) return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    const url = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(url).catch(() => {
      // Zonder worker blijft de site online gewoon werken.
    });
  });
}
