/* ==========================================================================
   Web Worker: führt Python über Pyodide aus.

   Warum ein Worker?
   • Der Code der SuS läuft in einer WebAssembly-Sandbox ohne Zugriff auf
     Dateien, Netzwerk oder das Dokument.
   • Eine Endlosschleife blockiert nur diesen Worker. Der Hauptthread kann ihn
     abbrechen (terminate) und einen neuen starten – die Korrektur läuft weiter.

   Pyodide wird lokal aus ../vendor/pyodide/ geladen. Es gibt bewusst KEINEN
   Rückfall auf ein CDN: es soll keine einzige Anfrage nach außen geben.
   ========================================================================== */

/* global importScripts, loadPyodide */

let pyodide = null;
let indexURL = "../vendor/pyodide/"; // Standard: lokale Ablage neben der App

const HARNESS = `
import sys, io, json, traceback, re

def _vergleiche(ist, soll, toleranz):
    if toleranz and isinstance(ist, (int, float)) and isinstance(soll, (int, float)):
        try:
            return abs(float(ist) - float(soll)) <= float(toleranz) + 1e-12
        except Exception:
            return False
    return ist == soll

def _kuerze(text, n=600):
    text = str(text)
    return text if len(text) <= n else text[:n] + " …"

def jjws_test(auftrag_json):
    auftrag = json.loads(auftrag_json)
    vorlauf = auftrag.get("vorlaufcode") or ""
    code = auftrag.get("code") or ""
    test = auftrag.get("test") or {}
    art = test.get("art", "assert")

    # Statische Prüfung ohne Ausführung
    if art == "enthaelt":
        muster = test.get("muster") or ""
        soll_vorhanden = bool(test.get("vorhanden", True))
        try:
            gefunden = re.search(muster, code) is not None
        except re.error:
            gefunden = muster in code
        ok = gefunden == soll_vorhanden
        if ok:
            meldung = ""
        elif soll_vorhanden:
            meldung = "Im Code wurde „%s“ nicht gefunden." % muster
        else:
            meldung = "„%s“ darf im Code nicht vorkommen." % muster
        return json.dumps({"bestanden": ok, "meldung": meldung, "ausgabe": ""})

    ns = {"__name__": "__main__"}
    puffer = io.StringIO()
    alt_out, alt_err, alt_in = sys.stdout, sys.stderr, sys.stdin
    sys.stdout = puffer
    sys.stderr = puffer
    sys.stdin = io.StringIO(test.get("eingabe") or "")

    bestanden = False
    meldung = ""
    try:
        try:
            if vorlauf.strip():
                exec(compile(vorlauf, "<vorlauf>", "exec"), ns)
            exec(compile(code, "<abgabe>", "exec"), ns)
        except SyntaxError as e:
            return json.dumps({
                "bestanden": False,
                "meldung": "Syntaxfehler in Zeile %s: %s" % (e.lineno, e.msg),
                "ausgabe": _kuerze(puffer.getvalue()),
            })
        except SystemExit:
            pass
        except BaseException as e:
            return json.dumps({
                "bestanden": False,
                "meldung": "Fehler beim Ausführen: %s: %s" % (type(e).__name__, e),
                "ausgabe": _kuerze(puffer.getvalue()),
            })

        if art == "funktion":
            name = test.get("funktion") or ""
            if name not in ns:
                meldung = "Die Funktion „%s“ ist nicht definiert." % name
            elif not callable(ns[name]):
                meldung = "„%s“ ist keine Funktion." % name
            else:
                argtext = (test.get("argumente") or "").strip()
                try:
                    args = eval("(" + argtext + ",)" if argtext else "()", {}, {})
                except BaseException as e:
                    return json.dumps({
                        "bestanden": False,
                        "meldung": "Testfall fehlerhaft – Argumente nicht lesbar: %s" % e,
                        "ausgabe": "",
                    })
                try:
                    soll = eval(test.get("erwartet") or "None", {}, {})
                except BaseException as e:
                    return json.dumps({
                        "bestanden": False,
                        "meldung": "Testfall fehlerhaft – Erwartungswert nicht lesbar: %s" % e,
                        "ausgabe": "",
                    })
                try:
                    ist = ns[name](*args)
                except BaseException as e:
                    meldung = "%s(%s) löst einen Fehler aus: %s: %s" % (
                        name, argtext, type(e).__name__, e)
                else:
                    if _vergleiche(ist, soll, test.get("toleranz")):
                        bestanden = True
                    else:
                        meldung = "%s(%s) ergab %r, erwartet war %r" % (name, argtext, ist, soll)

        elif art == "ausgabe":
            ist = puffer.getvalue()
            soll = test.get("erwartet") or ""
            norm = lambda t: "\\n".join(z.rstrip() for z in t.strip().splitlines())
            if norm(ist) == norm(soll):
                bestanden = True
            else:
                meldung = "Ausgabe war %r, erwartet war %r" % (norm(ist), norm(soll))

        else:  # "assert" – freier Prüfcode
            pruefcode = test.get("code") or ""
            try:
                exec(compile(pruefcode, "<test>", "exec"), ns)
                bestanden = True
            except AssertionError as e:
                meldung = "Prüfung nicht bestanden" + (": %s" % e if str(e) else "")
            except BaseException as e:
                meldung = "%s: %s" % (type(e).__name__, e)
    finally:
        sys.stdout, sys.stderr, sys.stdin = alt_out, alt_err, alt_in

    return json.dumps({
        "bestanden": bestanden,
        "meldung": meldung,
        "ausgabe": _kuerze(puffer.getvalue()),
    })


def jjws_ausfuehren(quelltext, eingabe):
    """Freies Ausführen für die SuS („Code testen“) – ohne Bewertung."""
    ns = {"__name__": "__main__"}
    puffer = io.StringIO()
    alt_out, alt_err, alt_in = sys.stdout, sys.stderr, sys.stdin
    sys.stdout = puffer
    sys.stderr = puffer
    sys.stdin = io.StringIO(eingabe or "")
    fehler = ""
    try:
        exec(compile(quelltext, "<abgabe>", "exec"), ns)
    except SyntaxError as e:
        fehler = "Syntaxfehler in Zeile %s: %s" % (e.lineno, e.msg)
    except SystemExit:
        pass
    except BaseException as e:
        zeilen = traceback.format_exception_only(type(e), e)
        fehler = "".join(zeilen).strip()
    finally:
        sys.stdout, sys.stderr, sys.stdin = alt_out, alt_err, alt_in
    return json.dumps({"ausgabe": _kuerze(puffer.getvalue(), 4000), "fehler": fehler})
`;

