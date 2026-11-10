# SadakSetu Android

Citizen Android client for the existing SadakSetu road-damage complaint platform.

The app icon uses the supplied Navy Shield Road Safety logo at `app/src/main/res/drawable/sadaksetu_logo.png`.

Debug builds can show a Demo login button when `SADAKSETU_DEMO_EMAIL` and `SADAKSETU_DEMO_PASSWORD` are supplied at build time. These values are injected into the debug APK only and must never be used for a production release.

## Mobile options

The profile screen includes persistent Dark theme and Notifications preferences. Dark theme uses a dedicated Material 3 dark color scheme, while light theme remains the default. Complaint submission shows a staged progress bar for complaint creation, photo upload, and finalization.

## Repository location

This Android project is included in the main SadakSetu repository under `android/`.
The web dashboard is in the repository root and the FastAPI backend is in `backend/`.

## Build

The project uses Gradle 9.1, Android Gradle Plugin 8.13, Kotlin 2.2, Jetpack Compose, and minSdk 26.

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew :app:assembleDebug
```

The debug build defaults to the current SadakSetu LAN API URL `http://10.158.17.214:8001/` for a phone and dashboard on the same Wi-Fi network. Override it without editing source with `-PsadaksetuApiBaseUrl=http://<laptop-lan-ip>:8001/`.
The laptop backend must listen on `0.0.0.0:8001`; the Vite dashboard must listen on `0.0.0.0:5174`. This supports offline same-network operation and does not require USB reverse tethering or internet access.
For a deployed backend, use an HTTPS URL.
Cleartext traffic is enabled only because the default is local development; production builds must use HTTPS.

## Backend contract

The client uses the `/api/v1` endpoints documented in `backend/`:

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `GET/PATCH /users/me`
- `GET/POST /complaints`, `GET /complaints/{id}`, `GET /complaints/{id}/history`
- `POST/GET /complaints/{id}/images`
- `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all`

No duplicate backend or Docker configuration is included.

## Documentation

Architecture and Android compatibility notes are in [`docs/`](docs/).
