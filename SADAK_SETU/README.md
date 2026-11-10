# SadakSetu (सड़क सेतु) - Smart Civic Road Maintenance Platform

Complete unified platform consisting of:
1. **SadakSetu_Dashboard**: React Vite Admin Console + Python FastAPI Backend with YOLO11 AI detection.
2. **SadakSetu_Android**: Native Android Citizen Application (Jetpack Compose).

---

## Quick Start (One-Click)

Simply double-click:
```bat
run_sadaksetu.bat
```

This will:
- Check and start the **FastAPI Backend** on `http://127.0.0.1:8001/`
- Check and start the **Web Admin Dashboard** on `http://localhost:5174/`
- Automatically establish high-speed **ADB reverse port forwarding** (`port 8001`) for any connected Android phone
- Print the direct access links without automatically opening the browser.

---

## Access Links & Credentials

- **Admin Dashboard**: [http://localhost:5174/](http://localhost:5174/)
- **Backend API Docs**: [http://localhost:8001/docs](http://localhost:8001/docs)
- **Backend Health Check**: [http://localhost:8001/health](http://localhost:8001/health)

### Demo Administrator Credentials
- **Email**: `admin@sadaksetu.local`
- **Password**: `Admin@SadakSetu1`

---

## Android Citizen App

The pre-compiled, ready-to-run APK is located at:
```
SadakSetu_Android\SadakSetu_v1.0_debug.apk
```

### Installation Options:
1. **One-Click via USB**: Connect your Android device with USB Debugging enabled, then double-click `SadakSetu_Android\install_on_phone.bat`.
2. **Direct APK Transfer**: Copy `SadakSetu_v1.0_debug.apk` to your phone and install directly.
