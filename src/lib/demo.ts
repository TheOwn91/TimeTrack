import { easterSunday, holidayName } from './holidays';
import { BEGINNING } from './terms';
import { MINUTE, addDays, combine, dateKey, parseDateKey, uid } from './time';
import type { Absence, AppState, DateKey, Project, Session } from './types';

/** Build mit `--mode demo`: Beispieldaten, keine Downloads/Dialoge (Sandbox). */
export const DEMO = import.meta.env.MODE === 'demo';

/** Kurzer Hinweis unten auf dem Bildschirm (ersetzt alert). */
export function notify(message: string) {
  window.dispatchEvent(new CustomEvent('timetrack-notice', { detail: message }));
}

/** Rückfrage vor dem Löschen. In der Demo-Sandbox gibt es keine Dialoge. */
export function ask(message: string): boolean {
  return DEMO ? true : confirm(message);
}

function session(project: Project, date: string, from: string, to: string, pause?: [string, string], note?: string): Session {
  const start = combine(date, from);
  let end = combine(date, to);
  if (end <= start) end += 24 * 60 * MINUTE;
  const pauses = pause
    ? [pause].map(([a, b]) => {
        let ps = combine(date, a);
        if (ps < start) ps += 24 * 60 * MINUTE;
        let pe = combine(date, b);
        if (pe < ps) pe += 24 * 60 * MINUTE;
        return { start: ps, end: pe };
      })
    : [];
  return { id: uid(), projectId: project.id, start, end, pauses, note };
}

