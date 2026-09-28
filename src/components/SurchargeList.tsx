import type { MonthSummary } from '../lib/calc';
import { useHours } from '../lib/store';
import { fmtMoney } from '../lib/time';

/** Zulagen eines Monats mit Stunden und Betrag, dazu die Summe in € (Startseite und Monatsansicht). */
export function SurchargeList({ month, hideEmpty = false }: { month: MonthSummary; hideEmpty?: boolean }) {
  const hours = useHours();
  const rows = hideEmpty ? month.surcharges.filter((s) => s.minutes > 0) : month.surcharges;
  if (!rows.length) return null;
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
      {month.hasRate && (
        <li className="total">
          <span>Summe Zulagen</span>
          <span />
          <strong>{fmtMoney(month.surchargeTotal)}</strong>
        </li>
      )}
    </ul>
  );
}
