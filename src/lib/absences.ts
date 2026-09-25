import type { AbsenceType } from './types';

/**
 * credit   – Tag zählt mit Sollstunden als gearbeitet (Urlaub, Krank, Feiertag)
 * noTarget – Tag hat kein Soll (Kurzarbeit, frei)
 * debit    – Soll bleibt bestehen, wird aus dem Überstundenkonto genommen
 */
export type AbsenceMode = 'credit' | 'noTarget' | 'debit';

export const ABSENCE_TYPES: Record<
  AbsenceType,
  { label: string; short: string; color: string; mode: AbsenceMode }
> = {
  urlaub: { label: 'Urlaub', short: 'U', color: '#16a34a', mode: 'credit' },
  krank: { label: 'Krank', short: 'K', color: '#dc2626', mode: 'credit' },
  ueberstunden: { label: 'Überstundenausgleich', short: 'ÜA', color: '#9333ea', mode: 'debit' },
  kurzarbeit: { label: 'Kurzarbeit', short: 'KA', color: '#ea580c', mode: 'noTarget' },
  feiertag: { label: 'Feiertag', short: 'F', color: '#0891b2', mode: 'credit' },
  frei: { label: 'Frei / kein Arbeitstag', short: 'X', color: '#64748b', mode: 'noTarget' },
  sonstiges: { label: 'Sonstiges (bezahlt)', short: 'S', color: '#ca8a04', mode: 'credit' },
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
