import type { AbsenceType } from './types';

/**
 * credit   – Tag zählt mit Sollstunden als gearbeitet (Urlaub, Krank, Kurzarbeit, Feiertag)
 * noTarget – Tag hat kein Soll (frei)
 * debit    – Soll bleibt bestehen, wird aus dem Überstundenkonto genommen
 */
export type AbsenceMode = 'credit' | 'noTarget' | 'debit';

export const ABSENCE_TYPES: Record<
  AbsenceType,
  { label: string; short: string; color: string; mode: AbsenceMode }
> = {
  urlaub: { label: 'Urlaub', short: 'U', color: 'var(--c-urlaub)', mode: 'credit' },
  krank: { label: 'Krank', short: 'K', color: 'var(--c-krank)', mode: 'credit' },
  ueberstunden: { label: 'Überstundenausgleich', short: 'ÜA', color: 'var(--c-ueberstunden)', mode: 'debit' },
  kurzarbeit: { label: 'Kurzarbeit', short: 'KA', color: 'var(--c-kurzarbeit)', mode: 'credit' },
  feiertag: { label: 'Feiertag', short: 'F', color: 'var(--c-feiertag)', mode: 'credit' },
  frei: { label: 'Frei / kein Arbeitstag', short: 'X', color: 'var(--c-frei)', mode: 'noTarget' },
  sonstiges: { label: 'Sonstiges (bezahlt)', short: 'S', color: 'var(--c-sonstiges)', mode: 'credit' },
};

export const ABSENCE_ORDER: AbsenceType[] = [
  'urlaub',
  'krank',
  'ueberstunden',
  'kurzarbeit',
  'feiertag',
  'frei',
  'sonstiges',
];
