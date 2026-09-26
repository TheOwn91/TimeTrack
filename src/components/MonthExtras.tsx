import type { MonthSummary } from '../lib/calc';
import { fmtDuration } from '../lib/time';
import type { Project } from '../lib/types';
import { overtimeSurcharge } from '../lib/year';

const fmtDays = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 });

interface Props {
  project: Project;
  month: MonthSummary;
  year: number;
  /** Resturlaub des Jahres (inkl. Übertrag, abzüglich genommen und geplant). */
  vacationRemaining: number;
  /** Monat ist abgeschlossen → Zuschlag gutgeschrieben. */
  complete: boolean;
}

/** Urlaubstage des Monats und Überstunden-Zuschlag unter den Monatsstunden. */
export function MonthExtras({ project, month, year, vacationRemaining, complete }: Props) {
  const vacation = month.absenceCounts.urlaub ?? 0;
  const pct = project.overtimeSurchargePercent ?? 0;
  const surcharge = overtimeSurcharge(project, month.balance);
  return (
    <div className="month-extra">
      <div>
        <span>Urlaub in diesem Monat</span>
        <strong>{vacation === 1 ? '1 Tag' : `${fmtDays(vacation)} Tage`}</strong>
      </div>
      <div className="muted small">
        <span>Resturlaub {year}</span>
        <span>{fmtDays(vacationRemaining)} Tage</span>
      </div>
      {pct > 0 && (
        <div className="muted small">
          <span>
            Überstundenzuschlag ({pct} %){complete ? '' : ' – am Monatsende'}
          </span>
          <span>{surcharge > 0 ? `${fmtDuration(surcharge, true)} h` : '–'}</span>
        </div>
      )}
    </div>
  );
}
