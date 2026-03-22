@echo off
:: Rolemaster PWA — Local development server
:: Double-click this file to launch the PWA in your browser

cd /d "%~dp0"
set PORT=8080

:: Check if port is already in use
netstat -an | findstr ":%PORT% " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo Port %PORT% already in use, trying 8081...
    set PORT=8081
)

echo.
echo  ========================================
echo   Rolemaster PWA - Dev Server
echo   http://localhost:%PORT%
echo  ========================================
echo.
echo  Press Ctrl+C to stop the server.
echo.

:: Open browser
start "" "http://localhost:%PORT%"

:: Launch Python HTTP server (works with Python 3.x on Windows)
python -m http.server %PORT%
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Python not found. Install Python 3 from python.org
    pause
)
