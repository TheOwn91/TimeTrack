import { useState } from 'react';
import { APP_VERSION, setUpdateNotesEnabled, updateNotesEnabled } from '../lib/changelog';

/** App-Version, Änderungen nachlesen und Meldung nach Updates ein-/ausschalten. */
export function VersionCard({ onShowWhatsNew }: { onShowWhatsNew: () => void }) {
  const [enabled, setEnabled] = useState(updateNotesEnabled);
  return (
    <section className="card">
      <h2>App-Version</h2>
      <p className="muted small">TimeTrack {APP_VERSION}</p>
      <label className="checkbox toggle-row">
        <input
          id="update-notes"
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setUpdateNotesEnabled(e.target.checked);
            setEnabled(e.target.checked);
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
