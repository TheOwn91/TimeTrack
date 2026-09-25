import { describe, expect, it } from 'vitest';
import { autoBreakDeduction, buildIndex, daySummary, monthSummary, sessionStats, surchargeMinutes, untrackedDays, workIntervals } from './calc';
import { easterSunday, holidayName } from './holidays';
import { combine } from './time';
import type { AppState, Project, SurchargeRule } from './types';

const project: Project = {
  id: 'p',
  name: 'Test',
  color: '#000',
  hourlyRate: 20,
  dailyTargetHours: 8,
  workdays: [1, 2, 3, 4, 5],
  autoBreak: true,
  state: 'NW',
  surcharges: [
    { id: 'late', name: 'Spät', kind: 'time', from: '18:00', to: '22:00', percent: 10, enabled: true },
    { id: 'night', name: 'Nacht', kind: 'time', from: '22:00', to: '06:00', percent: 25, enabled: true },
    { id: 'sun', name: 'Sonntag', kind: 'weekday', weekdays: [0], percent: 50, enabled: true },
    { id: 'hol', name: 'Feiertag', kind: 'holiday', percent: 125, enabled: true },
  ],
  startDate: '2026-09-01',
};

const state = (partial: Partial<AppState> = {}): AppState => ({
  version: 1,
  projects: [project],
  sessions: [],
  absences: [],
  ...partial,
});

describe('Arbeitszeit und Pausen', () => {
  it('zieht erfasste Pausen ab', () => {
    const s = {
      id: 's',
      projectId: 'p',
      start: combine('2026-09-01', '08:00'),
      end: combine('2026-09-01', '16:30'),
      pauses: [{ start: combine('2026-09-01', '12:00'), end: combine('2026-09-01', '12:30') }],
    };
    expect(workIntervals(s, 0)).toHaveLength(2);
    expect(sessionStats(s, 0)).toEqual({ gross: 510, net: 480, pause: 30 });
  });

  it('berechnet die gesetzliche Mindestpause', () => {
    expect(autoBreakDeduction(300, 0)).toBe(0);
    expect(autoBreakDeduction(370, 0)).toBe(10);
    expect(autoBreakDeduction(480, 0)).toBe(30);
    expect(autoBreakDeduction(480, 30)).toBe(0);
    expect(autoBreakDeduction(600, 0)).toBe(45);
    expect(autoBreakDeduction(600, 30)).toBe(15);
  });

  it('zählt Lücken zwischen Buchungen als Pause', () => {
    const st = state({
      sessions: [
        { id: 'a', projectId: 'p', start: combine('2026-09-01', '08:00'), end: combine('2026-09-01', '12:00'), pauses: [] },
        { id: 'b', projectId: 'p', start: combine('2026-09-01', '12:45'), end: combine('2026-09-01', '17:00'), pauses: [] },
      ],
    });
    const d = daySummary(project, '2026-09-01', buildIndex(st, 'p'), combine('2026-09-02', '10:00'));
    expect(d.pause).toBe(45);
    expect(d.autoBreak).toBe(0);
    expect(d.worked).toBe(495);
  });
});

describe('Zulagen', () => {
  it('rechnet Nachtschicht über Mitternacht', () => {
    // Fr 25.09.2026 20:00 bis Sa 04:00
    const iv: [number, number][] = [[combine('2026-09-25', '20:00'), combine('2026-09-26', '04:00')]];
    const m = surchargeMinutes(iv, project.surcharges, 'NW');
    expect(m.late).toBe(120);
    expect(m.night).toBe(360);
    expect(m.sun).toBe(0);
  });

  it('rechnet Sonn- und Feiertage', () => {
    // So 27.09.2026
    const sunday = surchargeMinutes([[combine('2026-09-27', '10:00'), combine('2026-09-27', '14:00')]], project.surcharges, 'NW');
    expect(sunday.sun).toBe(240);
    // Sa 03.10.2026 Tag der Deutschen Einheit
    const hol = surchargeMinutes([[combine('2026-10-03', '10:00'), combine('2026-10-03', '12:30')]], project.surcharges, 'NW');
    expect(hol.hol).toBe(150);
  });

  it('beachtet deaktivierte Regeln und Wochentagsfilter', () => {
    const rules: SurchargeRule[] = [
      { id: 'x', name: 'Nur Mo', kind: 'time', from: '00:00', to: '23:59', weekdays: [1], percent: 10, enabled: true },
      { id: 'y', name: 'Aus', kind: 'weekday', weekdays: [5], percent: 10, enabled: false },
    ];
    const m = surchargeMinutes([[combine('2026-09-25', '10:00'), combine('2026-09-25', '11:00')]], rules, '');
    expect(m).toEqual({ x: 0 });
  });
});

