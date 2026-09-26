import { useState } from 'react';
import { emptyState, useStore } from '../lib/store';
import { Modal } from './Modal';

/** „Alle Daten löschen“ mit eigener Sicherheitsabfrage (funktioniert auch ohne Browser-Dialoge). */
export function DeleteAllData({ onExportBackup }: { onExportBackup: () => void }) {
  const { state, replace } = useStore();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const count = state.sessions.length;
  const ok = confirmText.trim().toUpperCase() === 'LÖSCHEN';

  return (
    <>
      <button className="btn danger-text full" onClick={() => setOpen(true)}>
        Alle Daten löschen …
      </button>
      {open && (
        <Modal
          title="Alle Daten löschen?"
          onClose={() => {
            setOpen(false);
            setConfirmText('');
          }}
        >
          <p>
            Gelöscht werden alle Arbeitgeber, {count.toLocaleString('de-DE')} Buchungen, Abwesenheiten und Einstellungen in
            dieser App. Das lässt sich nicht rückgängig machen.
          </p>
          <p className="muted small">Tipp: Exportiere vorher eine Sicherung, dann kannst du alles wiederherstellen.</p>
          <button className="btn secondary full" onClick={onExportBackup}>
            Sicherung exportieren
          </button>
          <label className="wizard-field delete-confirm">
            <span>
              Zum Bestätigen <strong>LÖSCHEN</strong> eintippen
            </span>
            <input
              id="delete-confirm"
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="LÖSCHEN"
            />
          </label>
          <button
            className="btn danger full"
            disabled={!ok}
            onClick={() => {
              replace(emptyState());
              setOpen(false);
            }}
          >
            Endgültig löschen
          </button>
        </Modal>
      )}
    </>
  );
}
