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
    expect(d.interruption).toBe(0);
    expect(d.autoBreak).toBe(0);
    expect(d.worked).toBe(495);
  });

  it('lange Lücke zwischen zwei Buchungen ist eine Unterbrechung, keine Pause', () => {
    // Nachtschicht 21:30–06:30 mit 30 min Pause, dann 15:00–18:00 (wie im geteilten Dienst)
    const st = state({
      sessions: [
        {
          id: 'n',
          projectId: 'p',
          start: combine('2026-09-01', '21:30'),
          end: combine('2026-09-02', '06:30'),
          pauses: [{ start: combine('2026-09-02', '01:30'), end: combine('2026-09-02', '02:00') }],
        },
        { id: 't', projectId: 'p', start: combine('2026-09-02', '15:00'), end: combine('2026-09-02', '18:00'), pauses: [] },
      ],
    });
    const p = { ...project, autoBreak: false };
    const idx = buildIndex(st, 'p');
    // ohne Zuordnung zum Folgetag stehen beide Buchungen an verschiedenen Tagen – hier gezielt ein Tag
    idx.sessionsByDay.set('2026-09-02', st.sessions);
    const d = daySummary(p, '2026-09-02', idx, combine('2026-09-03', '10:00'));
    expect(d.worked).toBe(690); // 8:30 + 3:00
    expect(d.pause).toBe(30);
    expect(d.interruption).toBe(510); // 06:30–15:00
  });

  it('gesetzliche Mindestpause: lange Unterbrechung zählt als Ruhepause', () => {
    const st = state({
      sessions: [
        { id: 'a', projectId: 'p', start: combine('2026-09-01', '05:00'), end: combine('2026-09-01', '11:00'), pauses: [] },
        { id: 'b', projectId: 'p', start: combine('2026-09-01', '15:00'), end: combine('2026-09-01', '19:00'), pauses: [] },
      ],
    });
    const d = daySummary(project, '2026-09-01', buildIndex(st, 'p'), combine('2026-09-02', '10:00'));
    // 10 h Arbeit, 4 h Unterbrechung → keine zusätzliche Pause abziehen
    expect(d.autoBreak).toBe(0);
    expect(d.pause).toBe(0);
    expect(d.interruption).toBe(240);
    expect(d.worked).toBe(600);
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

describe('Zusammentreffen mehrerer Zulagen', () => {
  const rules: SurchargeRule[] = [
    { id: 'night', name: 'Nacht', kind: 'time', from: '20:00', to: '06:00', percent: 25, enabled: true },
    { id: 'sun', name: 'Sonntag', kind: 'weekday', weekdays: [0], percent: 50, enabled: true },
    { id: 'hol', name: 'Feiertag', kind: 'holiday', percent: 50, enabled: true },
  ];
  // So 27.09.2026 20:00 bis Mo 06:00
  const iv: [number, number][] = [[combine('2026-09-27', '20:00'), combine('2026-09-28', '06:00')]];

  it('Standard: nur die höchste Zulage zählt', () => {
    const m = surchargeMinutes(iv, rules, 'NW');
    expect(m.sun).toBe(240); // So 20–24 Uhr: Sonntag 50 % statt Nacht 25 %
    expect(m.night).toBe(360); // Mo 0–6 Uhr: nur Nacht
    expect(m.hol).toBe(0);
  });

  it('auf Wunsch werden alle Zulagen addiert', () => {
    const m = surchargeMinutes(iv, rules, 'NW', 'stack');
    expect(m.sun).toBe(240);
    expect(m.night).toBe(600);
  });

  it('bei gleichem Satz zählt die erste Regel', () => {
    // So 04.10.2026 ist kein Feiertag; Sa 03.10.2026 schon – dort nur Feiertag (50 %) statt Nacht
    const m = surchargeMinutes([[combine('2026-10-03', '21:00'), combine('2026-10-03', '23:00')]], rules, 'NW');
    expect(m).toEqual({ night: 0, sun: 0, hol: 120 });
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
    // Urlaub (2.9.) schreibt das Tagessoll gut
    expect(sum.credit).toBe(480);
    // Kurzarbeit (3.9.) nimmt nur die 1:15 Plusstunden vom 1.9., der Rest des Solls entfällt
    expect(sum.shortTime).toEqual({ fromAccount: 75, uncovered: 405 });
    // Soll: 1., 2., 4.9. voll + 1:15 am 3.9.; Überstundenausgleich (4.9.) geht vom Konto ab (auch ins Minus)
    expect(sum.target).toBe(3 * 480 + 75);
    expect(sum.balance).toBe(555 + 480 - 1515);
    expect(sum.absenceCounts).toEqual({ urlaub: 1, kurzarbeit: 1, ueberstunden: 1 });
  });

  describe('Kurzarbeit wie Überstundenausgleich, aber nie ins Minus', () => {
    const later = combine('2026-10-20', '12:00');
    const ka = (...dates: string[]) => dates.map((date, i) => ({ id: `k${i}`, projectId: 'p', date, type: 'kurzarbeit' as const }));

    it('nimmt das Soll vom Stundenkonto, solange Plusstunden da sind', () => {
      const p = { ...project, overtimeAtStartHours: 20 };
      const sum = monthSummary(state({ projects: [p], absences: ka('2026-09-01', '2026-09-02') }), p, 2026, 8, combine('2026-09-02', '20:00'));
      expect(sum.shortTime).toEqual({ fromAccount: 960, uncovered: 0 });
      expect(sum.balance).toBe(-960);
    });

    it('ohne Plusstunden entstehen keine Minusstunden', () => {
      const sum = monthSummary(state({ absences: ka('2026-09-01', '2026-09-02') }), project, 2026, 8, combine('2026-09-02', '20:00'));
      expect(sum.shortTime).toEqual({ fromAccount: 0, uncovered: 960 });
      expect(sum.target).toBe(0);
      expect(sum.balance).toBe(0);
    });

    it('teilweise gedeckt: nur bis das Konto leer ist', () => {
      const p = { ...project, overtimeAtStartHours: 10 };
      const sum = monthSummary(state({ projects: [p], absences: ka('2026-09-01', '2026-09-02') }), p, 2026, 8, combine('2026-09-02', '20:00'));
      expect(sum.shortTime).toEqual({ fromAccount: 600, uncovered: 360 });
      expect(sum.balance).toBe(-600);
    });

    it('nutzt Überstunden aus dem Vormonat', () => {
      const st = state({
        // 1.9.: 10 h − 45 min Pause = 9:15 → +1:15
        sessions: [{ id: 'a', projectId: 'p', start: combine('2026-09-01', '08:00'), end: combine('2026-09-01', '18:00'), pauses: [] }],
        absences: [
          ...ka('2026-10-01'),
          // restliche Septembertage frei, damit kein Minus entsteht
          ...Array.from({ length: 29 }, (_, i) => ({ id: `f${i}`, projectId: 'p', date: `2026-09-${String(i + 2).padStart(2, '0')}`, type: 'frei' as const })),
        ],
      });
      const oct = monthSummary(st, project, 2026, 9, later);
      expect(oct.shortTime.fromAccount).toBe(75);
      expect(oct.days[0].target).toBe(75);
    });

    it('bei Teilarbeit wird nur die fehlende Zeit gerechnet', () => {
      const p = { ...project, autoBreak: false, overtimeAtStartHours: 1 };
      const st = state({
        projects: [p],
        sessions: [{ id: 'a', projectId: 'p', start: combine('2026-09-01', '08:00'), end: combine('2026-09-01', '12:00'), pauses: [] }],
        absences: ka('2026-09-01'),
      });
      const sum = monthSummary(st, p, 2026, 8, combine('2026-09-01', '20:00'));
      // 4 h gearbeitet, 4 h fehlen: 1 h vom Konto, 3 h ohne Soll
      expect(sum.shortTime).toEqual({ fromAccount: 60, uncovered: 180 });
      expect(sum.balance).toBe(-60);
    });
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
