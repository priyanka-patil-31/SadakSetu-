# 🚧 SadakSetu
### AI-Powered Road Safety, Pothole Detection & Monitoring System

<p align="center">
  An intelligent road monitoring platform that combines Artificial Intelligence, Computer Vision, GPS technology, web applications, and mobile technology to support safer roads.
</p>

---

## 📌 About the Project

**SadakSetu** is an intelligent road-safety complaint and pothole monitoring system developed to identify damaged road surfaces and support efficient road maintenance.

The platform uses the **YOLO11 object detection model** to identify potholes from uploaded road images and live camera input. It provides visual detection results through bounding boxes and confidence scores, with GPS-based location support for tracking detected potholes.

SadakSetu integrates three major components:

- A React-based web dashboard for monitoring and administration.
- A FastAPI backend for API services, AI processing, and data management.
- An Android citizen application for mobile access and road reporting.

The system uses PostgreSQL with PostGIS to support structured data storage and geographical information management.

## ✨ Key Features

### Artificial Intelligence
- YOLO11-based pothole detection.
- Image-based pothole identification.
- Bounding box visualization.
- Detection confidence scores.

### Road Monitoring
- Road image upload.
- Live camera capture.
- GPS-based location tracking.
- Detection history management.

### Web Dashboard
- Centralized administrative dashboard.
- Detection monitoring.
- Image and complaint management.
- Backend API integration.

### Android Application
- Mobile citizen application.
- Road image capture and upload.
- Backend connectivity.
- Mobile-based pothole reporting.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Programming Language | TypeScript |
| Build Tool | Vite |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| Geospatial Extension | PostGIS |
| AI Model | YOLO11 |
| Mobile Platform | Android |
| API Architecture | REST API |
| Database Migrations | Alembic |

## 🏗️ System Architecture

```text
        CITIZEN / ADMIN
               |
       +-------+-------+
       |               |
   WEB DASHBOARD   ANDROID APP
       |               |
       +-------+-------+
               |
          FASTAPI
          BACKEND
               |
       +-------+-------+
       |               |
   YOLO11 AI       DATABASE
   DETECTION      PostgreSQL
       |           + PostGIS
       |
  DETECTION RESULTS
       |
  BOUNDING BOXES
  CONFIDENCE SCORES
  GPS LOCATION
```

## 📂 Project Structure

```text
SadakSetu/
│
├── src/
│   └── React Web Dashboard
│
├── backend/
│   ├── app/
│   │   ├── API Services
│   │   ├── Database Models
│   │   └── AI Services
│   └── migrations/
│
├── android/
│   └── Android Citizen Application
│
├── public/
│   └── Web Assets and Logo
│
├── run_sadaksetu.bat
├── package.json
├── .env.example
└── README.md
```

## ⚙️ Installation Requirements

Before running SadakSetu, install the following:

- Node.js and npm
- Python
- PostgreSQL
- PostGIS extension
- Android Studio
- Android SDK and ADB
- Git

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/priyanka-patil-31/SadakSetu-.git
```

Navigate into the project:

```bash
cd SadakSetu-
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Configure the Backend

Create the backend environment file using the provided example:

```bash
cd backend
```

Create `.env` from `.env.example` and configure your PostgreSQL/PostGIS database credentials.

Run database migrations:

```bash
python -m alembic upgrade head
```

Start the FastAPI server:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Backend URL:

```text
http://localhost:8001
```

### 4. Start the Web Dashboard

Open another terminal at the project root:

```bash
npm run dev
```

Web Dashboard:

```text
http://localhost:5174
```

### 5. Run the Android Application

Connect your Android device through USB debugging or configure an Android emulator.

Navigate to the Android directory:

```bash
cd android
```

Build the application:

```bash
gradlew.bat :app:assembleDebug -PsadaksetuApiBaseUrl=http://YOUR_LAN_IP:8001/
```

Install the generated APK:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Replace `YOUR_LAN_IP` with your computer's local network IP address.

## 🖥️ One-Click Windows Launcher

SadakSetu includes a Windows batch launcher:

```text
run_sadaksetu.bat
```

Double-click this file from the project root to launch the configured application services.

The launcher is designed to start:

| Service | Local Address |
|---|---|
| FastAPI Backend | http://localhost:8001 |
| React Dashboard | http://localhost:5174 |
| Android Application | Build and installation through ADB |

The computer and Android device should be connected to the same Wi-Fi network for LAN-based communication.

If automatic network detection selects the wrong address, configure `SADAKSETU_LAN_IP`.

## 🔐 Environment Configuration

The project uses environment variables for application configuration.

For the frontend, copy:

```text
.env.example
```

to:

```text
.env.local
```

For backend configuration, create:

```text
backend/.env
```

Configure the appropriate database credentials, API settings, and administrator login details.

For local demo login, the following variables can be configured:

```env
VITE_DEMO_ADMIN_EMAIL=
VITE_DEMO_ADMIN_PASSWORD=
```

**Security Notice:** Never upload actual passwords, API keys, database credentials, or private environment files to a public GitHub repository.

## 📸 Application Screenshots

Add your actual project screenshots here as development progresses.

Suggested screenshots:

- Web Dashboard
- Login Page
- Live Pothole Detection
- Image Upload
- Detection Results
- Detection History
- Android Application
- Administrative Dashboard

Example:

```markdown
![Dashboard](screenshots/dashboard.png)
![Detection](screenshots/detection.png)
```

## 🎯 Project Objectives

- Automate pothole identification using Artificial Intelligence.
- Improve road condition monitoring.
- Support GPS-based pothole location tracking.
- Provide a centralized road monitoring dashboard.
- Enable citizens to report road damage through a mobile application.
- Support efficient road maintenance and road safety management.

## 🔮 Future Enhancements

- Advanced road damage classification.
- Real-time road monitoring.
- Interactive geographical pothole visualization.
- Automated complaint prioritization.
- Improved detection accuracy.
- Cloud-based deployment and scalability.
- Advanced analytics and reporting.

## 👩‍💻 Project Information

**Project Name:** SadakSetu

**Project Category:** Artificial Intelligence, Computer Vision and Full-Stack Application Development

**Primary Application:** Road Safety and Pothole Monitoring

**AI Model:** YOLO11

**Development Purpose:** Academic and educational project.

## 📄 License

This project is developed for academic and educational purposes. Licensing and reuse permissions should be defined before external distribution.

---

<p align="center">
  <b>SadakSetu – Building Smarter Roads Through Artificial Intelligence.</b>
</p>
