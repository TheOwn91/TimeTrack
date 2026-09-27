/** Rückfrage im Stil der App (statt des Browser-Dialogs mit „Auf … wird Folgendes angezeigt“). */
export interface AskOptions {
  /** Beschriftung des Bestätigen-Knopfs (Standard „OK“). */
  confirmLabel?: string;
  /** Bestätigen-Knopf rot (für Löschen). */
  danger?: boolean;
}

export interface AskRequest extends AskOptions {
  message: string;
  resolve: (ok: boolean) => void;
}

export const ASK_EVENT = 'timetrack-ask';

/** Zeigt die Rückfrage an; `true`, wenn bestätigt. */
export function ask(message: string, options: AskOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<AskRequest>(ASK_EVENT, { detail: { message, ...options, resolve } }));
  });
}
