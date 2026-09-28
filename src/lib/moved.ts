import { DEMO } from './demo';

/** Neue Adresse der App (Repository „Timelytix“). */
export const NEW_APP_URL = 'https://theown91.github.io/Timelytix/';

/** Läuft die App noch unter der alten Adresse …/TimeTrack/? */
export function isOldAddress(): boolean {
  return !DEMO && /^\/timetrack(\/|$)/i.test(window.location.pathname);
}
