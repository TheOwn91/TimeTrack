import { APP_VERSION, type Release } from './changelog';
import { DEMO } from './demo';

/**
 * Updates der installierten App über den Service Worker:
 * - automatisch (Standard): ein neues Update wird aktiviert, sobald es geladen ist
 * - manuell: das Update wartet, bis „Jetzt aktualisieren“ getippt wird
 * Nach dem Update lädt die App neu und zeigt „Was ist neu?“.
 */

const AUTO_KEY = 'timetrack.autoUpdate';
const SHOW_NOTES_KEY = 'timetrack.showNotesAfterUpdate';

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'current' }
  | { state: 'available'; release?: Release }
  | { state: 'installing' }
  | { state: 'offline' }
  | { state: 'unsupported' };

let status: UpdateStatus = { state: 'idle' };
const listeners = new Set<(s: UpdateStatus) => void>();

function setStatus(s: UpdateStatus) {
  status = s;
  listeners.forEach((l) => l(s));
}

export function getUpdateStatus() {
  return status;
}

export function onUpdateStatus(fn: (s: UpdateStatus) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function updateSupported(): boolean {
  return !DEMO && import.meta.env.PROD && 'serviceWorker' in navigator;
}

export function autoUpdateEnabled(): boolean {
  try {
    return localStorage.getItem(AUTO_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setAutoUpdateEnabled(on: boolean) {
  try {
    localStorage.setItem(AUTO_KEY, on ? 'on' : 'off');
  } catch {
    /* ignorieren */
  }
  // Wartet schon ein Update, gleich installieren
  if (on && status.state === 'available') void applyUpdate(false);
}

/** Nach einem Update per Knopf „Was ist neu?“ auf jeden Fall zeigen (auch wenn abgeschaltet). */
export function consumeForcedReleaseNotes(): boolean {
  try {
    const v = sessionStorage.getItem(SHOW_NOTES_KEY) === '1';
    sessionStorage.removeItem(SHOW_NOTES_KEY);
    return v;
  } catch {
    return false;
  }
}

async function registration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!updateSupported()) return undefined;
  return (await navigator.serviceWorker.getRegistration()) ?? undefined;
}

/** Neuester Stand auf dem Server (ohne Cache). */
async function fetchLatest(): Promise<Release | undefined> {
  const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as Release;
}

function waitForInstalled(worker: ServiceWorker, timeoutMs = 30_000): Promise<void> {
  return new Promise((resolve) => {
    if (worker.state === 'installed' || worker.state === 'activated') return resolve();
    const t = setTimeout(resolve, timeoutMs);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' || worker.state === 'activated' || worker.state === 'redundant') {
        clearTimeout(t);
        resolve();
      }
    });
  });
}

let autoPending = false;

/**
 * Ein geladenes, wartendes Update gefunden: je nach Einstellung installieren oder anbieten.
 * Automatisch wird nur direkt beim Öffnen installiert – nie mitten in der Benutzung, dann
 * erst, wenn die App das nächste Mal wieder in den Vordergrund kommt.
 */
function handleWaiting(release?: Release) {
  if (autoUpdateEnabled()) {
    if (performance.now() < 15_000) void applyUpdate(false);
    else autoPending = true;
  } else setStatus({ state: 'available', release: release ?? (status.state === 'available' ? status.release : undefined) });
}

/** „Auf Updates prüfen“: fragt den Server und lädt ein neues Update im Hintergrund. */
export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!updateSupported()) {
    setStatus({ state: 'unsupported' });
    return status;
  }
  setStatus({ state: 'checking' });
  let latest: Release | undefined;
  try {
    latest = await fetchLatest();
  } catch {
    setStatus({ state: 'offline' });
    return status;
  }
  const reg = await registration();
  try {
    await reg?.update();
  } catch {
    /* z. B. offline – version.json war aber erreichbar */
  }
  if (reg?.installing) await waitForInstalled(reg.installing);

  if (reg?.waiting) {
    // Selbst geprüft → Update mit Knopf anbieten (auch bei automatischen Updates)
    setStatus({ state: 'available', release: latest });
  } else if (latest && latest.version !== APP_VERSION) {
    // Server kennt eine neuere Version, der Browser hat sie aber noch nicht geladen
    setStatus({ state: 'available', release: latest });
  } else {
    setStatus({ state: 'current' });
  }
  return status;
}

/**
 * Installiert das bereitstehende Update; die App lädt danach neu und zeigt „Was ist neu?“.
 * `manual`: per Knopf ausgelöst → Änderungen auch zeigen, wenn die Meldung abgeschaltet ist.
 */
export async function applyUpdate(manual = true) {
  const reg = await registration();
  setStatus({ state: 'installing' });
  if (manual) {
    try {
      sessionStorage.setItem(SHOW_NOTES_KEY, '1');
    } catch {
      /* ignorieren */
    }
  }
  if (reg?.installing) await waitForInstalled(reg.installing);
  if (reg?.waiting) {
    reg.waiting.postMessage('SKIP_WAITING'); // → controllerchange → Neuladen
    // Falls der Wechsel ausbleibt, trotzdem neu laden
    setTimeout(() => window.location.reload(), 8000);
  } else {
    window.location.reload();
  }
}

/** Beim Start: Service Worker registrieren und auf neue Versionen achten. */
export function registerServiceWorker() {
  if (!updateSupported()) return;
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  // Nach einem Update einmal neu laden, damit alle Dateien zur neuen Version passen
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    let reg: ServiceWorkerRegistration;
    try {
      reg = await navigator.serviceWorker.register('./sw.js');
    } catch {
      return;
    }
    const watch = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) handleWaiting();
      });
    };
    if (reg.waiting && navigator.serviceWorker.controller) handleWaiting();
    watch(reg.installing);
    reg.addEventListener('updatefound', () => watch(reg.installing));

    // Beim Zurückholen der App (z. B. aus dem Hintergrund) nach Updates schauen
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (autoPending && autoUpdateEnabled() && reg.waiting) void applyUpdate(false);
      else reg.update().catch(() => undefined);
    });
  });
}
