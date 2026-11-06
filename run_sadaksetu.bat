@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem SadakSetu Windows launcher
rem Starts the FastAPI backend, Vite dashboard, and Android debug build/install.

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "ANDROID=%SADAKSETU_ANDROID_DIR%"
if not defined ANDROID set "ANDROID=%ROOT%android"
if not exist "%ANDROID%\gradlew.bat" if exist "%ROOT%..\Android Application\gradlew.bat" set "ANDROID=%ROOT%..\Android Application"
if not exist "%ANDROID%\gradlew.bat" if exist "%ROOT%..\android\gradlew.bat" set "ANDROID=%ROOT%..\android"
set "PYTHON=%BACKEND%\.venv\Scripts\python.exe"
set "API_PORT=8001"
set "WEB_PORT=5174"

rem Set SADAKSETU_LAN_IP manually if Windows chooses the wrong network adapter.
set "LAN_IP=%SADAKSETU_LAN_IP%"
if not defined LAN_IP (
    for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /i "IPv4"') do if not defined LAN_IP set "LAN_IP=%%A"
    set "LAN_IP=!LAN_IP: =!"
)
if not defined LAN_IP set "LAN_IP=127.0.0.1"
set "ANDROID_API_URL=http://%LAN_IP%:%API_PORT%/"

if not exist "%PYTHON%" (
    where py >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Python Launcher was not found. Install Python 3.12 and enable "Add python.exe to PATH".
        pause
        exit /b 1
    )
    echo Creating the Python 3.12 virtual environment...
    py -3.12 -m venv "%BACKEND%\.venv"
    if errorlevel 1 (
        echo [ERROR] Could not create the backend virtual environment.
        pause
        exit /b 1
    )
    echo Installing backend dependencies...
    "%PYTHON%" -m pip install -r "%BACKEND%\requirements.txt"
    if errorlevel 1 (
        echo [ERROR] Backend dependency installation failed.
        pause
        exit /b 1
    )
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js/npm was not found on PATH.
    echo Install Node.js LTS, then run this file again.
    pause
    exit /b 1
)

if not exist "%ROOT%node_modules" (
    echo Installing frontend dependencies...
    pushd "%ROOT%"
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] Frontend dependency installation failed.
        pause
        exit /b 1
    )
    popd
)

if not exist "%BACKEND%\.env" (
    if exist "%BACKEND%\.env.example" (
        copy /Y "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
        echo Created backend\.env from backend\.env.example.
    )
)

echo Starting SadakSetu backend and frontend...

set "API_READY="
curl.exe --silent --fail --max-time 2 http://127.0.0.1:%API_PORT%/health | findstr /C:"SadakSetu API" >nul 2>&1
if not errorlevel 1 set "API_READY=1"

if not defined API_READY (
    start "SadakSetu Backend" /D "%BACKEND%" cmd /k "set AI_MODEL_PATH=models/baseline_yolo11.pt && .venv\Scripts\python.exe -m alembic -c alembic.ini upgrade head && .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port %API_PORT%"
    for /L %%A in (1,1,60) do (
        if not defined API_READY (
            curl.exe --silent --fail --max-time 2 http://127.0.0.1:%API_PORT%/health | findstr /C:"SadakSetu API" >nul 2>&1
            if not errorlevel 1 set "API_READY=1"
            if not defined API_READY timeout /t 2 /nobreak >nul
        )
    )
)

if not defined API_READY (
    echo [ERROR] The SadakSetu API did not become ready on port %API_PORT%.
    echo Check the SadakSetu Backend window for the startup error, then run this file again.
    pause
    exit /b 1
)

echo SadakSetu API is ready.
start "SadakSetu Web Dashboard" /D "%ROOT%" cmd /k "set ""VITE_API_BASE_URL=/api/v1"" && npm run dev -- --host 0.0.0.0 --port %WEB_PORT%"

if not exist "%ANDROID%\gradlew.bat" (
    echo [WARN] Android project was not found at:
    echo        %ANDROID%
    echo Set SADAKSETU_ANDROID_DIR to the correct Windows Android project path if needed.
) else (
    where adb >nul 2>&1
    if errorlevel 1 (
        echo [WARN] adb was not found on PATH. Android APK will be built but not installed.
        start "SadakSetu Android Build" /D "%ANDROID%" cmd /k "call gradlew.bat -PsadaksetuApiBaseUrl=!ANDROID_API_URL! :app:assembleDebug"
    ) else (
        start "SadakSetu Android" /D "%ANDROID%" cmd /k "call gradlew.bat -PsadaksetuApiBaseUrl=!ANDROID_API_URL! :app:assembleDebug && adb install -r app\build\outputs\apk\debug\app-debug.apk && adb shell monkey -p com.sadaksetu.debug -c android.intent.category.LAUNCHER 1"
    )
)

echo.
echo SadakSetu is starting in separate Command Prompt windows.
echo Web dashboard: http://localhost:%WEB_PORT%
echo Network dashboard: http://%LAN_IP%:%WEB_PORT%
echo Backend docs: http://localhost:%API_PORT%/docs
echo Backend health: http://localhost:%API_PORT%/health
echo Android API URL: %ANDROID_API_URL%
echo.
echo Close the SadakSetu Command Prompt windows to stop the project.

endlocal
