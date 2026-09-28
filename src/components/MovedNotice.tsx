import { shareOrDownload } from '../lib/device';
import { NEW_APP_URL, isOldAddress } from '../lib/moved';
import { useStore } from '../lib/store';
import { dateKey } from '../lib/time';

/** Hinweis in der installierten App unter der alten Adresse: Timelytix ist umgezogen. */
export function MovedNotice() {
  const { state } = useStore();
  if (!isOldAddress()) return null;
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    void shareOrDownload(blob, `timelytix-backup-${dateKey(new Date())}.json`);
  };
  return (
    <section className="moved-notice" role="status">
      <h2>📦 Timelytix hat eine neue Adresse</h2>
      <p>
        Diese App bekommt keine Updates mehr. Öffne die neue Adresse und füge Timelytix dort zum Home-Bildschirm hinzu.
        Danach kannst du diese App löschen.
      </p>
      <a className="btn primary full" href={NEW_APP_URL} target="_blank" rel="noopener">
        Neue Adresse öffnen
      </a>
      <p className="muted small">
        Auf Android sind deine Daten dort schon vorhanden. Fehlen sie (z. B. auf dem iPhone), exportiere hier eine
        Sicherung und importiere sie in der neuen App unter „Einstellungen → Datensicherung“.
      </p>
      <button className="btn secondary full" onClick={exportBackup}>
        Sicherung exportieren
      </button>
    </section>
  );
}
