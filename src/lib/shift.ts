import { addDays, dateKey, parseHM } from './time';
import type { DateKey, Project, Session, Weekday } from './types';

/**
 * Option „Nachtschicht dem Folgetag zuordnen“: Eine Schicht, die ab 18 Uhr beginnt, steht beim
 * Folgetag (Anstempeln Sonntag 21:30 → steht beim Montag). Früher beginnende Schichten bleiben an
 * ihrem Tag. Zulagen werden weiter nach den echten Uhrzeiten berechnet.
 */
export const NIGHT_SHIFT_FROM = '18:00';

type ShiftProject = Pick<Project, 'shiftToNextDay'>;

/** Ist die Zuordnung zum Folgetag für diesen Arbeitgeber aktiv? */
export function shiftsToNextDay(p: ShiftProject): boolean {
  return !!p.shiftToNextDay;
}

/** Beginnt eine Schicht zu dieser Uhrzeit („HH:MM“) als Nachtschicht? */
export function isNightStart(hm: string): boolean {
  return parseHM(hm) >= parseHM(NIGHT_SHIFT_FROM);
}

/** Tag, bei dem eine Buchung angezeigt und gezählt wird. */
export function sessionDay(p: ShiftProject, s: Pick<Session, 'start'>): DateKey {
  const day = dateKey(s.start);
  const d = new Date(s.start);
  const nightStart = d.getHours() * 60 + d.getMinutes() >= parseHM(NIGHT_SHIFT_FROM);
  return shiftsToNextDay(p) && nightStart ? addDays(day, 1) : day;
}

/**
 * Kalendertag, auf den sich eine Beginnzeit am angezeigten Tag bezieht: bei aktiver Option und
 * Beginn ab 18 Uhr der Vortag, sonst der Tag selbst.
 */
export function workDate(p: ShiftProject, shownDate: DateKey, startHm: string): DateKey {
  return shiftsToNextDay(p) && isNightStart(startHm) ? addDays(shownDate, -1) : shownDate;
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
