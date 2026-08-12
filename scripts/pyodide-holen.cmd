@echo off
rem ---------------------------------------------------------------------------
rem  Holt Pyodide einmalig auf diesen Rechner (Windows).
rem
rem  Pyodide ist die Python-Laufzeit fuer die Programmieraufgaben im Browser.
rem  Sie wird lokal abgelegt, damit im Unterricht und bei der Korrektur keine
rem  Anfrage ins Internet geht.
rem
rem  Aufruf:  scripts\pyodide-holen.cmd [version]
rem ---------------------------------------------------------------------------
setlocal

set "VERSION=%~1"
if "%VERSION%"=="" set "VERSION=0.26.4"

set "WURZEL=%~dp0.."
set "ZIEL=%WURZEL%\app\vendor\pyodide"
set "ARCHIV=pyodide-core-%VERSION%.tar.bz2"
set "URL=https://github.com/pyodide/pyodide/releases/download/%VERSION%/%ARCHIV%"

echo Pyodide %VERSION% wird geholt ...
echo   Quelle: %URL%
echo   Ziel:   %ZIEL%
echo.

if not exist "%ZIEL%" mkdir "%ZIEL%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$tmp = Join-Path $env:TEMP ('pyodide_' + [guid]::NewGuid());" ^
  "New-Item -ItemType Directory -Path $tmp | Out-Null;" ^
  "$archiv = Join-Path $tmp '%ARCHIV%';" ^
  "Write-Host 'Lade herunter ...';" ^
  "Invoke-WebRequest -Uri '%URL%' -OutFile $archiv;" ^
  "Write-Host 'Entpacke ...';" ^
  "tar -xjf $archiv -C $tmp;" ^
  "Copy-Item -Path (Join-Path $tmp 'pyodide\*') -Destination '%ZIEL%' -Recurse -Force;" ^
  "Remove-Item -Recurse -Force $tmp;"

if errorlevel 1 (
  echo.
  echo Fehler beim Holen von Pyodide.
  echo Pruefe die Internetverbindung oder lade das Archiv von Hand herunter:
  echo   %URL%
  echo und entpacke den Inhalt des Ordners "pyodide" nach:
  echo   %ZIEL%
  exit /b 1
)

if exist "%ZIEL%\pyodide.js" (
  echo.
  echo Fertig. Pyodide liegt jetzt lokal in app\vendor\pyodide.
  echo Ab jetzt laufen die Python-Aufgaben ohne Internetverbindung.
) else (
  echo.
  echo Etwas ist schiefgelaufen - pyodide.js fehlt.
  exit /b 1
)

endlocal
