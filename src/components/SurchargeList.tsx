import type { MonthSummary } from '../lib/calc';
import { useHours } from '../lib/store';
import { fmtMoney } from '../lib/time';

/** Zulagen eines Monats mit Stunden, Betrag und Summe (Startseite und Monatsansicht). */
export function SurchargeList({ month, hideEmpty = false }: { month: MonthSummary; hideEmpty?: boolean }) {
  const hours = useHours();
  const rows = hideEmpty ? month.surcharges.filter((s) => s.minutes > 0) : month.surcharges;
  if (!rows.length) return null;
  const totalMinutes = rows.reduce((n, s) => n + s.minutes, 0);
  return (
    <ul className="surcharge-list">
      {rows.map((s) => (
        <li key={s.rule.id}>
          <span>
            {s.rule.name} <span className="muted">({s.rule.percent} %)</span>
          </span>
          <span>{hours(s.minutes)} h</span>
          {month.hasRate && <strong>{fmtMoney(s.amount)}</strong>}
        </li>
      ))}
      {rows.length > 1 || month.hasRate ? (
        <li className="total">
          <span>Summe Zulagen</span>
          <span>{hours(totalMinutes)} h</span>
          {month.hasRate && <strong>{fmtMoney(month.surchargeTotal)}</strong>}
        </li>
      ) : null}
    </ul>
  );
}
