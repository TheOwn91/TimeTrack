import { useEffect, useState } from 'react';
import { APP_VERSION, IN_DEVELOPMENT, setUpdateNotesEnabled, updateNotesEnabled } from '../lib/changelog';
import {
  applyUpdate,
  autoUpdateEnabled,
  checkForUpdates,
  getUpdateStatus,
  onUpdateStatus,
  setAutoUpdateEnabled,
  updateSupported,
  type UpdateStatus,
} from '../lib/update';

function statusText(s: UpdateStatus): string | null {
  switch (s.state) {
    case 'checking':
      return 'Suche nach Updates …';
    case 'current':
      return '✔ Du hast die neueste Version.';
    case 'available':
      return s.release ? `Version ${s.release.version} ist verfügbar.` : 'Ein Update ist verfügbar.';
    case 'installing':
      return 'Update wird installiert – die App startet gleich neu …';
    case 'offline':
      return 'Keine Verbindung – bitte später erneut prüfen.';
    case 'unsupported':
      return 'Updates gibt es nur in der installierten App.';
    default:
      return null;
  }
}

/** App-Version, Updates (automatisch / manuell) und „Was ist neu?“. */
export function VersionCard({ onShowWhatsNew }: { onShowWhatsNew: () => void }) {
  const [notes, setNotes] = useState(updateNotesEnabled);
  const [auto, setAuto] = useState(autoUpdateEnabled);
  const [status, setStatus] = useState(getUpdateStatus);
  useEffect(() => onUpdateStatus(setStatus), []);
  const supported = updateSupported();
  const text = supported ? statusText(status) : 'In der Demo gibt es keine Updates – nur in der installierten App.';
  const busy = status.state === 'checking' || status.state === 'installing';

  return (
    <section className="card">
      <h2>App-Version &amp; Updates</h2>
      <p className="muted small">
        TimeTrack {APP_VERSION}
        {IN_DEVELOPMENT && ' · in Entwicklung'}
      </p>

      <label className="checkbox toggle-row">
        <input
          id="auto-update"
          type="checkbox"
          checked={auto}
          disabled={!supported}
          onChange={(e) => {
            setAutoUpdateEnabled(e.target.checked);
            setAuto(e.target.checked);
          }}
        />
        Updates automatisch installieren
      </label>
      <p className="muted small">
        {auto
          ? 'Neue Versionen werden im Hintergrund geladen und beim nächsten Öffnen installiert.'
          : 'Neue Versionen werden erst installiert, wenn du auf „Jetzt aktualisieren“ tippst.'}
      </p>

      <div className="update-actions">
        <button className="btn secondary" disabled={!supported || busy} onClick={() => void checkForUpdates()}>
          Auf Updates prüfen
        </button>
        {status.state === 'available' && (
          <button className="btn primary" onClick={() => void applyUpdate()}>
            Jetzt aktualisieren
          </button>
        )}
      </div>
      {text && (
        <p className={`small update-status ${status.state === 'available' ? 'highlight' : 'muted'}`} role="status">
          {text}
        </p>
      )}
      {status.state === 'available' && status.release && (
        <ul className="small update-preview">
          {status.release.changes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}

      <label className="checkbox toggle-row">
        <input
          id="update-notes"
          type="checkbox"
          checked={notes}
          onChange={(e) => {
            setUpdateNotesEnabled(e.target.checked);
            setNotes(e.target.checked);
          }}
        />
        Nach Updates anzeigen, was neu ist
      </label>
      <button className="btn secondary full" onClick={onShowWhatsNew}>
        Was ist neu?
      </button>
    </section>
  );
}