async function starte(url) {
  if (pyodide) return;
  if (url) indexURL = url; // Demo-Seite darf eine CDN-Adresse vorgeben
  importScripts(indexURL + "pyodide.js");
  pyodide = await loadPyodide({ indexURL });
  pyodide.runPython(HARNESS);
}

self.onmessage = async (e) => {
  const { id, typ, daten, indexURL: url } = e.data || {};
  try {
    if (typ === "start") {
      await starte(url);
      self.postMessage({ id, ok: true, ergebnis: { bereit: true } });
      return;
    }

    await starte(url);

    if (typ === "test") {
      const fn = pyodide.globals.get("jjws_test");
      const roh = fn(JSON.stringify(daten));
      fn.destroy?.();
      self.postMessage({ id, ok: true, ergebnis: JSON.parse(roh) });
      return;
    }

    if (typ === "ausfuehren") {
      const fn = pyodide.globals.get("jjws_ausfuehren");
      const roh = fn(daten.code ?? "", daten.eingabe ?? "");
      fn.destroy?.();
      self.postMessage({ id, ok: true, ergebnis: JSON.parse(roh) });
      return;
    }

    self.postMessage({ id, ok: false, fehler: `Unbekannter Auftrag „${typ}“.` });
  } catch (fehler) {
    self.postMessage({ id, ok: false, fehler: String(fehler?.message || fehler) });
  }
};
