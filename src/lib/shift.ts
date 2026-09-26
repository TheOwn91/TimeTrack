import { addDays, dateKey } from './time';
import type { DateKey, Project, Session, Weekday } from './types';

/**
 * Versteckte Option für Arbeitgeber, deren Name mit „Hahn Automation“ beginnt:
 * Eine Schicht wird dem Folgetag zugeordnet (Anstempeln Sonntag → steht beim Montag).
 * Zulagen werden weiter nach den echten Uhrzeiten berechnet.
 */
export function hasHahnOptions(p: Pick<Project, 'name'>): boolean {
  return /^\s*hahn automation/i.test(p.name);
}

/** Ist die Zuordnung zum Folgetag für diesen Arbeitgeber aktiv? */
export function shiftsToNextDay(p: Pick<Project, 'name' | 'shiftToNextDay'>): boolean {
  return !!p.shiftToNextDay && hasHahnOptions(p);
}

/** Tag, bei dem eine Buchung angezeigt und gezählt wird. */
export function sessionDay(p: Pick<Project, 'name' | 'shiftToNextDay'>, s: Pick<Session, 'start'>): DateKey {
  const day = dateKey(s.start);
  return shiftsToNextDay(p) ? addDays(day, 1) : day;
}

/** Kalendertag, auf den sich die Beginnzeit einer Buchung am angezeigten Tag bezieht. */
export function workDate(p: Pick<Project, 'name' | 'shiftToNextDay'>, shownDate: DateKey): DateKey {
  return shiftsToNextDay(p) ? addDays(shownDate, -1) : shownDate;
}

/** Arbeitstage um `delta` Tage verschieben (z. B. So–Do → Mo–Fr). */
export function shiftWeekdays(days: Weekday[], delta: number): Weekday[] {
  return days.map((d) => (((d + delta) % 7) + 7) % 7 as Weekday).sort((a, b) => a - b);
}

/**
 * Option ein-/ausschalten (ändert `p`). Die Arbeitstage – auch in allen „gültig ab“-Zeiträumen –
 * wandern mit, damit das Soll an den angezeigten Tagen gezählt wird.
 */
export function setShiftToNextDay(p: Project, on: boolean) {
  if (!!p.shiftToNextDay === on) return;
  const delta = on ? 1 : -1;
  p.shiftToNextDay = on;
  p.workdays = shiftWeekdays(p.workdays, delta);
  if (p.terms) p.terms = p.terms.map((t) => ({ ...t, workdays: shiftWeekdays(t.workdays, delta) }));
}
