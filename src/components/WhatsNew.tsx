import { useState } from 'react';
import { markVersionSeen, setUpdateNotesEnabled, type Release } from '../lib/changelog';
import { Modal } from './Modal';

interface Props {
  releases: Release[];
  onClose: () => void;
  /** Nach einem Update geöffnet (mit Option zum Abschalten) – sonst nur zum Nachlesen. */
  afterUpdate: boolean;
}

/** „Was ist neu?“ – erscheint nach einem Update beim ersten Start der neuen Version. */
export function WhatsNew({ releases, onClose, afterUpdate }: Props) {
  const [dontShow, setDontShow] = useState(false);
  const close = () => {
    markVersionSeen();
    if (afterUpdate && dontShow) setUpdateNotesEnabled(false);
    onClose();
  };
  const title = afterUpdate ? `Neu in Version ${releases[0]?.version}` : 'Was ist neu?';

  return (
    <Modal title={title} onClose={close}>
      <div className="release-list">
        {releases.map((r) => (
          <section key={r.version}>
            <h3>
              Version {r.version} <span className="muted small">· {r.date}</span>
            </h3>
            <ul>
              {r.changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {afterUpdate && (
        <label className="checkbox toggle-row">
          <input id="whatsnew-off" type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
          Diese Meldung nach Updates nicht mehr anzeigen
        </label>
      )}
      <button className="btn primary full" onClick={close}>
        Alles klar
      </button>
    </Modal>
  );
}
