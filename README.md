# SadakSetu

# Overview

SadakSetu is a road-safety complaint system with a React web dashboard, FastAPI backend, PostgreSQL/PostGIS database, AI pothole detection, and an Android citizen application.

The Android application is included in this repository under `android/`.

## Project structure

- `src/`: React web dashboard
- `backend/`: FastAPI API, database models, migrations, and AI service
- `android/`: Android citizen application
- `public/`: Web assets and logo
- `run_sadaksetu.bat`: Windows launcher for the backend, web dashboard, and Android application

## Windows run

Double-click `run_sadaksetu.bat` from the repository root.

The launcher starts:

- Backend at `http://localhost:8001`
- Web dashboard at `http://localhost:5174`
- Android debug build and installation through `adb`

The Android phone and computer must be connected to the same Wi-Fi network. Set `SADAKSETU_LAN_IP` if the launcher detects the wrong network address.
The web dashboard routes `/api` requests through Vite to the local backend, so the browser uses the same origin whether opened on the computer or over the LAN.

## Web development

```bash
npm run dev       # start the Vite development server
npm run build     # type-check and create a production build
npm run lint      # run ESLint
npm test          # run the test suite once
npm run test:watch
```

## Backend development

Create `backend/.env` from `backend/.env.example`, configure PostgreSQL/PostGIS, then run:

```bash
cd backend
python -m alembic upgrade head
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## Android development

Open `android/` in Android Studio or run:

```bash
cd android
gradlew.bat :app:assembleDebug -PsadaksetuApiBaseUrl=http://YOUR_LAN_IP:8001/
```

Install the resulting APK from `android/app/build/outputs/apk/debug/` with `adb install -r`.

## Configuration

Copy `.env.example` to `.env.local`. The local Vite server proxies `/api` requests to `http://127.0.0.1:8001`; for a separately hosted API, set `VITE_API_BASE_URL` to that API's `/api/v1` URL.
For local development demo login, set `VITE_DEMO_ADMIN_EMAIL` and `VITE_DEMO_ADMIN_PASSWORD` in `.env.local` to an existing backend administrator account, then restart the Vite server. The Demo login button is disabled until both values are configured; do not commit real credentials.
