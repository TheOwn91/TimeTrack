# TimeTrack – Arbeitszeiterfassung

App zur Erfassung von Arbeitszeiten, die **lokal auf dem Handy** läuft (Android und iPhone). Sie wird einmal im Browser geöffnet und auf dem Homescreen installiert – danach startet sie wie eine normale App und funktioniert **komplett offline**. Alle Daten bleiben auf dem Gerät; über „Einstellungen → Datensicherung“ lassen sie sich als Datei sichern und wiederherstellen.

## Auf dem Handy installieren

1. Die App einmal über ihre HTTPS-Adresse öffnen (z. B. GitHub Pages, siehe unten).
2. **iPhone:** in Safari auf *Teilen* → *Zum Home-Bildschirm*.
   **Android:** im Chrome-Menü (⋮) auf *App installieren*.
3. Fertig – ab jetzt vom Homescreen starten, Internet wird nicht mehr benötigt.

Updates werden automatisch geladen und beim Öffnen installiert. Unter „Einstellungen → App-Version & Updates“ lässt sich das abschalten; dann gibt es „Auf Updates prüfen“ und „Jetzt aktualisieren“. Nach jedem Update zeigt die App, was neu ist.
Der PDF-Monatsbericht und die Datensicherung öffnen auf dem Handy das Teilen-Menü (in Dateien speichern, per Mail/Messenger senden).

> Hinweis: Wird die App bzw. werden die Website-Daten im Browser gelöscht, sind auch die Zeiten weg. Deshalb regelmäßig eine Sicherung exportieren.

### Veröffentlichen über GitHub Pages

Der Workflow `.github/workflows/pages.yml` baut und veröffentlicht die App bei jedem Push auf `main`.
Einmalig nötig: im Repository unter *Settings → Pages → Source* „GitHub Actions“ auswählen.
(Bei privaten Repositories setzt GitHub Pages einen kostenpflichtigen Plan voraus – alternativ jeden anderen HTTPS-Webspace verwenden und dort den Inhalt von `dist/` hochladen.)

## Funktionen

- **Arbeitgeber / Projekte** anlegen mit Stundenlohn, Tagessoll, Arbeitstagen, Bundesland (Feiertage) und Zulagen-Regeln
- **Start / Pause / Beenden** per Klick; die zuletzt gewählte Arbeit bleibt ausgewählt
- **Pausen automatisch**: Pausen-Button, Lücken zwischen Buchungen eines Tages zählen als Pause, optional wird die gesetzliche Mindestpause (§ 4 ArbZG: > 6 h → 30 min, > 9 h → 45 min) abgezogen
- **Startseite**: Arbeitsauswahl, Timer, Monatsstunden (Ist / Soll bis heute / Saldo), aktuelle Zulagen, vergangene Arbeitstage ohne Erfassung mit Schnellauswahl (Urlaub, Krank, Überstundenausgleich, Kurzarbeit, Frei)
- **Jahresübersicht**: Urlaub (Anspruch, Übertrag aus dem Vorjahr, genommen, geplant, Rest) und Überstundenkonto Monat für Monat. Resturlaub und Überstunden werden automatisch ins nächste Jahr übernommen.
- **Zuschlag auf Überstunden** (z. B. 25 %): wird am Monatsende auf die positiven Überstunden des Monats gutgeschrieben
- **Urlaubstage** des Monats und Resturlaub in der Monatsübersicht
- **Monatsansicht** mit allen Tagen; Tippen auf einen Tag öffnet den Editor zum Nachtragen/Korrigieren von Zeiten, Pausen und Abwesenheits-Schlüsseln
- **Zulagen** minutengenau: Uhrzeit-Fenster (auch über Mitternacht, optional nur an bestimmten Wochentagen), Wochentage (z. B. Sonntag) und Feiertage – in Stunden und € (bei hinterlegtem Stundenlohn)
- **„Was ist neu?“** nach Updates beim ersten Start der neuen Version, dauerhaft abschaltbar
- **PDF-Monatsbericht** mit Tagesliste, Zusammenfassung, Zulagen und Unterschriftsfeldern
- **Statusleiste**: Solange die Zeit läuft, zeigt die App eine Benachrichtigung („Zeit läuft seit 07:02“ bzw. „Pause seit …“) und eine Markierung am App-Symbol. Android: sofort; iPhone: ab iOS 16.4 in der installierten App. Abschaltbar unter „Einstellungen → Statusleiste“.

### Abwesenheits-Schlüssel

| Schlüssel | Wirkung |
|---|---|
| Urlaub, Krank, Feiertag, Sonstiges (bezahlt) | Tagessoll wird gutgeschrieben |
| Überstundenausgleich | Soll bleibt, wird vom Stundenkonto abgezogen |
| Kurzarbeit, Frei | Tag hat kein Soll |

## Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Unit-Tests (Berechnungen, Feiertage)
npm run build      # Produktions-Build nach dist/
npm run build:demo # Demo mit Beispieldaten als einzelne HTML-Datei (dist-demo/timetrack-demo.html)
```

Der Build ist statisch (`base: './'`) und kann auf jedem Webserver bzw. GitHub Pages gehostet werden.
