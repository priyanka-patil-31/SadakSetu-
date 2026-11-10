@echo off
setlocal EnableExtensions EnableDelayedExpansion

title SadakSetu Android APK Installer

echo ===============================================================
echo             SADAKSETU ANDROID APP INSTALLER
echo ===============================================================
echo.

set "ROOT=%~dp0"
set "APK=%ROOT%SadakSetu_v1.0_debug.apk"
set "ADB_CMD="

where adb >nul 2>&1
if not errorlevel 1 (
    set "ADB_CMD=adb"
) else if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set "ADB_CMD=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
)

if not defined ADB_CMD (
    echo [ERROR] Android Debug Bridge (adb.exe) was not found.
    echo Please install Android platform-tools or enable USB debugging.
    echo You can also directly transfer SadakSetu_v1.0_debug.apk to your phone and install it.
    echo.
    pause
    exit /b 1
)

echo [*] Checking connected Android devices...
"%ADB_CMD%" devices
echo.

echo [*] Installing SadakSetu APK onto connected device...
"%ADB_CMD%" install -r "%APK%"
if errorlevel 1 (
    echo [ERROR] Installation failed. Ensure your phone is connected and USB Debugging is authorized.
    pause
    exit /b 1
)

echo.
echo [*] Setting up high-speed USB reverse port forwarding (port 8001)...
"%ADB_CMD%" reverse tcp:8001 tcp:8001 >nul 2>&1

echo [*] Launching SadakSetu on device...
"%ADB_CMD%" shell monkey -p com.sadaksetu.debug -c android.intent.category.LAUNCHER 1 >nul 2>&1

echo.
echo ===============================================================
echo        SUCCESS: SadakSetu is installed and launched!
echo ===============================================================
echo.
pause
endlocal
