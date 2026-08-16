@echo off
rem ---------------------------------------------------------------------------
rem  Startet einen kleinen Webserver auf DIESEM Rechner (Windows).
rem
rem  Warum ueberhaupt ein Server? Browser verbieten aus Sicherheitsgruenden
rem  einiges, wenn eine Seite per Doppelklick (file://) geoeffnet wird - unter
rem  anderem die Verschluesselung und das Laden der Python-Laufzeit. Ueber
rem  http://localhost funktioniert alles. Der Server ist NUR auf diesem
rem  Rechner erreichbar.
rem ---------------------------------------------------------------------------
setlocal

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8080"
cd /d "%~dp0"

where python >nul 2>&1
if errorlevel 1 (
  echo Fehler: Python wurde nicht gefunden.
  echo Bitte Python von https://www.python.org/downloads/ installieren
  echo und beim Setup "Add Python to PATH" ankreuzen.
  pause
  exit /b 1
)

echo.
echo   Johann-Jakob-Widmann-Schule - Klassenarbeiten
echo   =============================================
echo.
echo   Der Server laeuft. Diese Adressen im Browser oeffnen:
echo.
echo     Lehrkraft-Werkzeug                  http://localhost:%PORT%/app/lehrer/
echo     Pruefungs-App (lokale Reserve)      http://localhost:%PORT%/app/pruefung/
echo.
echo   Die Klasse schreibt normalerweise auf der oeffentlichen SuS-Website:
echo     https://philipp-byte.github.io/Klassenarbeiten/
echo.
echo   Nur auf diesem Rechner erreichbar. Beenden mit Strg+C.
echo.

start "" "http://localhost:%PORT%/app/lehrer/"
python -m http.server %PORT% --bind 127.0.0.1

endlocal
