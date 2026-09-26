import { DEMO } from './demo';

export interface Release {
  version: string;
  date: string;
  changes: string[];
}

/** Neueste Version zuerst. Bei jedem Update hier einen Eintrag ergänzen. */
export const CHANGELOG: Release[] = [
  {
    version: '0.4.0',
    date: '26.09.2026',
    changes: [
      'Neue Seite „Jahr“: Urlaub (Anspruch, Übertrag, genommen, geplant, Rest) und Überstundenkonto Monat für Monat',
      'Resturlaub und Überstunden werden automatisch ins nächste Jahr übernommen',
      'Zuschlag auf Überstunden – wird am Monatsende gutgeschrieben',
      'Urlaubstage und Resturlaub in der Monatsübersicht',
      'Diese Meldung nach Updates (abschaltbar)',
    ],
  },
  {
    version: '0.3.0',
    date: '26.09.2026',
    changes: ['Symbol in der Statusleiste, solange die Zeit läuft', 'Zahlenfelder akzeptieren Komma („22,50“)', 'Besser lesbarer Dark Mode'],
  },
  {
    version: '0.2.0',
    date: '26.09.2026',
    changes: ['Läuft offline als App auf dem Handy', 'PDF-Bericht und Datensicherung über das Teilen-Menü'],
  },
  {
    version: '0.1.0',
    date: '25.09.2026',
    changes: ['Erste Version: Zeiterfassung, Monatsansicht, Zulagen, PDF-Monatsbericht'],
  },
];

export const APP_VERSION = CHANGELOG[0].version;

/** Solange die Version mit 0. beginnt, ist die App noch in Entwicklung. */
export const IN_DEVELOPMENT = APP_VERSION.startsWith('0.');

const SEEN_KEY = 'timetrack.lastSeenVersion';
const OFF_KEY = 'timetrack.updateNotes';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignorieren */
  }
}

export function updateNotesEnabled(): boolean {
  return read(OFF_KEY) !== 'off';
}

export function setUpdateNotesEnabled(on: boolean) {
  write(OFF_KEY, on ? 'on' : 'off');
}

export function markVersionSeen() {
  write(SEEN_KEY, APP_VERSION);
}

/** Einträge, die seit dem letzten Start neu sind (leer: nichts anzeigen). */
export function releasesSince(lastSeen: string | null, changelog = CHANGELOG): Release[] {
  if (lastSeen === null) return [];
  const idx = changelog.findIndex((r) => r.version === lastSeen);
  if (idx === 0) return [];
  // Unbekannte Version: nur die neueste zeigen
  return idx === -1 ? changelog.slice(0, 1) : changelog.slice(0, idx);
}

/**
 * Beim Start: Was ist seit dem letzten Start neu? Bei der allerersten Installation wird nichts
 * angezeigt, nur die Version gemerkt. In der Demo zählt der erste Besuch als Update.
 */
export function pendingReleaseNotes(): Release[] {
  let lastSeen = read(SEEN_KEY);
  if (lastSeen === null) {
    if (!DEMO) {
      markVersionSeen();
      return [];
    }
    lastSeen = '';
  }
  const releases = releasesSince(lastSeen);
  if (!releases.length) return [];
  if (!updateNotesEnabled()) {
    markVersionSeen();
    return [];
  }
  return releases;
}
