# TimeTrack – Hinweise für Claude

Offline-fähige PWA zur Arbeitszeiterfassung (React + TypeScript + Vite). UI-Sprache: Deutsch.

## Prüfen vor jedem Push / jeder Veröffentlichung

- `npx tsc -p .`, `TZ=Europe/Berlin npm test`, `npm run build`
- **UI-Änderungen immer in hell UND dunkel ansehen** (Screenshots im Handy-Viewport, z. B. Playwright
  mit `colorScheme: 'dark'` und zusätzlich `data-theme="dark"` am `<html>`-Element bei hellem System).
  Auf Kontrast achten: Texte, Chips, Tags, Rahmen, Modals, Hervorhebungen.

## Farben / Dark Mode

- Alle Farben ausschließlich über die Tokens in `src/styles.css` (`:root`), nie feste Hex-Werte in
  Komponenten oder CSS-Regeln.
- Dark Mode wird dreifach definiert: `:root` (hell), `@media (prefers-color-scheme: dark)` mit
  `:root:not([data-theme='light'])` und `:root[data-theme='dark']`. Neue Tokens in allen drei Blöcken setzen.
- Textfarben (`--link`, `--danger`, `--success`, `--c-*`) sind im Dark Mode hellere Varianten;
  Button-Hintergründe haben eigene Tokens (`--primary`, `--danger-bg`, `--warning-bg`).

## Demo

`npm run build:demo -- <ziel.html>` erzeugt eine einzelne HTML-Datei mit Beispieldaten
(`src/lib/demo.ts`). In der Demo gibt es keine Downloads, Dialoge oder Service Worker.
