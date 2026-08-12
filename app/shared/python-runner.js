/* ==========================================================================
   Steuerung des Python-Workers vom Hauptthread aus.

   Kernaufgabe neben dem Ausführen: das Zeitlimit. Läuft ein Auftrag zu lange
   (Endlosschleife, `while True`), wird der Worker hart beendet und ein neuer
   gestartet. Die Korrektur eines Stapels bleibt dadurch bedienbar.
   ========================================================================== */

const WORKER_PFAD = new URL("./py-worker.js", import.meta.url);

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
      this.worker.postMessage({ id, typ, daten });
    });
  }

  /** Lädt Pyodide vor (dauert ein paar Sekunden) – vor dem Stapellauf sinnvoll. */
  async vorbereiten(zeitlimitMs = 60000) {
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

/** Prüft, ob Pyodide lokal vorliegt – für eine verständliche Fehlermeldung. */
export async function pyodideVorhanden() {
  try {
    const antwort = await fetch(new URL("../vendor/pyodide/pyodide.js", import.meta.url), {
      method: "HEAD",
    });
    return antwort.ok;
  } catch {
    return false;
  }
}
