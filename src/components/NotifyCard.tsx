import { useState } from 'react';
import {
  notifyEnabled,
  notifySupport,
  requestNotifyPermission,
  setNotifyEnabled,
  showTestNotification,
  syncRunningStatus,
} from '../lib/status';
import { useStore } from '../lib/store';

const HINTS = {
  ok: 'Erlaubt. Solange die Zeit läuft, siehst du das Symbol in der Statusleiste.',
  ask: 'Beim ersten Start fragt das Handy, ob Timelytix Benachrichtigungen zeigen darf.',
  denied:
    'Benachrichtigungen sind blockiert. Erlaube sie in den Handy-Einstellungen unter Apps → Timelytix (bzw. im Browser unter Website-Einstellungen).',
  install: 'Auf dem iPhone gibt es Benachrichtigungen erst, wenn Timelytix auf dem Home-Bildschirm installiert ist (ab iOS 16.4).',
  unsupported: 'Hier nicht verfügbar – in der installierten App auf dem Handy funktioniert es.',
} as const;

/** Einstellung: Benachrichtigung in der Statusleiste, solange die Zeit läuft. */
export function NotifyCard() {
  const { state } = useStore();
  const [enabled, setEnabled] = useState(notifyEnabled);
  const [support, setSupport] = useState(notifySupport);

  const toggle = async (on: boolean) => {
    setNotifyEnabled(on);
    setEnabled(on);
    if (on) await requestNotifyPermission();
    setSupport(notifySupport());
    await syncRunningStatus(state, true);
  };

  return (
    <section className="card">
      <h2>Statusleiste</h2>
      <label className="checkbox toggle-row">
        <input
          id="notify-running"
          type="checkbox"
          checked={enabled}
          disabled={support === 'unsupported' || support === 'install'}
          onChange={(e) => void toggle(e.target.checked)}
        />
        Benachrichtigung anzeigen, solange die Zeit läuft
      </label>
      <p className="muted small">{HINTS[support]}</p>
      {enabled && support === 'ask' && (
        <button className="btn secondary full" onClick={() => void requestNotifyPermission().then(() => setSupport(notifySupport()))}>
          Benachrichtigungen erlauben
        </button>
      )}
      {enabled && support === 'ok' && (
        <button className="btn secondary full" onClick={() => void showTestNotification()}>
          Probe-Benachrichtigung senden
        </button>
      )}
    </section>
  );
}
