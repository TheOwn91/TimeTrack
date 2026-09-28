import { describe, expect, it } from 'vitest';
import { materializeAutoBreaks } from './autobreak';
import { buildIndex, daySummary } from './calc';
import { combine } from './time';
import type { AppState, Project, Session } from './types';

const project: Project = {
  id: 'p',
  name: 'Muster',
  color: '#000',
  hourlyRate: 0,
  dailyTargetHours: 7.75,
  workdays: [1, 2, 3, 4, 5],
  autoBreak: true,
  state: 'RP',
  surcharges: [],
  startDate: '2026-08-01',
};
const hm = (ts: number) => new Date(ts).toTimeString().slice(0, 5);
const pauses = (s: Session) => s.pauses.map((p) => `${hm(p.start)}–${hm(p.end!)}${p.auto ? ' (auto)' : ''}`);
const later = combine('2026-08-20', '12:00');

describe('automatische Pausen als echte Pausen speichern', () => {
  it('Beispiel: Nachtschicht mit 30 min Pause, danach 11 min bis Schichtende', () => {
    const p = { ...project, shiftToNextDay: true };
    const st: AppState = {
      version: 1,
      projects: [p],
      sessions: [
        {
          id: 's',
          projectId: 'p',
          start: combine('2026-08-10', '21:49'),
          end: combine('2026-08-11', '07:30'),
          pauses: [{ start: combine('2026-08-11', '01:49'), end: combine('2026-08-11', '02:19') }],
        },
      ],
      absences: [],
    };
    expect(materializeAutoBreaks(st)).toBe(true);
    expect(pauses(st.sessions[0])).toEqual(['01:49–02:19', '07:19–07:30 (auto)']);
    const day = daySummary(p, '2026-08-11', buildIndex(st, 'p'), later);
    expect(day.worked).toBe(540); // 9:41 − 0:41
    expect(day.autoBreak).toBe(0); // nichts mehr zusätzlich im Hintergrund
    expect(day.pause).toBe(41);
  });

  it('gelöschte automatische Pause kommt nicht wieder', () => {
    const st: AppState = {
      version: 1,
      projects: [project],
      sessions: [{ id: 's', projectId: 'p', start: combine('2026-08-03', '08:00'), end: combine('2026-08-03', '18:00'), pauses: [] }],
      absences: [],
    };
    materializeAutoBreaks(st);
    expect(pauses(st.sessions[0])).toEqual(['14:00–14:30 (auto)', '17:30–17:45 (auto)']);
    st.sessions[0].pauses.splice(1, 1); // zweite Pause löschen
    expect(materializeAutoBreaks(st)).toBe(false);
    expect(pauses(st.sessions[0])).toEqual(['14:00–14:30 (auto)']);
    expect(daySummary(project, '2026-08-03', buildIndex(st, 'p'), later).worked).toBe(570);
  });

  it('laufende Zeit bleibt unverändert, beim Beenden wird eingetragen', () => {
    const st: AppState = {
      version: 1,
      projects: [project],
      sessions: [{ id: 's', projectId: 'p', start: combine('2026-08-03', '06:00'), pauses: [] }],
      absences: [],
    };
    expect(materializeAutoBreaks(st)).toBe(false);
    st.sessions[0].end = combine('2026-08-03', '13:00');
    materializeAutoBreaks(st);
    expect(pauses(st.sessions[0])).toEqual(['12:00–12:30 (auto)']);
  });

  it('nachgetragene zweite Buchung am selben Tag: vorhandene Pausen zählen mit', () => {
    const st: AppState = {
      version: 1,
      projects: [project],
      sessions: [{ id: 'a', projectId: 'p', start: combine('2026-08-03', '06:00'), end: combine('2026-08-03', '13:00'), pauses: [] }],
      absences: [],
    };
    materializeAutoBreaks(st);
    st.sessions.push({ id: 'b', projectId: 'p', start: combine('2026-08-03', '13:30'), end: combine('2026-08-03', '17:00'), pauses: [] });
    materializeAutoBreaks(st);
    // 06–12 Arbeit, 12:00–12:30 Pause, 12:30–13:00 + 13:30–15:30 → 9 h um 15:30; 30 + 30 (Lücke) ≥ 45 → keine weitere
    expect(pauses(st.sessions[0])).toEqual(['12:00–12:30 (auto)']);
    expect(pauses(st.sessions[1])).toEqual([]);
  });

  it('ohne automatische Pause nichts eintragen', () => {
    const p = { ...project, autoBreak: false };
    const st: AppState = {
      version: 1,
      projects: [p],
      sessions: [{ id: 's', projectId: 'p', start: combine('2026-08-03', '08:00'), end: combine('2026-08-03', '18:00'), pauses: [] }],
      absences: [],
    };
    expect(materializeAutoBreaks(st)).toBe(false);
    expect(st.sessions[0].pauses).toEqual([]);
  });
});
