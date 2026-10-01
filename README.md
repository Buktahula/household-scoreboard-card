# 🏆 Household Scoreboard Card for Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/default)
[![GitHub release](https://img.shields.io/github/v/release/buktahula/household-scoreboard-card?include_prereleases)](https://github.com/buktahula/household-scoreboard-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Ein spielerisches **Haushalts-Scoreboard & Gamification-Card** für Home Assistant Lovelace Dashboards. 
Motiviere die ganze Familie oder WG bei täglichen Aufgaben: Wer eine Aufgabe erledigt (z. B. Müll rausgestellt, Spülmaschine ausgeräumt, To-Dos abgehakt), bekommt XP gutgeschrieben und steigt im Rang auf!

---

## ✨ Features

* 🥇 **Siegertreppchen (Podium):** Platz 1 mit goldener Krone 👑 in der Mitte, flankiert von Platz 2 (Silber) und Platz 3 (Bronze).
* ⚡ **Level- & Rang-System:** Automatische Fortschrittsbalken und Ränge:
  * 🌱 **Novize** (0–4 XP)
  * ⭐ **Helfer** (5–14 XP)
  * 🐝 **Fleißig** (15–29 XP)
  * ⚡ **Profi** (30–49 XP)
  * 👑 **Legende** (ab 50 XP)
* 🎮 **Integrierte Schnell-Aktionsbuttons (+1 XP):** Direkt auf der Karte mit einem Klick Punkte gutschreiben – inklusive haptischem Feedback und latenzfreier Live-Aktualisierung.
* ➖ **Korrektur-Option:** Mit optionalem Minus-Button zur schnellen Korrektur von Fehlklicks.
* 🔄 **Saison- / Wochen-Reset:** Optionaler Reset-Button mit Sicherheitsabfrage zum Zurücksetzen aller Punkte auf 0.
* 🖼️ **Automatische Avatare:** Liest Profilbilder direkt aus `person.*`-Entities oder erlaubt eigene Bild-URLs. Falls kein Bild vorhanden ist, werden automatisch stilvolle Initialen-Badges generiert.
* 🌓 **Responsive & Theme-kompatibel:** Passt sich automatisch an Dark- und Light-Themes sowie Smartphone-, Tablet- und Desktop-Layouts an.
* ⚙️ **Grafischer UI-Editor:** Vollständig über den visuellen Home Assistant Dashboard-Editor konfigurierbar.

---

## 📦 Installation

### Methode 1: Über HACS (Empfohlen)

1. Öffne **HACS** in deinem Home Assistant.
2. Klicke oben rechts auf das Drei-Punkte-Menü `⋮` und wähle **Benutzerdefinierte Repositories** (*Custom repositories*).
3. Gib die Repository-URL ein:
   ```text
   https://github.com/buktahula/household-scoreboard-card
   ```
4. Wähle als Typ: **Lovelace** (oder *Dashboard* / *Plugin*).
5. Klicke auf **Hinzufügen** (*Add*).
6. Suche nach **Household Scoreboard Card**, klicke darauf und wähle **Herunterladen** (*Download*).
7. Lade die Dashboard-Seite im Browser neu (`Strg` + `F5`).

---

### Methode 2: Manuelle Installation

1. Lade die Datei [`household-scoreboard-card.js`](https://raw.githubusercontent.com/buktahula/household-scoreboard-card/main/household-scoreboard-card.js) herunter.
2. Kopiere die Datei in deinen Home Assistant Ordner `config/www/` (z. B. `config/www/household-scoreboard-card.js`).
3. Gehe in Home Assistant zu **Einstellungen** ➔ **Dashboards** ➔ **Drei Punkte oben rechts** ➔ **Ressourcen**.
4. Klicke auf **Ressource hinzufügen**:
   * **URL:** `/local/household-scoreboard-card.js`
   * **Ressourcentyp:** `JavaScript-Modul`
5. Lade dein Dashboard neu.

---

## 🚀 Schnellanleitung

Erstelle für jeden Spieler einen Zähler-Helfer (*Counter*) unter **Einstellungen ➔ Geräte & Dienste ➔ Helfer ➔ Zähler** (z. B. `counter.punkte_alex`).

### Option A: 100% über die Benutzeroberfläche (UI Editor)
1. Klicke im Dashboard auf **Karte hinzufügen** (`+`).
2. Wähle **Household Scoreboard Card** aus.
3. Konfiguriere alles bequem über die grafische Oberfläche:
   - **👥 Spieler:** Spieler hinzufügen, Zähler- und Person-Entitäten aus Autocomplete-Dropdowns wählen, Farben per Klick anpassen.
   - **⚙️ Allgemein:** Titel, Untertitel und Einheit (z. B. XP oder Sterne) einstellen.
   - **🎛️ Anzeige & Aktionen:** Podium, Rangliste, Aktionsbuttons und Schrittweite aktivieren oder anpassen.
   - **🔄 Reset:** Wöchentlichen Reset-Button mit Bestätigungsabfrage aktivieren.
4. Klicke auf **Speichern** – fertig! Kein YAML erforderlich.

### Option B: Über YAML-Code
Falls du den Code-Editor bevorzugst, kannst du die Karte auch wie gewohnt über YAML konfigurieren:

```yaml
type: custom:household-scoreboard-card
title: "🏆 Haushalts-Rangliste"
subtitle: "Gaming Scoreboard • Wer macht heute die meisten Aufgaben?"
show_podium: true
show_ranks: true
show_actions: true
show_reset: true
unit: "XP"
players:
  - name: Alex
    entity: counter.punkte_alex
    person: person.alex
    color: "#448aff"
  - name: Luca
    entity: counter.punkte_luca
    person: person.luca
    color: "#00e676"
  - name: Sarah
    entity: counter.punkte_sarah
    person: person.sarah
    color: "#ff4081"
```

---

## ⚙️ Konfigurations-Optionen

### Karten-Optionen

| Parameter | Typ | Standard | Beschreibung |
| :--- | :--- | :--- | :--- |
| `type` | `string` | **Erforderlich** | Immer `custom:household-scoreboard-card` |
| `players` | `list` | **Erforderlich** | Liste der Spieler (siehe Tabelle unten) |
| `title` | `string` | `🏆 Haushalts-Rangliste` | Titel der Karte |
| `subtitle` | `string` | `Gaming Scoreboard ...` | Untertitel oder Motto |
| `unit` | `string` | `XP` | Punkte-Einheit (z. B. `XP`, `Punkte`, `⭐`) |
| `show_podium` | `boolean` | `true` | Siegertreppchen (Top 3) anzeigen |
| `show_ranks` | `boolean` | `true` | Vollständige Rangliste mit Fortschrittsbalken |
| `show_actions` | `boolean` | `true` | Schnell-Buttons (+1 XP) je Spieler anzeigen |
| `action_step` | `number` | `1` | Wieviele Punkte pro Klick vergeben werden |
| `allow_decrement` | `boolean` | `true` | Zeigt kleinen Minus-Button zur Korrektur |
| `show_reset` | `boolean` | `false` | Button zum Zurücksetzen aller Zähler |
| `reset_text` | `string` | `Wochen-Scoreboard zurücksetzen` | Text des Reset-Buttons |
| `reset_confirm` | `string` | `...` | Bestätigungstext vor dem Reset |
| `levels` | `list` | *Standard-Ränge* | Eigene Ränge und Schwellenwerte (optional) |

### Spieler-Optionen (`players`)

| Parameter | Typ | Beschreibung |
| :--- | :--- | :--- |
| `name` | `string` | **Erforderlich:** Name des Spielers (z. B. `Alex`) |
| `entity` | `string` | **Erforderlich:** Counter- oder Input-Number-Entity (z. B. `counter.punkte_alex`) |
| `person` | `string` | Optional: Zugehörige `person.*`-Entity für das automatische Profilbild |
| `image` | `string` | Optional: Direkte Bild-URL oder Pfad (überschreibt das Bild der Person) |
| `color` | `string` | Optional: Eigene Akzentfarbe (z. B. `#448aff`, `rgba(68,138,255,1)`) |

---

## 💡 Automations-Tipp: Punkte automatisch vergeben

Du kannst das Scoreboard mit deinen Automatisierungen verknüpfen, z. B. wenn jemand Aufgaben in `todo.haushalt` erledigt oder auf die Müll-Benachrichtigung klickt:

```yaml
alias: "Haushalt: XP vergeben bei erledigter Aufgabe"
trigger:
  - trigger: state
    entity_id: todo.haushalt
action:
  - action: counter.increment
    target:
      entity_id: counter.punkte_alex
  - action: logbook.log
    data:
      name: "🏆 Scoreboard"
      message: "Alex hat eine Aufgabe erledigt (+1 XP)!"
```

---

## 📄 Lizenz

Dieses Projekt ist unter der [MIT License](LICENSE) lizenziert.
Erstellt von buktahula.
