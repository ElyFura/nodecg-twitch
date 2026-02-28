# nodecg-twitch

Twitch Alert Overlay Bundle for [NodeCG](https://nodecg.dev) v2.

Zeigt anpassbare Alerts im Stream-Overlay an, wenn Events auf Twitch auftreten: Follows, Subs, Resubs, Gift Subs, Bits, Raids und Channel Point Redemptions.

## Features

- **7 Alert-Typen** — Follow, Sub, Resub, Gift Sub, Bits, Raid, Channel Points
- **Frei positionierbar** — 7 Positionen (Oben Links/Mitte/Rechts, Mitte, Unten Links/Mitte/Rechts)
- **Farben & Akzente** — Hintergrund-, Text- und Akzentfarbe pro Alert-Typ; Platzhalter wie `{username}` werden in der Akzentfarbe hervorgehoben
- **Hintergrundbilder** — Upload eigener Bilder mit konfigurierbarer Overlay-Deckkraft (0–100%)
- **Custom Icons** — Eigene Icons/Emotes statt Standard-Emojis hochladen
- **Schriftarten** — 11 kuratierte Google Fonts (Roboto, Open Sans, Montserrat, Poppins, Oswald, Bangers, Permanent Marker, Press Start 2P, Fredoka One, Outfit) + System-Standard
- **Text-Styling** — Schriftgröße (12–72px), Textschatten und Text-Outline mit jeweils wählbarer Farbe
- **Animationen** — Slide, Fade, Bounce mit konfigurierbarer Ein-/Ausblend-Geschwindigkeit (100–3000ms)
- **Sound-Cues** — Zuweisbare Sounds pro Alert-Typ über NodeCG's Sound-System
- **Prioritäts-Queue** — Alerts werden nach Priorität (1–10) sortiert; höhere Priorität wird zuerst angezeigt
- **Konfigurierbarer Delay** — Pause zwischen Alerts (0–10000ms)
- **Alert-Verlauf** — Die letzten 50 Alerts mit Zeitstempel, löschbar
- **Live-Preview** — Echtzeit-Vorschau im Overlay Editor mit Animations-Abspielen
- **Twitch EventSub** — WebSocket-basierte Events via @twurple mit automatischem Token-Refresh

## Voraussetzungen

- [NodeCG](https://nodecg.dev) v2.x
- Node.js 18+
- Eine [Twitch Developer Application](https://dev.twitch.tv/console/apps)

## Installation

```bash
cd nodecg/bundles
git clone <repo-url> nodecg-twitch
cd nodecg-twitch
npm install
```

Anschließend NodeCG neu starten.

## Twitch App einrichten

1. Erstelle eine App unter [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
2. Setze die **Redirect URI** auf:
   ```
   http://localhost:9090/nodecg-twitch/auth/callback
   ```
   (Port und Protokoll an deine NodeCG-Konfiguration anpassen)
3. Notiere **Client ID** und **Client Secret**

### Benötigte Scopes

- `moderator:read:followers`
- `channel:read:subscriptions`
- `bits:read`
- `channel:read:redemptions`

## Konfiguration

### 1. Einstellungen (Setup-Workspace)

- **Client ID** und **Client Secret** eintragen und speichern
- **Kanalname** eingeben (lowercase)
- Auf **"Mit Twitch verbinden"** klicken — ein Popup öffnet den OAuth-Flow
- Optional: **Alert-Delay** anpassen (Pause zwischen Alerts in ms)

### 2. Overlay Editor

Pro Alert-Typ konfigurierbar:

| Einstellung | Beschreibung |
|---|---|
| Aktiviert | Alert-Typ ein-/ausschalten |
| Dauer | Anzeigedauer in Sekunden |
| Nachricht | Template mit Platzhaltern: `{username}`, `{amount}`, `{message}`, `{tier}` |
| Animation | Slide, Fade oder Bounce |
| Position | 7 mögliche Positionen im Overlay |
| Hintergrund | Farbe oder hochgeladenes Bild |
| Icon | Standard-Emoji oder hochgeladenes Bild |
| Farben | Hintergrund, Text, Akzent |
| Schriftart | Google Font oder System-Standard |
| Schriftgröße | 12–72px |
| Text-Effekte | Schatten und Outline mit Farbwahl |
| Overlay-Deckkraft | Transparenz bei Hintergrundbildern |
| Anim.-Speed | Ein- und Ausblend-Dauer in ms |
| Sound | Sound-Cue ein-/ausschalten |
| Priorität | 1 (niedrig) – 10 (hoch) |

### 3. Alerts Panel

- Verbindungsstatus anzeigen
- Aktuelle Queue mit Prioritäts-Anzeige
- Alert überspringen / Queue leeren
- Test-Alerts für alle 7 Typen senden
- Alert-Verlauf mit Zeitstempeln

## Overlay einbinden

Die Grafik-URL in OBS/Streamlabs als **Browser Source** hinzufügen:

```
http://localhost:9090/bundles/nodecg-twitch/graphics/main.html
```

- Breite: **1920**, Höhe: **1080**
- Transparenter Hintergrund aktivieren

## Assets hochladen

Über das NodeCG Assets-Panel:

- **Alert-Hintergrundbilder** — JPG, PNG, GIF, WebP
- **Alert-Icons** — PNG, SVG, GIF, WebP, JPG

Hochgeladene Assets erscheinen automatisch in den Dropdowns des Overlay Editors.

## Standard-Prioritäten

| Alert-Typ | Priorität |
|---|---|
| Raid | 8 |
| Sub Gift | 7 |
| Sub | 6 |
| Resub | 6 |
| Bits | 5 |
| Follow | 3 |
| Channel Points | 2 |

## Projektstruktur

```
nodecg-twitch/
├── dashboard/
│   ├── alerts.html / alerts.js        # Alert Queue & Verlauf
│   ├── overlay-editor.html / .js      # Overlay-Konfiguration
│   ├── settings.html / settings.js    # Twitch API & Delay
│   └── shared.css                     # Gemeinsame Styles
├── extension/
│   └── index.js                       # Twitch EventSub, Queue-Logik, History
├── graphics/
│   ├── main.html                      # Overlay (1920x1080)
│   └── main.js                        # Alert-Rendering
├── schemas/
│   ├── alertConfig.json               # Alert-Typ-Konfiguration
│   ├── alertHistory.json              # Alert-Verlauf
│   ├── alertQueue.json                # Alert-Warteschlange
│   ├── connectionStatus.json          # Verbindungsstatus
│   ├── currentAlert.json              # Aktueller Alert
│   └── settings.json                  # API-Zugangsdaten & Delay
└── package.json
```

## Abhängigkeiten

- [@twurple/auth](https://twurple.js.org/) — Twitch OAuth & Token-Refresh
- [@twurple/api](https://twurple.js.org/) — Twitch Helix API
- [@twurple/eventsub-ws](https://twurple.js.org/) — EventSub via WebSocket

## Lizenz

Apache-2.0
