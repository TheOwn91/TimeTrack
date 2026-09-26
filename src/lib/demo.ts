import { holidayName } from './holidays';
import { MINUTE, addDays, combine, dateKey, parseDateKey, uid } from './time';
import type { Absence, AppState, Project, Session } from './types';

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

/** Realistische Beispieldaten ab dem Vormonat bis gestern. */
export function demoState(now = Date.now()): AppState {
  const today = dateKey(now);
  const first = parseDateKey(today);
  first.setMonth(first.getMonth() - 1, 1);
  const startDate = dateKey(first);

  const project: Project = {
    id: uid(),
    name: 'Muster Logistik GmbH',
    color: '#2563eb',
    hourlyRate: 17.5,
    dailyTargetHours: 8,
    workdays: [1, 2, 3, 4, 5],
    autoBreak: true,
    state: 'NW',
    startDate,
    vacationDaysPerYear: 30,
    vacationAtStart: 14,
    overtimeAtStartHours: 12.5,
    overtimeSurchargePercent: 25,
    surcharges: [
      { id: uid(), name: 'Spätschicht', kind: 'time', from: '18:00', to: '22:00', percent: 10, enabled: true },
      { id: uid(), name: 'Nachtschicht', kind: 'time', from: '22:00', to: '06:00', percent: 25, enabled: true },
      { id: uid(), name: 'Samstag', kind: 'weekday', weekdays: [6], percent: 15, enabled: true },
      { id: uid(), name: 'Sonntag', kind: 'weekday', weekdays: [0], percent: 50, enabled: true },
      { id: uid(), name: 'Feiertag', kind: 'holiday', percent: 125, enabled: true },
    ],
  };
  const side: Project = {
    ...project,
    id: uid(),
    name: 'Nebenjob Café Hafen',
    color: '#16a34a',
    hourlyRate: 13.9,
    dailyTargetHours: 0,
    workdays: [],
    autoBreak: false,
    surcharges: project.surcharges.map((r) => ({ ...r, id: uid() })),
  };

  const sessions: Session[] = [];
  const absences: Absence[] = [];

  // Die letzten drei Arbeitstage bleiben offen → erscheinen als „Ohne Zeiterfassung“
  const openDays: string[] = [];
  for (let d = addDays(today, -1); openDays.length < 3 && d >= startDate; d = addDays(d, -1)) {
    const wd = parseDateKey(d).getDay();
    if (wd >= 1 && wd <= 5 && !holidayName(d, 'NW')) openDays.push(d);
  }

  let i = 0;
  for (let d = startDate; d < today; d = addDays(d, 1), i++) {
    const wd = parseDateKey(d).getDay();
    const week = Math.floor(i / 7);
    if (wd === 0 || wd === 6) {
      if (wd === 6 && week % 3 === 1) sessions.push(session(project, d, '06:00', '11:00', undefined, 'Inventur'));
      if (wd === 0 && week % 4 === 2) sessions.push(session(project, d, '14:00', '22:00', ['18:00', '18:30']));
      if (wd === 6 && week % 2 === 0) sessions.push(session(side, d, '09:00', '14:30', ['11:45', '12:00']));
      continue;
    }
    if (holidayName(d, 'NW') || openDays.includes(d)) continue;
    if (week === 1 && (wd === 4 || wd === 5)) {
      absences.push({ id: uid(), projectId: project.id, date: d, type: 'urlaub' });
      continue;
    }
    if (week === 3 && wd === 1) {
      absences.push({ id: uid(), projectId: project.id, date: d, type: 'krank', note: 'AU liegt vor' });
      continue;
    }
    if (week === 4 && wd === 5) {
      absences.push({ id: uid(), projectId: project.id, date: d, type: 'ueberstunden' });
      continue;
    }
    const jitter = (n: number) => String(n).padStart(2, '0');
    const m = (i * 7) % 12;
    if (week % 3 === 2) {
      // Spätschicht
      sessions.push(session(project, d, `14:${jitter(m)}`, `22:${jitter((m + 35) % 60)}`, ['18:00', '18:30']));
    } else if (week % 3 === 0 && wd >= 2 && wd <= 4) {
      // Nachtschicht
      sessions.push(session(project, d, '22:00', '06:15', ['02:00', '02:30']));
    } else {
      sessions.push(session(project, d, `07:${jitter(m)}`, `15:${jitter(30 + m)}`, ['11:30', '12:00'], m === 7 ? 'Schulung Stapler' : undefined));
    }
  }

  // Geplanter Urlaub: drei Arbeitstage Mitte nächsten Monats
  const planned = parseDateKey(today);
  planned.setMonth(planned.getMonth() + 1, 12);
  for (let n = 0; n < 3; planned.setDate(planned.getDate() + 1)) {
    const d = dateKey(planned);
    const wd = planned.getDay();
    if (wd === 0 || wd === 6 || holidayName(d, 'NW')) continue;
    absences.push({ id: uid(), projectId: project.id, date: d, type: 'urlaub' });
    n++;
  }

  return { version: 1, projects: [project, side], sessions, absences, selectedProjectId: project.id };
}
