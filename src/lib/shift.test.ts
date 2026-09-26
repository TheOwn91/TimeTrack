import { describe, expect, it } from 'vitest';
import { buildIndex, daySummary, monthSummary } from './calc';
import { hasHahnOptions, setShiftToNextDay, shiftsToNextDay, workDate } from './shift';
import { combine } from './time';
import type { AppState, Project } from './types';

const hahn = (): Project => ({
  id: 'p',
  name: 'Hahn Automation Group',
  color: '#000',
  hourlyRate: 20,
  dailyTargetHours: 7.75,
  workdays: [0, 1, 2, 3, 4], // So–Do (Tag des Anstempelns)
  autoBreak: false,
  state: 'RP',
  surcharges: [
    { id: 'night', name: 'Nacht', kind: 'time', from: '20:00', to: '06:00', percent: 25, enabled: true },
    { id: 'sun', name: 'Sonntag', kind: 'weekday', weekdays: [0], percent: 50, enabled: true },
    { id: 'hol', name: 'Feiertag', kind: 'holiday', percent: 50, enabled: true },
  ],
  startDate: '2026-09-01',
});

// So 27.09.2026 21:30 bis Mo 28.09. 06:15, Pause 02:00–02:30
const state = (p: Project): AppState => ({
  version: 1,
  projects: [p],
  sessions: [
    {
      id: 's',
      projectId: 'p',
      start: combine('2026-09-27', '21:30'),
      end: combine('2026-09-28', '06:15'),
      pauses: [{ start: combine('2026-09-28', '02:00'), end: combine('2026-09-28', '02:30') }],
    },
  ],
  absences: [],
});
const now = combine('2026-09-30', '12:00');

describe('Schicht dem Folgetag zuordnen (Hahn Automation)', () => {
  it('Option gibt es nur für „Hahn Automation…“', () => {
    expect(hasHahnOptions({ name: 'Hahn Automation Group' })).toBe(true);
    expect(hasHahnOptions({ name: 'hahn automation' })).toBe(true);
    expect(hasHahnOptions({ name: 'Muster GmbH' })).toBe(false);
    expect(shiftsToNextDay({ name: 'Muster GmbH', shiftToNextDay: true })).toBe(false);
  });

  it('ohne Option steht die Schicht beim Sonntag', () => {
    const p = hahn();
    const idx = buildIndex(state(p), 'p');
    expect(daySummary(p, '2026-09-27', idx, now).sessions).toHaveLength(1);
    expect(daySummary(p, '2026-09-28', idx, now).sessions).toHaveLength(0);
  });

  it('mit Option steht sie beim Montag, Zulagen nach echter Uhrzeit', () => {
    const p = hahn();
    setShiftToNextDay(p, true);
    const idx = buildIndex(state(p), 'p');
    expect(daySummary(p, '2026-09-27', idx, now).sessions).toHaveLength(0);
    const mon = daySummary(p, '2026-09-28', idx, now);
    expect(mon.sessions).toHaveLength(1);
    expect(mon.worked).toBe(495); // 8:45 − 0:30
    expect(mon.surcharges.sun).toBe(150); // So 21:30–24:00: Sonntag (höher als Nacht)
    expect(mon.surcharges.night).toBe(330); // Mo 0–6 Uhr ohne Pause
    expect(mon.target).toBe(465); // Montag ist jetzt Arbeitstag (7:45)
  });

  it('Arbeitstage wandern beim Ein- und Ausschalten mit', () => {
    const p = hahn();
    setShiftToNextDay(p, true);
    expect(p.workdays).toEqual([1, 2, 3, 4, 5]);
    setShiftToNextDay(p, false);
    expect(p.workdays).toEqual([0, 1, 2, 3, 4]);
  });

  it('Beginnzeit im Tages-Editor bezieht sich auf den Vortag', () => {
    const p = hahn();
    expect(workDate(p, '2026-09-28')).toBe('2026-09-28');
    setShiftToNextDay(p, true);
    expect(workDate(p, '2026-09-28')).toBe('2026-09-27');
  });

  it('Monatsgrenze: Schicht ab 30.09. zählt im Oktober', () => {
    const p = hahn();
    setShiftToNextDay(p, true);
    const st: AppState = {
      ...state(p),
      sessions: [{ id: 'x', projectId: 'p', start: combine('2026-09-30', '21:30'), end: combine('2026-10-01', '06:00'), pauses: [] }],
    };
    const later = combine('2026-10-05', '12:00');
    expect(monthSummary(st, p, 2026, 8, later).worked).toBe(0);
    expect(monthSummary(st, p, 2026, 9, later).worked).toBe(510);
  });
});
