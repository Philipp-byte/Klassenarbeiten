/* ==========================================================================
   Steuerung des Python-Workers vom Hauptthread aus.

   Kernaufgabe neben dem Ausführen: das Zeitlimit. Läuft ein Auftrag zu lange
   (Endlosschleife, `while True`), wird der Worker hart beendet und ein neuer
   gestartet. Die Korrektur eines Stapels bleibt dadurch bedienbar.
   ========================================================================== */

const WORKER_PFAD = new URL("./py-worker.js", import.meta.url);

/* Pyodide liegt immer neben der App in app/vendor/pyodide/ – lokal durch das
   Skript scripts/pyodide-holen, auf der veröffentlichten SuS-Website durch den
   Bau-Schritt des Veröffentlichungs-Workflows. Es wird nie von fremden Servern
   nachgeladen. */
const LOKALE_QUELLE = new URL("../vendor/pyodide/", import.meta.url).href;

let quelleVersprechen = null;
export function pyodideQuelle() {
  if (!quelleVersprechen) {
    quelleVersprechen = (async () => {
      try {
        const antwort = await fetch(LOKALE_QUELLE + "pyodide.js", { method: "HEAD" });
        if (antwort.ok) return { art: "lokal", url: LOKALE_QUELLE };
      } catch {
        /* fällt auf „nicht vorhanden“ */
      }
      return { art: null, url: null };
    })();
  }
  return quelleVersprechen;
}

export class PythonRunner {
  constructor({ zeitlimitMs = 10000 } = {}) {
    this.zeitlimitMs = zeitlimitMs;
    this.worker = null;
    this.laufendeId = 0;
    this.offen = new Map();
    this.bereit = false;
    this.startFehler = null;
  }

  _erzeugeWorker() {
    this.worker = new Worker(WORKER_PFAD, { type: "classic" });
    this.worker.onmessage = (e) => {
      const { id, ok, ergebnis, fehler } = e.data || {};
      const eintrag = this.offen.get(id);
      if (!eintrag) return;
      this.offen.delete(id);
      clearTimeout(eintrag.uhr);
      ok ? eintrag.fertig(ergebnis) : eintrag.abbruch(new Error(fehler));
    };
    this.worker.onerror = (e) => {
      const meldung =
        e.message?.includes("pyodide") || e.filename?.includes("pyodide")
          ? "Pyodide wurde nicht gefunden. Bitte einmalig scripts/pyodide-holen.sh (bzw. .cmd) ausführen."
          : `Fehler im Python-Worker: ${e.message || "unbekannt"}`;
      this.startFehler = meldung;
      for (const [, eintrag] of this.offen) {
        clearTimeout(eintrag.uhr);
        eintrag.abbruch(new Error(meldung));
      }
      this.offen.clear();
    };
  }

  async _sende(typ, daten, zeitlimitMs = this.zeitlimitMs) {
    if (!this.worker) this._erzeugeWorker();
    const id = ++this.laufendeId;
    return new Promise((fertig, abbruch) => {
      const uhr = setTimeout(() => {
        this.offen.delete(id);
        this.neustart();
        abbruch(new ZeitUeberschreitung(zeitlimitMs));
      }, zeitlimitMs);
      this.offen.set(id, { fertig, abbruch, uhr });
      this.worker.postMessage({ id, typ, daten, indexURL: this.indexURL });
    });
  }

  /** Klärt, woher Pyodide kommt; wirft eine verständliche Meldung, wenn nirgends. */
  async _quelleKlaeren() {
    if (this.indexURL) return this.indexURL;
    const quelle = await pyodideQuelle();
    if (!quelle.url) {
      throw new Error(
        "Pyodide wurde nicht gefunden. Bitte einmalig scripts/pyodide-holen.sh (bzw. .cmd) ausführen."
      );
    }
    this.indexURL = quelle.url;
    return quelle.url;
  }

  /** Lädt Pyodide vor (dauert ein paar Sekunden) – vor dem Stapellauf sinnvoll. */
  async vorbereiten(zeitlimitMs = 60000) {
    await this._quelleKlaeren();
    await this._sende("start", null, zeitlimitMs);
    this.bereit = true;
    this.startFehler = null;
  }

  neustart() {
    try {
      this.worker?.terminate();
    } catch {
      /* egal */
    }
    this.worker = null;
    this.bereit = false;
    for (const [, eintrag] of this.offen) {
      clearTimeout(eintrag.uhr);
      eintrag.abbruch(new Error("Der Python-Worker wurde neu gestartet."));
    }
    this.offen.clear();
  }

  beenden() {
    this.neustart();
  }

  /** Führt Code aus und liefert die Ausgabe – für den Knopf „Code ausführen“. */
  async ausfuehren(code, eingabe = "", zeitlimitMs = this.zeitlimitMs) {
    try {
      await this._quelleKlaeren();
      return await this._sende("ausfuehren", { code, eingabe }, zeitlimitMs);
    } catch (fehler) {
      if (fehler instanceof ZeitUeberschreitung) {
        return {
          ausgabe: "",
          fehler:
            `Das Programm lief länger als ${Math.round(zeitlimitMs / 1000)} Sekunden und wurde abgebrochen. ` +
            "Prüfe, ob eine Schleife nie endet.",
        };
      }
      return { ausgabe: "", fehler: String(fehler.message || fehler) };
    }
  }

  /**
   * Führt einen einzelnen Testfall aus.
   * @returns {{id:string, bestanden:boolean, meldung:string, ausgabe:string}}
   */
  async test(aufgabe, code, testfall, zeitlimitMs = this.zeitlimitMs) {
    const auftrag = {
      vorlaufcode: aufgabe.vorlaufcode || "",
      code: code || "",
      test: testfall,
    };
    try {
      await this._quelleKlaeren();
      const r = await this._sende("test", auftrag, zeitlimitMs);
      return { id: testfall.id, ...r };
    } catch (fehler) {
      if (fehler instanceof ZeitUeberschreitung) {
        return {
          id: testfall.id,
          bestanden: false,
          meldung: `Zeitüberschreitung nach ${Math.round(zeitlimitMs / 1000)} s – vermutlich eine Endlosschleife.`,
          ausgabe: "",
        };
      }
      return { id: testfall.id, bestanden: false, meldung: String(fehler.message || fehler), ausgabe: "" };
    }
  }

  /** Führt alle Testfälle einer Aufgabe nacheinander aus. */
  async alleTests(aufgabe, code, tests = null, zeitlimitMs = this.zeitlimitMs) {
    const liste = tests ?? aufgabe.tests ?? [];
    const ergebnisse = [];
    for (const t of liste) {
      ergebnisse.push(await this.test(aufgabe, code, t, zeitlimitMs));
    }
    return ergebnisse;
  }
}

export class ZeitUeberschreitung extends Error {
  constructor(ms) {
    super(`Zeitlimit von ${ms} ms überschritten.`);
    this.name = "ZeitUeberschreitung";
  }
}

/** Liegt Pyodide neben der App (app/vendor/pyodide/)? */
export async function pyodideVorhanden() {
  return (await pyodideQuelle()).art !== null;
}
