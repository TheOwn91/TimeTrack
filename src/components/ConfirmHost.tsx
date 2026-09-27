import { useEffect, useRef, useState } from 'react';
import { ASK_EVENT, type AskRequest } from '../lib/confirm';

/** Zeigt Rückfragen aus `ask()` an – über allen anderen Fenstern. */
export function ConfirmHost() {
  const [request, setRequest] = useState<AskRequest | null>(null);
  const current = useRef<AskRequest | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const close = (ok: boolean) => {
    current.current?.resolve(ok);
    current.current = null;
    setRequest(null);
  };

  useEffect(() => {
    const onAsk = (e: Event) => {
      // Eine noch offene Rückfrage gilt als abgebrochen
      current.current?.resolve(false);
      current.current = (e as CustomEvent<AskRequest>).detail;
      setRequest(current.current);
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);

  useEffect(() => {
    if (!request) return;
    confirmRef.current?.focus();
    // Escape nur für die Rückfrage, nicht für das Fenster darunter
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      close(false);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [request]);

  if (!request) return null;
  return (
    <div className="confirm-backdrop" onClick={() => close(false)}>
      <div className="confirm-dialog" role="alertdialog" aria-modal aria-describedby="confirm-message" onClick={(e) => e.stopPropagation()}>
        <p id="confirm-message">{request.message}</p>
        <div className="confirm-actions">
          <button className="btn secondary" onClick={() => close(false)}>
            Abbrechen
          </button>
          <button ref={confirmRef} className={`btn ${request.danger ? 'danger' : 'primary'}`} onClick={() => close(true)}>
            {request.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
