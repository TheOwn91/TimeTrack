import { describe, expect, it } from 'vitest';
import { monthSummary } from './calc';
import { BEGINNING, describeChanges, fmtWorkdays, projectAt, removeTerms, saveTerms, termsAt, termsList } from './terms';
import { combine } from './time';
import type { AppState, Project, Session } from './types';
import { yearOverview } from './year';

const base = (): Project => ({
  id: 'p',
  name: 'Test',
  color: '#000',
  hourlyRate: 20,
  dailyTargetHours: 8,
  workdays: [1, 2, 3, 4, 5],
  autoBreak: false,
  state: '',
  surcharges: [{ id: 'night', name: 'Nacht', kind: 'time', from: '22:00', to: '06:00', percent: 25, enabled: true }],
  startDate: '2026-08-01',
  overtimeSurchargePercent: 0,
});

const work = (date: string, from: string, to: string): Session => ({
  id: date,
  projectId: 'p',
  start: combine(date, from),
  end: combine(date, to) + (to < from ? 86_400_000 : 0),
  pauses: [],
});

describe('Vertragswerte mit „gültig ab“', () => {
  it('ohne Verlauf gelten die Felder des Arbeitgebers', () => {
    const p = base();
    expect(termsList(p)).toHaveLength(1);
    expect(termsAt(p, '2026-01-01').hourlyRate).toBe(20);
  });

  it('neue Werte gelten erst ab ihrem Datum', () => {
    const p = base();
    saveTerms(p, { ...termsAt(p, '2026-09-01'), from: '2026-09-15', hourlyRate: 22 }, undefined, '2026-09-20');
    expect(termsAt(p, '2026-09-14').hourlyRate).toBe(20);
    expect(termsAt(p, '2026-09-15').hourlyRate).toBe(22);
    expect(p.hourlyRate).toBe(22); // Felder zeigen die heute gültigen Werte
    expect(termsList(p)[0].from).toBe(BEGINNING);
  });

  it('der erste Zeitraum bleibt beim Löschen erhalten', () => {
    const p = base();
    saveTerms(p, { ...termsAt(p, '2026-09-01'), from: '2026-09-15', hourlyRate: 22 }, undefined, '2026-09-20');
    removeTerms(p, BEGINNING, '2026-09-20');
    expect(termsList(p)).toHaveLength(2);
    removeTerms(p, '2026-09-15', '2026-09-20');
    expect(termsList(p)).toHaveLength(1);
    expect(p.hourlyRate).toBe(20);
  });

  it('Bearbeiten mit neuem Datum verschiebt den Eintrag', () => {
    const p = base();
    saveTerms(p, { ...termsAt(p, '2026-09-01'), from: '2026-09-15', hourlyRate: 22 }, undefined, '2026-09-20');
    saveTerms(p, { ...termsAt(p, '2026-09-15'), from: '2026-10-01' }, '2026-09-15', '2026-09-20');
    expect(termsList(p).map((t) => t.from)).toEqual([BEGINNING, '2026-10-01']);
  });

  it('Lohn, Zulagen und Soll werden tageweise mit den damals gültigen Werten gerechnet', () => {
    const p = base();
    saveTerms(
      p,
      { ...termsAt(p, '2026-09-01'), from: '2026-09-15', hourlyRate: 22, dailyTargetHours: 6, surchargePercents: { night: 50 } },
      undefined,
      '2026-09-30',
    );
    const state: AppState = {
      version: 1,
      projects: [p],
      sessions: [work('2026-09-14', '22:00', '06:00'), work('2026-09-15', '22:00', '06:00')], // Mo, Di
      absences: [],
    };
    const sum = monthSummary(state, p, 2026, 8, combine('2026-10-01', '12:00'));
    // Nacht: 8 h × 20 € × 25 % = 40 €  +  8 h × 22 € × 50 % = 88 €
    expect(sum.surcharges[0].amount).toBeCloseTo(128);
    expect(sum.surcharges[0].rule.percent).toBe(50);
    // Lohn: 8 h × 20 € + 8 h × 22 €
    expect(sum.baseWage).toBeCloseTo(160 + 176);
    // Soll: 1.–14.9. = 10 Arbeitstage × 8 h, 15.–30.9. = 12 Arbeitstage × 6 h
    expect(sum.target).toBe(10 * 480 + 12 * 360);
    // Der August bleibt unverändert beim alten Soll
    expect(monthSummary(state, p, 2026, 7, combine('2026-10-01', '12:00')).target).toBe(21 * 480);
  });

  it('Überstunden-Zuschlag gilt mit dem Satz zum Monatsende', () => {
    const p = { ...base(), workdays: [] as Project['workdays'] };
    saveTerms(p, { ...termsAt(p, '2026-09-01'), from: '2026-09-20', overtimeSurchargePercent: 25 }, undefined, '2026-10-05');
    const state: AppState = { version: 1, projects: [p], sessions: [work('2026-08-10', '08:00', '12:00'), work('2026-09-10', '08:00', '12:00')], absences: [] };
    const y = yearOverview(state, p, 2026, combine('2026-10-05', '12:00'));
    expect(y.overtime.months[7].surcharge).toBe(0); // August: noch 0 %
    expect(y.overtime.months[8].surcharge).toBe(60); // September: 25 % von 4 h
    expect(projectAt(p, '2026-08-31').overtimeSurchargePercent).toBe(0);
  });

  it('beschreibt Änderungen verständlich', () => {
    const p = base();
    const a = termsAt(p, '2026-09-01');
    const b = { ...a, from: '2026-10-01', hourlyRate: 22, workdays: [1, 2, 3, 4] as Project['workdays'] };
    expect(describeChanges(a, b, p).map((x) => x.replace(/\s/g, ' '))).toEqual(['Stundenlohn 22,00 €', 'Arbeitstage Mo–Do']);
    expect(fmtWorkdays([1, 3, 5])).toBe('Mo, Mi, Fr');
    expect(fmtWorkdays([0, 1, 2, 3, 4])).toBe('So–Do');
    expect(fmtWorkdays([1, 2, 3, 4, 5])).toBe('Mo–Fr');
    expect(fmtWorkdays([5, 6, 0, 1])).toBe('Fr–Mo');
  });
});