/** Alle Tage von `from` bis `to` (einschließlich). */
function range(from: DateKey, to: DateKey): DateKey[] {
  const days: DateKey[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
  return days;
}

/**
 * Ein Jahr Beispieldaten (ab dem ersten Tag des Monats vor elf Monaten bis gestern) mit allem,
 * was die App kann: Nachtschichten, die dem Folgetag zugeordnet werden, Früh- und Spätschichten,
 * Zulagen mit „höchste zählt“, Feiertagsarbeit, Samstags-Sonderschichten, Urlaub mit Übertrag,
 * Krank, Kurzarbeit (bis das Stundenkonto leer ist), Überstundenausgleich, Sonderurlaub,
 * Lohnerhöhung mit „gültig ab“, geplanter Urlaub, offene Tage und ein Nebenjob.
 */
export function demoState(now = Date.now()): AppState {
  const today = dateKey(now);
  const first = parseDateKey(today);
  first.setMonth(first.getMonth() - 11, 1);
  const startDate = dateKey(first);
  const STATE = 'RP';

  const project: Project = {
    id: uid(),
    name: 'Muster Automation GmbH',
    color: '#2563eb',
    hourlyRate: 19.85,
    dailyTargetHours: 7.75,
    // Angezeigte Arbeitstage Mo–Fr (Nachtschichten beginnen So–Do am Abend)
    workdays: [1, 2, 3, 4, 5],
    autoBreak: true,
    state: STATE,
    startDate,
    shiftToNextDay: true,
    surchargeMode: 'max',
    vacationDaysPerYear: 30,
    vacationAtStart: 12,
    overtimeAtStartHours: 6,
    overtimeSurchargePercent: 25,
    surcharges: [
      { id: uid(), name: 'Nachtzulage', kind: 'time', from: '20:00', to: '06:00', percent: 25, enabled: true },
      { id: uid(), name: 'Sonntag', kind: 'weekday', weekdays: [0], percent: 50, enabled: true },
      { id: uid(), name: 'Feiertag', kind: 'holiday', percent: 50, enabled: true },
    ],
  };
  const side: Project = {
    id: uid(),
    name: 'Nebenjob Café Hafen',
    color: '#16a34a',
    hourlyRate: 13.9,
    dailyTargetHours: 0,
    workdays: [],
    autoBreak: false,
    state: STATE,
    startDate,
    surcharges: [{ id: uid(), name: 'Sonntag', kind: 'weekday', weekdays: [0], percent: 50, enabled: true }],
  };

  const sessions: Session[] = [];
  const absences: Absence[] = [];
  const absenceDays = new Map<DateKey, Absence>();
  const isWorkday = (d: DateKey) => {
    const wd = parseDateKey(d).getDay();
    return wd >= 1 && wd <= 5 && !holidayName(d, STATE);
  };
  const addAbsence = (days: DateKey[], type: Absence['type'], note?: string, allowFuture = false) => {
    for (const d of days) {
      if (d < startDate || (!allowFuture && d >= today) || !isWorkday(d) || absenceDays.has(d)) continue;
      const a: Absence = { id: uid(), projectId: project.id, date: d, type, note };
      absences.push(a);
      absenceDays.set(d, a);
    }
  };
  // Tag im Jahresfenster zu „MM-TT“ (bzw. im Jahr `y`)
  const years = [Number(startDate.slice(0, 4)), Number(today.slice(0, 4))];
  const md = (mmdd: string) => years.map((y) => `${y}-${mmdd}`);
  const span = (fromMd: string, toMd: string) => years.flatMap((y) => range(`${y}-${fromMd}`, `${y}-${toMd}`));

  // Urlaub: Herbstferien, zwischen den Jahren, Osterwoche, Brückentage, Sommer
  addAbsence(span('10-27', '10-31'), 'urlaub');
  addAbsence(span('12-22', '12-31'), 'urlaub');
  for (const y of years) {
    const easter = easterSunday(y);
    addAbsence(range(addDays(easter, 2), addDays(easter, 5)), 'urlaub'); // Di–Fr nach Ostermontag
    addAbsence([addDays(easter, 40)], 'urlaub', 'Brückentag'); // Freitag nach Christi Himmelfahrt
    addAbsence([addDays(easter, 61)], 'urlaub', 'Brückentag'); // Freitag nach Fronleichnam
  }
  addAbsence(span('07-27', '08-14'), 'urlaub', 'Sommerurlaub');
  // Krank, Überstundenausgleich, Sonderurlaub
  addAbsence(md('11-19'), 'krank', 'AU liegt vor');
  addAbsence(span('02-23', '02-25'), 'krank', 'AU liegt vor');
  addAbsence(md('11-14'), 'ueberstunden');
  addAbsence(md('06-19'), 'ueberstunden');
  addAbsence(md('09-04'), 'sonstiges', 'Umzug (Sonderurlaub)');
  // Kurzarbeit: zwei Wochen im Januar – erst vom Stundenkonto, danach ohne Soll (keine Minusstunden)
  addAbsence(span('01-12', '01-23'), 'kurzarbeit', 'Auftragsflaute');
  // Geplanter Urlaub Mitte nächsten Monats
  const next = parseDateKey(today);
  next.setMonth(next.getMonth() + 1, 12);
  addAbsence(range(dateKey(next), addDays(dateKey(next), 6)), 'urlaub', undefined, true);

  // An diesen Feiertagen wird nachts gearbeitet (Feiertagszulage)
  const holidayWork = new Set(md('10-03').concat(md('05-01')));

  // Die letzten zwei Arbeitstage bleiben offen → erscheinen als „Ohne Zeiterfassung“
  const openDays: DateKey[] = [];
  for (let d = addDays(today, -1); openDays.length < 2 && d >= startDate; d = addDays(d, -1))
    if (isWorkday(d) && !absenceDays.has(d)) openDays.push(d);

  // Schichtfolge im Vier-Wochen-Takt: Nacht, Nacht, Früh, Spät
  const firstMonday = addDays(startDate, -((parseDateKey(startDate).getDay() + 6) % 7));
  const SHIFTS = ['nacht', 'nacht', 'frueh', 'spaet'] as const;
  const pad2 = (n: number) => String(n).padStart(2, '0');
  let i = 0;
  for (let d = startDate; d < today; d = addDays(d, 1), i++) {
    const wd = parseDateKey(d).getDay();
    const week = Math.floor((parseDateKey(d).getTime() - parseDateKey(firstMonday).getTime()) / (7 * 24 * 60 * MINUTE) + 0.01);
    const shift = SHIFTS[week % 4];
    // ein paar Minuten „Streuung“ beim Stempeln
    const j5 = i % 5;
    const j6 = (i * 3) % 7;

    if (wd === 6) {
      // Samstags-Sonderschicht alle fünf Wochen, Nebenjob jeden zweiten Samstag in den letzten vier Monaten
      if (week % 5 === 3) sessions.push(session(project, d, '06:00', '12:00', ['09:00', '09:15'], 'Sonderschicht'));
      if (week % 2 === 0 && d >= addDays(today, -120)) sessions.push(session(side, d, '09:00', '14:30', ['11:45', '12:00']));
      continue;
    }
    if (wd === 0) continue;
    const holidayShift = holidayWork.has(d);
    if ((!isWorkday(d) && !holidayShift) || absenceDays.has(d) || openDays.includes(d)) continue;

    if (shift === 'nacht' || holidayShift) {
      // Beginn am Vorabend (So–Do) – steht beim Folgetag. Pause 02:00–02:30
      const long = i % 23 === 5;
      sessions.push(
        session(project, addDays(d, -1), `21:${pad2(28 + j5)}`, long ? '07:30' : `05:${pad2(52 + j6)}`, ['02:00', '02:30'],
          long ? 'Übergabe verlängert' : i % 29 === 7 ? 'Störung Anlage 4' : undefined),
      );
    } else if (shift === 'frueh') {
      sessions.push(session(project, d, `05:${pad2(55 + j5)}`, `14:${pad2(j6)}`, ['09:30', '10:00'], i % 17 === 3 ? 'Schulung Robotik' : undefined));
    } else {
      sessions.push(session(project, d, `13:${pad2(55 + j5)}`, `22:${pad2(j6)}`, ['18:00', '18:30']));
    }
  }

  // Lohnerhöhung vor sechs Monaten: vorher 19,20 €, seitdem 19,85 € (Verlauf in den Einstellungen)
  const raise = parseDateKey(today);
  raise.setMonth(raise.getMonth() - 5, 1);
  const t = {
    hourlyRate: project.hourlyRate,
    dailyTargetHours: project.dailyTargetHours,
    workdays: project.workdays,
    overtimeSurchargePercent: project.overtimeSurchargePercent ?? 0,
    surchargePercents: Object.fromEntries(project.surcharges.map((r) => [r.id, r.percent])),
  };
  project.terms = [
    { ...t, from: BEGINNING, hourlyRate: 19.2 },
    { ...t, from: dateKey(raise) },
  ];

  return { version: 1, projects: [project, side], sessions, absences, selectedProjectId: project.id };
}
