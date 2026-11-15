# Maia — Astronaut Health Monitoring

> NASA Space Apps Challenge 2026 · *Create Health Monitoring Software for Astronauts on Space Missions*

> STELLART · *Alejandra Valentina Cruz Ruiz, Diana Karen Mora Gonzalez, Yaretzi Abigail Lopez Hernandez Myrahis Yurizahan Sanluis Cerezo, Renata Solis Diaz*

Maia helps astronauts check and act on their own health during long missions. It compares live vital signs against **each astronaut's own normal range** (learned in the first days of the mission). It cross-checks body signals against the **environment** (radiation, space weather, cabin CO₂) and turns everything into clear colours, spoken alerts and step-by-step guidance. A friendly asteroid mascot, **MAIA**, nudges healthy habits.

Maia **supports** decisions. It does not diagnose or replace the crew medical officer or flight surgeon.

---

## Features

| Screen | What it does |
|---|---|
| **Setup** | 8-step onboarding: consent, profile, medical and flight history, normal values, mission schedule, contacts. Includes a one-click demo profile. |
| **Home** | One-glance health summary on an "orbit" layout, MAIA habit nudges, and a 24-hour routine clock with today's tasks. |
| **Body & Sensors** | Clickable 10-zone body map, live heart rate / blood pressure / SpO₂ / temperature, deviation from personal normal, guided measurements. |
| **Spoken alerts** | Text-to-speech crew alerts when a signal leaves its safe range, with **EVA mode** wording for spacewalks. A sensor simulation console triggers scenarios for demos. |
| **Environment** | Career radiation dose, live **NOAA** space weather scales, **NASA DONKI** solar flares / particle events / geomagnetic storms, live **ISS position** with the South Atlantic Anomaly, and cabin CO₂ against NASA limits. |
| **Report** | Trends, a cross-reference chart (any vital vs. any environment dataset), a correlation matrix, a daily log that flags unusual days, and symptom / alert history. |
| **Symptom log** | Log symptoms with severity, notes and photos taken through a **guided camera** (checks light, focus and framing). Export as PDF or JSON. |
| **Emergency** | Triage ("What do you see?"), tap-to-tick guides with a live vitals strip and an automatic timeline, then an optional photo and a report for the flight surgeon. |

---

## Tech stack

