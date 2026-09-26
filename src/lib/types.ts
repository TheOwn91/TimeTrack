/** Datum im Format YYYY-MM-DD (lokale Zeit). */
export type DateKey = string;

/** 0 = Sonntag … 6 = Samstag (wie Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type SurchargeKind = 'time' | 'weekday' | 'holiday';

export interface SurchargeRule {
  id: string;
  name: string;
  kind: SurchargeKind;
  /** Nur für kind = 'time': Beginn/Ende als HH:MM. Ende < Beginn = über Mitternacht. */
  from?: string;
  to?: string;
  /** Für 'time' (optional, leer = alle Tage) und 'weekday' (Pflicht). */
  weekdays?: Weekday[];
  /** Zuschlag in Prozent des Stundenlohns. */
  percent: number;
  enabled: boolean;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  /** Stundenlohn in €, 0 = keine Geldbeträge anzeigen. */
  hourlyRate: number;
  /** Sollstunden pro Arbeitstag. */
  dailyTargetHours: number;
  workdays: Weekday[];
  /** Gesetzliche Mindestpause (ArbZG §4) automatisch abziehen. */
  autoBreak: boolean;
  /** Bundesland-Kürzel für Feiertage, '' = keine Feiertage. */
  state: string;
  surcharges: SurchargeRule[];
  /** Ab diesem Tag werden fehlende Einträge angezeigt. */
  startDate: DateKey;
  /** Urlaubsanspruch pro Kalenderjahr in Tagen (Standard 30). */
  vacationDaysPerYear?: number;
  /** Verfügbarer Resturlaub im Jahr des Erfassungsbeginns (Standard: voller Jahresanspruch). */
  vacationAtStart?: number;
  /** Stand des Überstundenkontos zum Erfassungsbeginn in Stunden (auch negativ). */
  overtimeAtStartHours?: number;
  /** Zuschlag in % auf positive Monatsüberstunden, gutgeschrieben am Monatsende. */
  overtimeSurchargePercent?: number;
  archived?: boolean;
}

export interface Pause {
  start: number;
  end?: number;
}

export interface Session {
  id: string;
  projectId: string;
  start: number;
  end?: number;
  pauses: Pause[];
  note?: string;
}

export type AbsenceType =
  | 'urlaub'
  | 'krank'
  | 'ueberstunden'
  | 'kurzarbeit'
  | 'feiertag'
  | 'frei'
  | 'sonstiges';

export interface Absence {
  id: string;
  projectId: string;
  date: DateKey;
  type: AbsenceType;
  note?: string;
}

export interface AppState {
  version: 1;
  projects: Project[];
  sessions: Session[];
  absences: Absence[];
  selectedProjectId?: string;
}
