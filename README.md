# TimeTrack – Arbeitszeiterfassung

Einfache Web-App (PWA-fähig) zur Erfassung von Arbeitszeiten. Alle Daten bleiben lokal im Browser (`localStorage`); über „Arbeitgeber → Datensicherung“ lassen sie sich als JSON sichern und wiederherstellen.

## Funktionen

- **Arbeitgeber / Projekte** anlegen mit Stundenlohn, Tagessoll, Arbeitstagen, Bundesland (Feiertage) und Zulagen-Regeln
- **Start / Pause / Beenden** per Klick; die zuletzt gewählte Arbeit bleibt ausgewählt
- **Pausen automatisch**: Pausen-Button, Lücken zwischen Buchungen eines Tages zählen als Pause, optional wird die gesetzliche Mindestpause (§ 4 ArbZG: > 6 h → 30 min, > 9 h → 45 min) abgezogen
- **Startseite**: Arbeitsauswahl, Timer, Monatsstunden (Ist / Soll bis heute / Saldo), aktuelle Zulagen, vergangene Arbeitstage ohne Erfassung mit Schnellauswahl (Urlaub, Krank, Überstundenausgleich, Kurzarbeit, Frei)
- **Monatsansicht** mit allen Tagen; Tippen auf einen Tag öffnet den Editor zum Nachtragen/Korrigieren von Zeiten, Pausen und Abwesenheits-Schlüsseln
- **Zulagen** minutengenau: Uhrzeit-Fenster (auch über Mitternacht, optional nur an bestimmten Wochentagen), Wochentage (z. B. Sonntag) und Feiertage – in Stunden und € (bei hinterlegtem Stundenlohn)
- **PDF-Monatsbericht** mit Tagesliste, Zusammenfassung, Zulagen und Unterschriftsfeldern

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
```

Der Build ist statisch (`base: './'`) und kann auf jedem Webserver bzw. GitHub Pages gehostet werden.