**Frontend**
- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) (dev server, build, `/api` proxy)
- [three.js](https://threejs.org) — 3D / animations
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export of reports
- [Papa Parse](https://www.papaparse.com) — reading the CSV data files
- Web Speech API (spoken alerts) and MediaDevices API (guided camera), both built into the browser
- Hand-built SVG charts (no chart library) and plain CSS with design tokens

**Backend**
- Python 3.12+ · [FastAPI](https://fastapi.tiangolo.com) · [Uvicorn](https://www.uvicorn.org)
- [httpx](https://www.python-httpx.org) (async API calls) · python-dotenv

**Data analysis**
- Python · pandas · NumPy · SciPy · openpyxl

**Deployment**
- Frontend on [Vercel](https://vercel.com) · Backend on [Railway](https://railway.com)

---

## Data sources

| Source | Used for | Live? |
|---|---|---|
| [NOAA SWPC](https://www.swpc.noaa.gov) | Radiation (S), geomagnetic (G) and radio blackout (R) scales; planetary Kp index | Live |
| [NASA DONKI](https://api.nasa.gov) | Solar flares, solar energetic particle events, geomagnetic storms (last 30 days) | Live |
| [Where the ISS at?](https://wheretheiss.at) | ISS latitude, longitude, altitude, speed | Live |
| [NASA OSDR](https://osdr.nasa.gov) — Inspiration4 (OSD-569, OSD-575) | Real blood panels (CBC, CMP) used to build lab baselines and the analysis method | Processed offline |
| Synthetic mission data | Daily vitals, cabin CO₂, routine and events for the 42-day demo mission | Generated (`analysis/`) |

Synthetic and sample values are labelled as such in the UI.

---

## Architecture

```
┌──────────────────────── Browser (React + Vite) ────────────────────────┐
│  Pages: Setup · Home · Body & Sensors · Environment · Report           │
│  VitalsContext ── simulated sensor feed, alert engine, TTS             │
│  src/utils/api.ts ── usePolling() hooks → /api/*                       │
└───────────────────────────────┬────────────────────────────────────────┘
                                │  dev: Vite proxy   ·   prod: VITE_API_URL
┌───────────────────────────────▼──────────── Backend (FastAPI) ─────────┐
│  routes/        REST endpoints  (/api/environment/*, /api/dataset/*)   │
│        ↓                                                               │
│  services/      clean + enrich raw data → app status words             │
│        ↓        (normal · advisory · caution · warning · critical)     │
│  loader.py      live API  →  last good cache  →  committed seed file   │
│        ↓                                                               │
│  sources.py     HTTP calls to NOAA · NASA DONKI · wheretheiss.at       │
└────────────────────────────────────────────────────────────────────────┘

analysis/  (offline Python pipeline)
  NASA OSDR Inspiration4 CSVs ─► baselines, synthetic mission, daily method ─► src/data/
```

**Why the loader has fallbacks:** every dataset is served from the live API when possible. When that fails, the backend serves the last good cached answer, or a seed snapshot committed to the repo. Each response says where it came from (`live`, `cache` or `seed`), and the Environment page shows that as a chip. The app keeps working during a demo with bad wifi and always tells you how fresh the data is.

**Why a backend at all:** it keeps the NASA API key off the browser, caches responses so many users don't hit rate limits, and converts each API's raw format into one shape the UI understands.

---

## Project structure

```
.
├── src/
│   ├── pages/                 # Home, Body & Sensors, Environment, Report
│   │   └── Initial record/    # 8-step setup flow
│   ├── components/
│   │   ├── body/ environment/ report/ home/   # per-screen components
│   │   ├── emergency/         # triage, guides, emergency report
│   │   ├── symptom-log/       # symptom logger + guided camera + PDF export
│   │   ├── maia/              # charts and views built on the analysis data
│   │   ├── layout/ ui/        # top bar, cards, pills, modal, sparkline…
│   │   └── external/          # mascot + symptom log adapters
│   ├── utils/                 # api client, vitals context, baselines, TTS, stats
│   └── data/                  # CSV / TS data used by the app
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + CORS
│   │   ├── config.py          # env vars, TTLs, allowed origins
│   │   ├── loader.py          # live → cache → seed
│   │   ├── sources.py         # external API calls
│   │   ├── services/          # data cleaning / enrichment
│   │   └── routes/            # REST endpoints
│   ├── data/seed/             # offline snapshots
│   └── requirements.txt
└── analysis/                  # Python data pipeline (see analysis/README.md)
```

---

## Getting started

### Prerequisites

- **Node.js 20+** and npm — https://nodejs.org
- **Python 3.12 or 3.13** — https://www.python.org (3.14 works for the backend but some analysis packages may not have Windows builds yet)
- A free **NASA API key** — https://api.nasa.gov (`DEMO_KEY` works but is heavily rate-limited)

### 1. Clone

```bash
git clone https://github.com/Abejandr4/Maia.git
cd Maia
```

### 2. Backend (terminal 1)

```bash
cd backend
python -m venv .venv

# activate the virtual environment
# Windows (PowerShell):  .venv\Scripts\activate
# macOS / Linux:         source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env          # Windows: copy .env.example .env
# open .env and set NASA_API_KEY=your_key

uvicorn app.main:app --reload --port 8000
```

Check it at http://localhost:8000/api/health. Interactive docs are at http://localhost:8000/docs.

### 3. Frontend (terminal 2, repo root)

```bash
npm install
npm run dev
```

Open http://localhost:5173. In development, Vite forwards every `/api/*` request to the backend on port 8000.

> **No backend running?** The app still works. The Environment page falls back to demo data and shows *backend offline*.

### 4. Data analysis (optional)

Only needed to regenerate the data in `src/data/`:

```bash
pip install pandas numpy scipy openpyxl
cd analysis/code
python run_all.py          # full run (~4 min)
python run_all.py 200      # quick run
```

See [`analysis/README.md`](analysis/README.md) for what each step produces.

---

## Scripts

| Command | Where | What |
|---|---|---|
| `npm run dev` | root | Start the frontend dev server (http://localhost:5173) |
| `npm run build` | root | Type-check and build for production into `dist/` |
| `npm run preview` | root | Serve the production build locally |
| `npm run lint` | root | Run ESLint |
| `uvicorn app.main:app --reload --port 8000` | `backend/` | Start the API with auto-reload |
| `python run_all.py` | `analysis/code/` | Run the full data pipeline |

---

## Environment variables

**Backend** — `backend/.env` locally, *Variables* tab on Railway. Never commit this file.

| Variable | Default | Purpose |
|---|---|---|
| `NASA_API_KEY` | `DEMO_KEY` | Key for NASA DONKI |
| `OFFLINE` | `0` | `1` = never call external APIs (serve cache / seed only) |
| `FRONTEND_ORIGINS` | — | Extra allowed CORS origins, comma-separated |

**Frontend** — Vercel → *Settings → Environment Variables*.

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_URL` | `https://your-backend.up.railway.app` | Backend URL in production (**no trailing slash**). Leave unset locally. |

`VITE_` variables are built into the public JavaScript, so only put public values there, never the NASA key.

---

## API endpoints

| Method | Endpoint | Returns |
|---|---|---|
| GET | `/api/health` | `{ ok, offline }` |
| GET | `/api/environment/summary` | Space weather, Kp, DONKI events, ISS position, data sources |
| GET | `/api/environment/iss` | ISS position only (polled every 10 s) |
| GET | `/api/dataset/keys` | Available datasets |
| GET | `/api/dataset/{key}` | Raw dataset with optional filters, e.g. `?classType__contains=x`, `?kp__gte=5` |
| POST | `/api/dataset/refresh` | Force a re-fetch of every dataset |

---

## Deployment

**Backend → Railway**
1. *Settings → Source → Root Directory:* `backend`
2. *Settings → Deploy → Custom Start Command:*
   `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. *Variables:* `NASA_API_KEY`, and optionally `FRONTEND_ORIGINS`
4. *Settings → Networking → Generate Domain*

**Frontend → Vercel**
1. Import the repository (framework preset: Vite)
2. *Settings → Environment Variables:* `VITE_API_URL` = your Railway URL (no trailing slash)
3. Redeploy after changing any variable, because Vite builds them in at build time

CORS already allows `localhost:5173` and any `*.vercel.app` address.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Environment page says **backend offline** | Start the backend; check http://localhost:5173/api/health |
| `ModuleNotFoundError` when starting uvicorn | Activate `.venv`, run `pip install -r requirements.txt`, and start from inside `backend/` |
| Chip shows **snapshot** instead of **live** | The backend can't reach the APIs. Open `/api/environment/summary` and read `sources.*.error` |
| Setup screens don't appear | Setup was already completed. Run `localStorage.clear()` in the browser console and reload |
| Deployed site: CORS error or `//api` in the URL | Remove the trailing slash from `VITE_API_URL` and redeploy Vercel |

---

## AI USE

| AI technology | Given use |
|---|---|
| **Code generation** | This app was mainly developed through vibe coding, with the team laying down the main functions and components but correcting, completing and putting them together via generation with LLM's such as Opus 5.5, Gemini. |
| **Mock data** | Mock data for health measurements was generated with Opus 5.5. |
| **Mockup** | Base44 was used to ideate the screens based on the functions previously designed by the team. |
| **Image generation** | All images found on the interface were AI-generated. |

---

## Team

<!-- Add names, roles and links -->

---

## Acknowledgements

NASA Space Apps Challenge · NASA Open Science Data Repository (Inspiration4 data) · NASA CCMC DONKI · NOAA Space Weather Prediction Center · wheretheiss.at.
Health ranges and limits reference NASA-STD-3001. Sources for each value are listed in `src/data/sources.csv`.
