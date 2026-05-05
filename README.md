# Gymcam

Multi-kamera inspelnings- och uppspelningssystem för gymnastikhall.

## Krav

- Node.js 18+
- ffmpeg installerat och i PATH
- Axis-kameror på lokalt nätverk

## Installation

```bash
npm install
```

## Konfiguration

Redigera `config/cameras.json` med dina kamerors namn och IP-adresser:

```json
[
  { "name": "Kontor", "ip": "192.168.1.141" },
  { "name": "Sal",    "ip": "192.168.1.142" }
]
```

Sätt lösenord som miljövariabel:

```bash
export PASS=dittlösenord
```

## Start

```bash
npm start
```

Webbläsaren öppnas automatiskt på `http://localhost:3000`.

## Knappmappning (numpad)

### LIVE-läge
| Knapp | Funktion |
|-------|----------|
| 1–9 | Byt till kamera N |
| `*` | Starta inspelning |

### RECORDING-läge
| Knapp | Funktion |
|-------|----------|
| `-` | Stoppa och kassera inspelning |
| `Enter` | Stoppa och gå till uppspelning |

### PLAYBACK-läge
| Knapp | Funktion |
|-------|----------|
| 1–9 | Byt kameravinkel (synkad tidpunkt) |
| `0` / `Enter` | Pausa |
| `+` | Hoppa fram 5 sekunder |
| `-` | Hoppa tillbaka 5 sekunder |
| `*` | Slow motion (0.5x) |
| `/` | Tillbaka till LIVE |

### PAUSED-läge
| Knapp | Funktion |
|-------|----------|
| 1–9 | Byt kameravinkel |
| `0` / `Enter` | Spela |
| `+` | Stega fram 1 frame |
| `-` | Stega tillbaka 1 frame |
| `/` | Tillbaka till LIVE |

## Projektstruktur

```
gymcam/
├── server.js              # Express-server + routing
├── modules/
│   ├── state.js           # State machine (LIVE/RECORDING/PLAYBACK/PAUSED)
│   └── managecameras.js   # ffmpeg-hantering
├── views/
│   └── index.ejs          # Huvud-UI
├── public/                # Statiska filer (logotyp, etc.)
├── config/
│   └── cameras.json       # Kamerakonfiguration
└── video/                 # Inspelade videofiler (skapas automatiskt)
```