describe('Feiertage', () => {
  it('kennt Ostern und bundeslandspezifische Feiertage', () => {
    expect(easterSunday(2026)).toBe('2026-04-05');
    expect(easterSunday(2027)).toBe('2027-03-28');
    expect(holidayName('2026-04-03', 'NW')).toBe('Karfreitag');
    expect(holidayName('2026-06-04', 'NW')).toBe('Fronleichnam');
    expect(holidayName('2026-06-04', 'HH')).toBeUndefined();
    expect(holidayName('2026-11-18', 'SN')).toBe('Buß- und Bettag');
    expect(holidayName('2026-01-01', '')).toBeUndefined();
  });
});

describe('Monat und fehlende Tage', () => {
  const now = combine('2026-09-10', '12:00');

  it('listet vergangene Arbeitstage ohne Erfassung', () => {
    const st = state({
      sessions: [{ id: 'a', projectId: 'p', start: combine('2026-09-01', '08:00'), end: combine('2026-09-01', '16:30'), pauses: [] }],
      absences: [{ id: 'u', projectId: 'p', date: '2026-09-02', type: 'urlaub' }],
    });
    const missing = untrackedDays(st, project, now).map((d) => d.date);
    // 1.9. erfasst, 2.9. Urlaub, 5./6.9. Wochenende, 10.9. heute
    expect(missing).toEqual(['2026-09-09', '2026-09-08', '2026-09-07', '2026-09-04', '2026-09-03']);
  });

  it('berechnet Soll, Ist und Saldo', () => {
    const st = state({
      sessions: [{ id: 'a', projectId: 'p', start: combine('2026-09-01', '08:00'), end: combine('2026-09-01', '18:00'), pauses: [] }],
      absences: [
        { id: 'u', projectId: 'p', date: '2026-09-02', type: 'urlaub' },
        { id: 'k', projectId: 'p', date: '2026-09-03', type: 'kurzarbeit' },
        { id: 'o', projectId: 'p', date: '2026-09-04', type: 'ueberstunden' },
      ],
    });
    const sum = monthSummary(st, project, 2026, 8, combine('2026-09-04', '20:00'));
    // 1.9.: 10 h brutto − 45 min gesetzliche Pause = 9:15
    expect(sum.worked).toBe(555);
    expect(sum.credit).toBe(480);
    // Soll: 1.9., 2.9., 4.9. (3.9. Kurzarbeit ohne Soll)
    expect(sum.target).toBe(3 * 480);
    expect(sum.balance).toBe(555 + 480 - 1440);
    expect(sum.absenceCounts).toEqual({ urlaub: 1, kurzarbeit: 1, ueberstunden: 1 });
  });

  it('setzt für heute erst ein Soll an, wenn etwas erfasst ist', () => {
    const empty = monthSummary(state(), project, 2026, 8, combine('2026-09-01', '07:00'));
    expect(empty.target).toBe(0);
    const started = monthSummary(
      state({ sessions: [{ id: 'a', projectId: 'p', start: combine('2026-09-01', '07:00'), pauses: [] }] }),
      project,
      2026,
      8,
      combine('2026-09-01', '08:00'),
    );
    expect(started.target).toBe(480);
    expect(started.worked).toBe(60);
  });
});
