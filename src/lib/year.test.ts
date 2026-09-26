import { describe, expect, it } from 'vitest';
import { combine } from './time';
import type { AppState, Project, Session } from './types';
import { overtimeSurcharge, yearOverview } from './year';

// Ohne Arbeitstage gibt es kein Soll → Monatssaldo = gearbeitete Zeit (einfach nachzurechnen)
const project: Project = {
  id: 'p',
  name: 'Test',
  color: '#000',
  hourlyRate: 0,
  dailyTargetHours: 8,
  workdays: [],
  autoBreak: false,
  state: '',
  surcharges: [],
  startDate: '2025-11-01',
  vacationDaysPerYear: 30,
  vacationAtStart: 5,
  overtimeAtStartHours: 2,
  overtimeSurchargePercent: 25,
};

const work = (date: string, from: string, to: string): Session => ({
  id: date,
  projectId: 'p',
  start: combine(date, from),
  end: combine(date, to),
  pauses: [],
});

const state: AppState = {
  version: 1,
  projects: [project],
  sessions: [
    work('2025-11-10', '08:00', '18:00'), // +10 h
    work('2026-01-05', '08:00', '12:00'), // +4 h
    work('2026-02-10', '08:00', '10:00'), // +2 h (laufender Monat)
  ],
  absences: [
    { id: 'u1', projectId: 'p', date: '2025-12-22', type: 'urlaub' },
    { id: 'u2', projectId: 'p', date: '2026-01-02', type: 'urlaub' },
    { id: 'u3', projectId: 'p', date: '2026-03-02', type: 'urlaub' },
  ],
};
const now = combine('2026-02-15', '12:00');

describe('Überstundenkonto', () => {
  it('rechnet den Zuschlag nur auf positive Überstunden', () => {
    expect(overtimeSurcharge(project, 600)).toBe(150);
    expect(overtimeSurcharge(project, -120)).toBe(0);
    expect(overtimeSurcharge({ ...project, overtimeSurchargePercent: undefined }, 600)).toBe(0);
  });

  it('startet mit dem Anfangsstand und schreibt Zuschläge am Monatsende gut', () => {
    const y = yearOverview(state, project, 2025, now);
    expect(y.overtime.carryIn).toBe(120);
    expect(y.overtime.balance).toBe(600);
    expect(y.overtime.surcharge).toBe(150);
    expect(y.overtime.total).toBe(120 + 600 + 150);
    expect(y.overtime.months[9].inactive).toBe(true); // Oktober vor Erfassungsbeginn
  });

  it('übernimmt den Stand ins Folgejahr; laufender Monat nur voraussichtlich', () => {
    const y = yearOverview(state, project, 2026, now);
    expect(y.overtime.carryIn).toBe(870);
    expect(y.overtime.months[0].total).toBe(870 + 240 + 60);
    expect(y.overtime.months[1].complete).toBe(false);
    expect(y.overtime.pendingSurcharge).toBe(30);
    expect(y.overtime.total).toBe(870 + 240 + 60 + 120);
  });
});

describe('Urlaub', () => {
  it('nutzt im ersten Jahr den Resturlaub bei Erfassungsbeginn', () => {
    const y = yearOverview(state, project, 2025, now);
    expect(y.vacation).toEqual({ entitlement: 5, carryIn: 0, taken: 1, planned: 0, remaining: 4 });
  });

  it('übernimmt Resturlaub ins Folgejahr und zählt geplanten Urlaub', () => {
    const y = yearOverview(state, project, 2026, now);
    expect(y.vacation).toEqual({ entitlement: 30, carryIn: 4, taken: 1, planned: 1, remaining: 32 });
  });

  it('vor Erfassungsbeginn gibt es keine Werte', () => {
    expect(yearOverview(state, project, 2024, now).beforeStart).toBe(true);
  });
});
