#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Startet einen kleinen Webserver auf DIESEM Rechner.
#
# Warum überhaupt ein Server? Browser verbieten aus Sicherheitsgründen einiges,
# wenn eine Seite per Doppelklick (file://) geöffnet wird – unter anderem die
# Verschlüsselung und das Laden der Python-Laufzeit. Über http://localhost
# funktioniert alles. Der Server ist NUR auf diesem Rechner erreichbar.
# ---------------------------------------------------------------------------
set -euo pipefail

PORT="${1:-${JJWS_PORT:-8080}}"
WURZEL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Fehler: python3 wurde nicht gefunden." >&2
  echo "Alternativ: 'npx serve' im Projektordner ausführen." >&2
  exit 1
fi

cat <<INFO

  Johann-Jakob-Widmann-Schule – Klassenarbeiten
  =============================================

  Der Server läuft. Diese Adressen im Browser öffnen:

    Lehrkraft-Werkzeug                  http://localhost:$PORT/app/lehrer/
    Prüfungs-App (lokale Reserve)       http://localhost:$PORT/app/pruefung/

  Die Klasse schreibt normalerweise auf der öffentlichen SuS-Website:
    https://philipp-byte.github.io/Klassenarbeiten/

  Nur auf diesem Rechner erreichbar. Beenden mit Strg+C.

INFO

exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WURZEL"
