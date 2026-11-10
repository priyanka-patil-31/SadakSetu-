@echo off
setlocal EnableExtensions EnableDelayedExpansion

title SadakSetu Platform Launcher

echo ===============================================================
echo                SADAKSETU PLATFORM LAUNCHER
echo ===============================================================
echo.

set "ROOT=%~dp0"

if exist "%ROOT%SadakSetu\backend\.venv\Scripts\python.exe" (
    set "WEB_DIR=%ROOT%SadakSetu"
    set "BACKEND_DIR=%ROOT%SadakSetu\backend"
) else (
    set "WEB_DIR=%ROOT%"
    set "BACKEND_DIR=%ROOT%backend"
)

set "PYTHON=%BACKEND_DIR%\.venv\Scripts\python.exe"
set "API_PORT=8001"
set "WEB_PORT=5174"

if not exist "%PYTHON%" goto :err_python

rem Detect Wi-Fi or Ethernet LAN IPv4 address
set "LAN_IP="
for /f "usebackq tokens=*" %%I in (`powershell -NoProfile -Command "@(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*','Ethernet*' -ErrorAction SilentlyContinue)[0].IPAddress"`) do (
    set "LAN_IP=%%I"
)
if not defined LAN_IP set "LAN_IP=127.0.0.1"

rem 1. Check / Start Backend API
curl.exe --silent --fail --max-time 1 http://127.0.0.1:%API_PORT%/health >nul 2>&1
if not errorlevel 1 (
    echo [*] Backend API is already running on port %API_PORT%.
) else (
    echo [*] Starting Backend API on port %API_PORT%...
    start "SadakSetu Backend API" /D "%BACKEND_DIR%" cmd /k "set AI_MODEL_PATH=models/baseline_yolo11.pt && .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port %API_PORT%"
    for /L %%A in (1,1,20) do (
        curl.exe --silent --fail --max-time 1 http://127.0.0.1:%API_PORT%/health >nul 2>&1
        if not errorlevel 1 goto :backend_up
        ping -n 2 127.0.0.1 >nul
    )
)
:backend_up
echo [OK] Backend API is online.

rem 2. Check / Start Web Admin Dashboard
curl.exe --silent --fail --max-time 1 http://127.0.0.1:%WEB_PORT%/ >nul 2>&1
if not errorlevel 1 (
    echo [*] Web Admin Dashboard is already running on port %WEB_PORT%.
) else (
    echo [*] Starting Web Admin Dashboard on port %WEB_PORT%...
    start "SadakSetu Web Dashboard" /D "%WEB_DIR%" cmd /k "set ""VITE_API_BASE_URL=/api/v1"" && npm run dev -- --host 0.0.0.0 --port %WEB_PORT%"
    for /L %%A in (1,1,15) do (
        curl.exe --silent --fail --max-time 1 http://127.0.0.1:%WEB_PORT%/ >nul 2>&1
        if not errorlevel 1 goto :web_up
        ping -n 2 127.0.0.1 >nul
    )
)
:web_up
echo [OK] Web Dashboard is online.

rem 3. Configure ADB reverse tunnel for connected Android device
set "ADB_CMD="
where adb >nul 2>&1
if not errorlevel 1 (
    set "ADB_CMD=adb"
) else if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set "ADB_CMD=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
)
if defined ADB_CMD (
    "%ADB_CMD%" reverse tcp:%API_PORT% tcp:%API_PORT% >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Android ADB reverse port forwarding active on port %API_PORT%.
    )
)

echo.
echo ===============================================================
echo                 SADAKSETU PLATFORM IS READY
echo ===============================================================
echo.
echo   Web Admin Dashboard : http://localhost:%WEB_PORT%/
echo   Network Dashboard   : http://%LAN_IP%:%WEB_PORT%/
echo   Backend API Health  : http://localhost:%API_PORT%/health
echo   Backend Swagger Docs: http://localhost:%API_PORT%/docs
echo.
echo   Demo Admin Login:
echo     Email   : admin@sadaksetu.local
echo     Password: Admin@SadakSetu1
echo.
echo ===============================================================
echo   Note: Browser was not opened automatically.
echo   Open your browser and navigate to: http://localhost:%WEB_PORT%/
echo ===============================================================
echo.
echo Press any key to close this launcher window (services keep running)...
pause >nul
exit /b 0

:err_python
echo [ERROR] Python backend environment was not found at:
echo         %PYTHON%
pause
exit /b 1
