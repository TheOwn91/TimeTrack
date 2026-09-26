import { useStore } from '../lib/store';

/** Anzeige-Einstellungen der App. */
export function DisplayCard() {
  const { state, update } = useStore();
  const decimal = !!state.settings?.decimalHours;
  return (
    <section className="card">
      <h2>Anzeige</h2>
      <label className="checkbox toggle-row">
        <input
          id="decimal-hours"
          type="checkbox"
          checked={decimal}
          onChange={(e) =>
            update((d) => {
              d.settings = { ...d.settings, decimalHours: e.target.checked };
            })
          }
        />
        Summen als Dezimalzahl anzeigen
      </label>
      <p className="muted small">
        Monats- und Jahressummen (Ist, Soll, Saldo, Zulagen, Überstunden) z. B. als 156,73 h statt 156:44 h.
        Einzelne Schichten bleiben als Uhrzeit.
      </p>
    </section>
  );
}
