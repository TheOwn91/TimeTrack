import { useState } from 'react';
import { ABSENCE_TYPES } from '../lib/absences';
import { DEMO } from '../lib/demo';
import { sessionDay } from '../lib/shift';
import { isStandalone } from '../lib/device';
import { notifyEnabled, requestNotifyPermission } from '../lib/status';
import { buildIndex, daySummary, monthSummary, sessionStats, untrackedDays } from '../lib/calc';
import { useHours, useNow, useStore } from '../lib/store';
import { MONTHS, dateKey, fmtClock, fmtDate, fmtDuration, fmtMoney, fmtTime, uid } from '../lib/time';
import type { AbsenceType, DateKey } from '../lib/types';
import { yearOverview } from '../lib/year';
import { DayEditor } from './DayEditor';
import { MonthExtras } from './MonthExtras';
import { ProjectPicker } from './ProjectPicker';

const INSTALL_HINT_KEY = 'timetrack.installHintDismissed';

const QUICK_ABSENCES: AbsenceType[] = ['urlaub', 'krank', 'ueberstunden', 'kurzarbeit', 'frei'];

export function Home({ onOpenProjects, onStartSetup }: { onOpenProjects: () => void; onStartSetup: () => void }) {
  const { state, update } = useStore();
  const hours = useHours();
  const active = state.sessions.find((s) => s.end === undefined);
  const now = useNow(true, active ? 1000 : 30_000);
  const [editDate, setEditDate] = useState<DateKey | null>(null);
  const [hideInstall, setHideInstall] = useState(() => {
    try {
      return DEMO || isStandalone() || localStorage.getItem(INSTALL_HINT_KEY) === '1';
    } catch {
      return true;
    }
  });
  const dismissInstall = () => {
    setHideInstall(true);
    try {
      localStorage.setItem(INSTALL_HINT_KEY, '1');
    } catch {
      /* ignorieren */
    }
  };

  const projects = state.projects.filter((p) => !p.archived);
  const project =
    state.projects.find((p) => p.id === active?.projectId) ??
    projects.find((p) => p.id === state.selectedProjectId) ??
    projects[0];

  if (!project) {
    return (
      <div className="page">
        <div className="card onboarding">
          <h2>Willkommen bei TimeTrack 👋</h2>
          <p>Lege zuerst deinen Arbeitgeber an – der Assistent führt dich in wenigen Schritten durch.</p>
          <button className="btn primary full" onClick={onStartSetup}>
            Einrichtung starten
          </button>
        </div>
      </div>
    );
  }

  const openPause = active?.pauses.find((p) => p.end === undefined);
  const stats = active ? sessionStats(active, now) : undefined;
  // Tag, zu dem die laufende Schicht zählt (bei „Schicht dem Folgetag zuordnen“ ggf. morgen)
  const today = daySummary(project, active ? sessionDay(project, active) : dateKey(now), buildIndex(state, project.id), now);
  const d = new Date(now);
  const month = monthSummary(state, project, d.getFullYear(), d.getMonth(), now);
  const missing = untrackedDays(state, project, now);

  const start = () => {
    update((s) => {
      s.sessions.push({ id: uid(), projectId: project.id, start: Date.now(), pauses: [] });
    });
    // Beim ersten Start fragen, ob die App eine „Zeit läuft“-Benachrichtigung zeigen darf
    if (notifyEnabled()) void requestNotifyPermission();
  };
  const togglePause = () =>
    update((s) => {
      const sess = s.sessions.find((x) => x.id === active!.id)!;
      const open = sess.pauses.find((p) => p.end === undefined);
      if (open) open.end = Date.now();
      else sess.pauses.push({ start: Date.now() });
    });
  const stop = () =>
    update((s) => {
      const sess = s.sessions.find((x) => x.id === active!.id)!;
      const t = Date.now();
      for (const p of sess.pauses) if (p.end === undefined) p.end = t;
      sess.end = t;
    });
  const setAbsence = (date: DateKey, type: AbsenceType) =>
    update((s) => {
      s.absences.push({ id: uid(), projectId: project.id, date, type });
    });

  return (
    <div className="page">
      {!hideInstall && (
        <div className="install-hint">
          <button className="grow" onClick={onOpenProjects}>
            📲 TimeTrack als App auf dem Homescreen installieren – funktioniert dann offline
          </button>
          <button className="icon-btn" onClick={dismissInstall} aria-label="Hinweis ausblenden">
            ✕
          </button>
        </div>
      )}
      <section className="card">
        <div className="row">
          <ProjectPicker
            projects={projects}
            value={project.id}
            disabled={!!active}
            onChange={(id) => update((s) => void (s.selectedProjectId = id))}
          />
          <button className="icon-btn" onClick={onOpenProjects} aria-label="Einstellungen" title="Einstellungen">
            ⚙
          </button>
        </div>
        {active && <p className="muted small center">Während die Zeit läuft, kann die Arbeit nicht gewechselt werden.</p>}
      </section>

      <section className={`card timer ${active ? (openPause ? 'paused' : 'running') : ''}`}>
        {active && stats ? (
          <>
            <div className="timer-status">
              {openPause ? `⏸ Pause seit ${fmtTime(openPause.start)}` : `● Läuft seit ${fmtTime(active.start)}`}
            </div>
            <div className="clock">{fmtClock(stats.net * 60_000)}</div>
            <div className="muted center">
              Pause: {fmtClock(stats.pause * 60_000)} · heute gesamt: {fmtDuration(today.worked)} h
            </div>
            <div className="timer-actions">
              <button className={`btn big ${openPause ? 'primary' : 'warning'}`} onClick={togglePause}>
                {openPause ? '▶ Weiter' : '⏸ Pause'}
              </button>
              <button className="btn big danger" onClick={stop}>
                ■ Beenden
              </button>
            </div>
          </>
        ) : (
          <>
            {today.worked > 0 && (
              <div className="muted center">Heute bereits erfasst: {fmtDuration(today.worked)} h</div>
            )}
            <button className="btn big primary start" onClick={start}>
              ▶ Zeit starten
            </button>
          </>
        )}
      </section>

      <section className="card">
        <h2>
          {MONTHS[d.getMonth()]} {d.getFullYear()}
        </h2>
        <div className="stats">
          <div className="stat">
            <span className="muted">Ist</span>
            <strong>{hours(month.worked + month.credit)} h</strong>
          </div>
          <div className="stat">
            <span className="muted">Soll bis heute</span>
            <strong>{hours(month.target)} h</strong>
          </div>
          <div className={`stat ${month.balance < 0 ? 'neg' : 'pos'}`}>
            <span className="muted">Saldo</span>
            <strong>{hours(month.balance, true)} h</strong>
          </div>
        </div>
        <MonthExtras
          month={month}
          year={d.getFullYear()}
          vacationRemaining={yearOverview(state, project, d.getFullYear(), now).vacation.remaining}
          complete={false}
        />
        {month.credit > 0 && (
          <p className="muted small">Davon {hours(month.credit)} h Gutschrift (Urlaub, Krank …)</p>
        )}
        <h3>Zulagen</h3>
        {month.surcharges.length === 0 ? (
          <p className="muted small">Keine Zulagen konfiguriert.</p>
        ) : (
          <ul className="surcharge-list">
            {month.surcharges.map((s) => (
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
        )}
      </section>

      <section className="card">
        <h2>
          Ohne Zeiterfassung <span className="badge">{missing.length}</span>
        </h2>
        {missing.length === 0 ? (
          <p className="muted">✔ Alle vergangenen Arbeitstage sind erfasst.</p>
        ) : (
          <ul className="missing-list">
            {missing.map((m) => (
              <li key={m.date}>
                <button className="missing-date" onClick={() => setEditDate(m.date)}>
                  {fmtDate(m.date)}
                  <span className="muted small">Zeit nachtragen ›</span>
                </button>
                <div className="chips">
                  {QUICK_ABSENCES.map((t) => (
                    <button
                      key={t}
                      className="chip small"
                      style={{ '--chip': ABSENCE_TYPES[t].color } as React.CSSProperties}
                      onClick={() => setAbsence(m.date, t)}
                      title={ABSENCE_TYPES[t].label}
                    >
                      {t === 'frei' ? 'Frei' : ABSENCE_TYPES[t].label.replace('Überstundenausgleich', 'Ü-Ausgleich')}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editDate && <DayEditor project={project} date={editDate} onClose={() => setEditDate(null)} />}
    </div>
  );
}
