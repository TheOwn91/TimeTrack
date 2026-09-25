import { useState } from 'react';
import { ABSENCE_TYPES } from '../lib/absences';
import { buildIndex, daySummary, monthSummary, sessionStats, untrackedDays } from '../lib/calc';
import { newProject, useNow, useStore } from '../lib/store';
import { MONTHS, dateKey, fmtClock, fmtDate, fmtDuration, fmtMoney, fmtTime, uid } from '../lib/time';
import type { AbsenceType, DateKey } from '../lib/types';
import { DayEditor } from './DayEditor';
import { ProjectPicker } from './ProjectPicker';

const QUICK_ABSENCES: AbsenceType[] = ['urlaub', 'krank', 'ueberstunden', 'kurzarbeit', 'frei'];

export function Home({ onOpenProjects }: { onOpenProjects: () => void }) {
  const { state, update } = useStore();
  const active = state.sessions.find((s) => s.end === undefined);
  const now = useNow(true, active ? 1000 : 30_000);
  const [editDate, setEditDate] = useState<DateKey | null>(null);
  const [newName, setNewName] = useState('');

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
          <p>Lege zuerst einen Arbeitgeber oder ein Projekt an.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              const p = newProject(newName.trim(), state.projects.length);
              update((d) => {
                d.projects.push(p);
                d.selectedProjectId = p.id;
              });
            }}
          >
            <input
              autoFocus
              placeholder="z. B. Firma Muster GmbH"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="btn primary full" type="submit">
              Anlegen
            </button>
          </form>
          <p className="muted small">Stundenlohn, Sollzeit und Zulagen kannst du danach unter „Arbeitgeber“ einstellen.</p>
        </div>
      </div>
    );
  }

  const openPause = active?.pauses.find((p) => p.end === undefined);
  const stats = active ? sessionStats(active, now) : undefined;
  const today = daySummary(project, dateKey(now), buildIndex(state, project.id), now);
  const d = new Date(now);
  const month = monthSummary(state, project, d.getFullYear(), d.getMonth(), now);
  const missing = untrackedDays(state, project, now);

  const start = () =>
    update((s) => {
      s.sessions.push({ id: uid(), projectId: project.id, start: Date.now(), pauses: [] });
    });
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
      <section className="card">
        <div className="row">
          <ProjectPicker
            projects={projects}
            value={project.id}
            disabled={!!active}
            onChange={(id) => update((s) => void (s.selectedProjectId = id))}
          />
          <button className="icon-btn" onClick={onOpenProjects} aria-label="Arbeitgeber verwalten" title="Arbeitgeber verwalten">
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
            <strong>{fmtDuration(month.worked + month.credit)} h</strong>
          </div>
          <div className="stat">
            <span className="muted">Soll bis heute</span>
            <strong>{fmtDuration(month.target)} h</strong>
          </div>
          <div className={`stat ${month.balance < 0 ? 'neg' : 'pos'}`}>
            <span className="muted">Saldo</span>
            <strong>{fmtDuration(month.balance, true)} h</strong>
          </div>
        </div>
        {month.credit > 0 && (
          <p className="muted small">Davon {fmtDuration(month.credit)} h Gutschrift (Urlaub, Krank …)</p>
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
                <span>{fmtDuration(s.minutes)} h</span>
                {project.hourlyRate > 0 && <strong>{fmtMoney(s.amount)}</strong>}
              </li>
            ))}
            {project.hourlyRate > 0 && (
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
