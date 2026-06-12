@echo off
setlocal

cd /d "%~dp0"

echo Starting Anya Baby Tracker at http://localhost:4173/
echo Close the server window when you are done testing.

start "Anya Baby Tracker Server" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve-localhost.ps1"
timeout /t 2 /nobreak >nul
start "" "http://localhost:4173/"

endlocal
