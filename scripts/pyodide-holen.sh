#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Holt Pyodide einmalig auf diesen Rechner.
#
# Pyodide ist die Python-Laufzeit, mit der die Programmieraufgaben im Browser
# ausgeführt werden. Sie wird bewusst LOKAL abgelegt: im Unterricht und bei der
# Korrektur soll keine einzige Anfrage ins Internet gehen.
#
# Aufruf:   ./scripts/pyodide-holen.sh [version]
# Beispiel: ./scripts/pyodide-holen.sh 0.26.4
# ---------------------------------------------------------------------------
set -euo pipefail

VERSION="${1:-${PYODIDE_VERSION:-0.26.4}}"
WURZEL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIEL="$WURZEL/app/vendor/pyodide"
ARCHIV="pyodide-core-$VERSION.tar.bz2"
URL="https://github.com/pyodide/pyodide/releases/download/$VERSION/$ARCHIV"

echo "Pyodide $VERSION wird geholt …"
echo "  Quelle: $URL"
echo "  Ziel:   $ZIEL"
echo

if [ -f "$ZIEL/pyodide.js" ]; then
  echo "Es liegt bereits eine Fassung in $ZIEL."
  read -r -p "Überschreiben? [j/N] " antwort
  case "$antwort" in
    j|J|y|Y) ;;
    *) echo "Abgebrochen."; exit 0 ;;
  esac
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if command -v curl >/dev/null 2>&1; then
  curl -L --fail --progress-bar -o "$TMP/$ARCHIV" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -q --show-progress -O "$TMP/$ARCHIV" "$URL"
else
  echo "Fehler: weder curl noch wget gefunden." >&2
  exit 1
fi

mkdir -p "$ZIEL"
tar -xjf "$TMP/$ARCHIV" -C "$TMP"
# Das Archiv enthält einen Ordner „pyodide“ – dessen Inhalt wollen wir.
cp -r "$TMP/pyodide/." "$ZIEL/"

echo
if [ -f "$ZIEL/pyodide.js" ] && [ -f "$ZIEL/pyodide.asm.wasm" ]; then
  GROESSE="$(du -sh "$ZIEL" | cut -f1)"
  echo "Fertig. Pyodide liegt jetzt lokal in app/vendor/pyodide ($GROESSE)."
  echo "Ab jetzt laufen die Python-Aufgaben ohne Internetverbindung."
else
  echo "Etwas ist schiefgelaufen – pyodide.js oder pyodide.asm.wasm fehlt." >&2
  exit 1
fi
