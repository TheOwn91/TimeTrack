import { ABSENCE_ORDER, ABSENCE_TYPES } from '../lib/absences';
import { buildIndex, daySummary } from '../lib/calc';
import { useNow, useStore } from '../lib/store';
import { MINUTE, combine, fmtDate, fmtDuration, fmtTime, uid } from '../lib/time';
import type { AbsenceType, DateKey, Project, Session } from '../lib/types';
import { Modal } from './Modal';

interface Props {
  project: Project;
  date: DateKey;
  onClose: () => void;
}

/** Uhrzeit relativ zu einem Referenzzeitpunkt: liegt sie davor, ist der Folgetag gemeint. */
function toTs(date: DateKey, hm: string, ref?: number): number {
  let ts = combine(date, hm);
  if (ref !== undefined && ts < ref) ts += 24 * 60 * MINUTE;
  return ts;
}

export function DayEditor({ project, date, onClose }: Props) {
  const { state, update } = useStore();
  const now = useNow(true, 1000);
  const day = daySummary(project, date, buildIndex(state, project.id), now);

  const updateSession = (id: string, fn: (s: Session) => void) =>
    update((d) => {
      const s = d.sessions.find((x) => x.id === id);
      if (s) fn(s);
    });

  const setAbsence = (type: AbsenceType | null) =>
    update((d) => {
      d.absences = d.absences.filter((a) => !(a.projectId === project.id && a.date === date));
      if (type) d.absences.push({ id: uid(), projectId: project.id, date, type });
    });

  const addSession = () => {
    const last = day.sessions[day.sessions.length - 1];
    const startTs = last?.end ? last.end + 30 * MINUTE : combine(date, '08:00');
    const workMin = Math.round(project.dailyTargetHours * 60);
    const pauses =
      !last && workMin > 360 ? [{ start: combine(date, '12:00'), end: combine(date, '12:30') }] : [];
    const endTs = startTs + (workMin + (pauses.length ? 30 : 0)) * MINUTE;
    update((d) => {
      d.sessions.push({ id: uid(), projectId: project.id, start: startTs, end: endTs, pauses });
      d.absences = d.absences.filter(
        (a) => !(a.projectId === project.id && a.date === date && ABSENCE_TYPES[a.type].mode !== 'credit'),
      );
    });
  };

  const removeSession = (id: string) => {
    if (!confirm('Buchung wirklich löschen?')) return;
    update((d) => {
      d.sessions = d.sessions.filter((s) => s.id !== id);
    });
  };

  return (
    <Modal title={fmtDate(date)} onClose={onClose}>
      {day.holiday && <p className="info">🎉 Feiertag: {day.holiday}</p>}
      {!day.isWorkday && !day.holiday && <p className="info muted">Kein regulärer Arbeitstag</p>}

      <section className="editor-section">
        <h3>Arbeitszeiten</h3>
        {day.sessions.length === 0 && <p className="muted">Noch keine Zeiten erfasst.</p>}
        {day.sessions.map((s, i) => (
          <div key={s.id} className="session-edit">
            <div className="row">
              <span className="label">Buchung {i + 1}</span>
              <button className="link danger" onClick={() => removeSession(s.id)}>
                Löschen
              </button>
            </div>
            <div className="row times">
              <label>
                Beginn
                <input
                  type="time"
                  value={fmtTime(s.start)}
                  onChange={(e) =>
                    e.target.value &&
                    updateSession(s.id, (x) => {
                      const duration = (x.end ?? now) - x.start;
                      const start = combine(date, e.target.value);
                      const shift = start - x.start;
                      x.start = start;
                      if (x.end !== undefined && x.end <= start) x.end = start + duration;
                      x.pauses = x.pauses.map((p) => ({
                        start: p.start + shift,
                        end: p.end !== undefined ? p.end + shift : undefined,
                      }));
                    })
                  }
                />
              </label>
              <label>
                Ende
                {s.end === undefined ? (
                  <span className="running-badge">läuft</span>
                ) : (
                  <input
                    type="time"
                    value={fmtTime(s.end)}
                    onChange={(e) =>
                      e.target.value && updateSession(s.id, (x) => (x.end = toTs(date, e.target.value, x.start + 1)))
                    }
                  />
                )}
              </label>
            </div>
            {s.pauses.map((p, pi) => (
              <div key={pi} className="row times pause-row">
                <label>
                  Pause von
                  <input
                    type="time"
                    value={fmtTime(p.start)}
                    onChange={(e) =>
                      e.target.value &&
                      updateSession(s.id, (x) => (x.pauses[pi].start = toTs(date, e.target.value, x.start)))
                    }
                  />
                </label>
                <label>
                  bis
                  {p.end === undefined ? (
                    <span className="running-badge">läuft</span>
                  ) : (
                    <input
                      type="time"
                      value={fmtTime(p.end)}
                      onChange={(e) =>
                        e.target.value &&
                        updateSession(s.id, (x) => (x.pauses[pi].end = toTs(date, e.target.value, x.pauses[pi].start)))
                      }
                    />
                  )}
                </label>
                <button
                  className="icon-btn"
                  aria-label="Pause entfernen"
                  onClick={() => updateSession(s.id, (x) => x.pauses.splice(pi, 1))}
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="row">
              <button
                className="link"
                onClick={() =>
                  updateSession(s.id, (x) => {
                    const lastPause = x.pauses[x.pauses.length - 1];
                    const base = lastPause?.end ?? x.start + 4 * 60 * MINUTE;
                    const start = Math.min(base, (x.end ?? now) - 30 * MINUTE);
                    x.pauses.push({ start, end: start + 30 * MINUTE });
                  })
                }
              >
                + Pause hinzufügen
              </button>
            </div>
            <input
              className="note"
              placeholder="Notiz (optional)"
              value={s.note ?? ''}
              onChange={(e) => updateSession(s.id, (x) => (x.note = e.target.value || undefined))}
            />
          </div>
        ))}
        <button className="btn secondary full" onClick={addSession}>
          + Zeit nachtragen
        </button>
      </section>

      {day.sessions.length > 0 && (
        <section className="editor-section day-totals">
          <div>
            <span className="muted">Arbeitszeit</span>
            <strong>{fmtDuration(day.worked)} h</strong>
          </div>
          <div>
            <span className="muted">Pause</span>
            <strong>{fmtDuration(day.pause)} h</strong>
          </div>
          {day.autoBreak > 0 && (
            <p className="muted small">
              Enthält {Math.round(day.autoBreak)} min automatisch abgezogene gesetzliche Pause.
            </p>
          )}
          {project.surcharges
            .filter((r) => r.enabled && (day.surcharges[r.id] ?? 0) > 0)
            .map((r) => (
              <div key={r.id}>
                <span className="muted">
                  {r.name} ({r.percent} %)
                </span>
                <strong>{fmtDuration(day.surcharges[r.id])} h</strong>
              </div>
            ))}
        </section>
      )}

      <section className="editor-section">
        <h3>Abwesenheit / Schlüssel</h3>
        <div className="chips">
          {ABSENCE_ORDER.map((t) => (
            <button
              key={t}
              className={`chip ${day.absence?.type === t ? 'active' : ''}`}
              style={{ '--chip': ABSENCE_TYPES[t].color } as React.CSSProperties}
              onClick={() => setAbsence(day.absence?.type === t ? null : t)}
            >
              {ABSENCE_TYPES[t].label}
            </button>
          ))}
        </div>
        {day.absence && (
          <input
            className="note"
            placeholder="Bemerkung (optional)"
            value={day.absence.note ?? ''}
            onChange={(e) =>
              update((d) => {
                const a = d.absences.find((x) => x.id === day.absence!.id);
                if (a) a.note = e.target.value || undefined;
              })
            }
          />
        )}
      </section>
      <p className="muted small">
        Tipp: Endzeiten vor der Beginnzeit werden dem Folgetag zugeordnet (Nachtschicht). Tagessoll:{' '}
        {fmtDuration(project.dailyTargetHours * 60)} h
      </p>
    </Modal>
  );
}
