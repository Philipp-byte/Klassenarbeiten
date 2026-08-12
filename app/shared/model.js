/* ==========================================================================
   Datenmodell für Klassenarbeiten.

   Es gibt zwei Fassungen jeder Arbeit:

   • MASTER  (*.jjwsm)  – bleibt bei der Lehrkraft. Enthält Lösungen,
                          Testfälle, Erwartungshorizonte, Punkte.
   • SuS-FASSUNG (*.jjwsp) – wird an die Klasse verteilt. Enthält KEINE
                          Lösungen und KEINE Bewertungstests. Selbst wer die
                          Datei im Texteditor öffnet, findet dort nichts.

   Das ist bewusst so gelöst: Bewertet wird ausschließlich im Lehrer-Werkzeug.
   Damit ist eine Manipulation der Punkte durch die SuS ausgeschlossen.
   ========================================================================== */

export const APP_VERSION = "1.0.0";
export const FORMAT_VERSION = 1;

export const DATEI_ENDUNG = {
  master: "jjwsm", // Master mit Lösungen
  pruefung: "jjwsp", // Fassung für die SuS
  abgabe: "jjwsa", // verschlüsselte Abgabe
  schluessel: "jjwskey", // privater Schlüssel der Lehrkraft
};

/* ------------------------------------------------------------ Aufgabentypen */

export const AUFGABENTYPEN = {
  mc: {
    name: "Multiple Choice",
    kurz: "Auswahl aus vorgegebenen Antworten, einfach oder mehrfach.",
    gruppe: "Wissen",
    auto: true,
  },
  wahrfalsch: {
    name: "Aussagenraster",
    kurz: "Tabelle mit Aussagen und Spalten zum Ankreuzen (wahr/falsch, Geldstrom/Güterstrom …).",
    gruppe: "Wissen",
    auto: true,
  },
  kurzantwort: {
    name: "Kurzantwort",
    kurz: "Wort oder kurzer Ausdruck, Abgleich mit hinterlegten Lösungen.",
    gruppe: "Wissen",
    auto: true,
  },
  stichworte: {
    name: "Antwort mit Stichwörtern",
    kurz: "Fließtext der SuS wird auf hinterlegte Schlüsselbegriffe geprüft, Punkte je Begriff.",
    gruppe: "Wissen",
    auto: true,
  },
  aufzaehlung: {
    name: "Aufzählung („Nenne vier …“)",
    kurz: "Mehrere Eingabefelder, Abgleich gegen Lösungsgruppen mit Synonymen, Punkte je Treffer.",
    gruppe: "Wissen",
    auto: true,
  },
  zuordnung: {
    name: "Zuordnung",
    kurz: "Begriffe der linken Spalte den passenden rechts zuordnen.",
    gruppe: "Wissen",
    auto: true,
  },
  reihenfolge: {
    name: "Reihenfolge",
    kurz: "Elemente in die richtige Abfolge bringen (Ablauf, Rangfolge, Arbeitsschritte).",
    gruppe: "Wissen",
    auto: true,
  },
  lueckentext: {
    name: "Lückentext",
    kurz: "Text mit Lücken; Lösungen in [[doppelten eckigen Klammern]], Alternativen mit |.",
    gruppe: "Wissen",
    auto: true,
  },
  zahl: {
    name: "Zahlenwert",
    kurz: "Numerische Antwort mit einstellbarer Toleranz und Einheit.",
    gruppe: "Rechnen",
    auto: true,
  },
  rechenweg: {
    name: "Rechnung mit Teilergebnissen",
    kurz: "Mehrere benannte Zwischenergebnisse, jedes mit eigenen Punkten und Toleranz.",
    gruppe: "Rechnen",
    auto: true,
  },
  "code-python": {
    name: "Python programmieren",
    kurz: "Code der SuS wird lokal (Pyodide) gegen Unit-Tests ausgeführt.",
    gruppe: "Programmieren",
    auto: true,
  },
  parsons: {
    name: "Code sortieren (Parsons-Puzzle)",
    kurz: "Vorgegebene Codezeilen in die richtige Reihenfolge und Einrückung bringen.",
    gruppe: "Programmieren",
    auto: true,
  },
  "code-web": {
    name: "HTML / CSS / JavaScript",
    kurz: "Seite wird in einem abgeschotteten Rahmen geprüft (DOM, Stil, JS-Ausdrücke).",
    gruppe: "Programmieren",
    auto: true,
  },
  freitext: {
    name: "Freitext",
    kurz: "Wird von der Lehrkraft bewertet – mit Erwartungshorizont und Kriterienraster.",
    gruppe: "Offen",
    auto: false,
  },
};

export const TYP_GRUPPEN = ["Wissen", "Rechnen", "Programmieren", "Offen"];

/* ---------------------------------------------------------------- Hilfsmittel */

export function neueId(praefix = "id") {
  const zufall = crypto.getRandomValues(new Uint8Array(6));
  const teil = Array.from(zufall)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 8);
  return `${praefix}_${Date.now().toString(36)}${teil}`;
}

export function heute() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function datumDeutsch(iso) {
  if (!iso) return "";
  const [j, m, t] = String(iso).slice(0, 10).split("-");
  return t && m && j ? `${t}.${m}.${j}` : iso;
}

/** Dateinamens-tauglicher Text (Umlaute ausgeschrieben, keine Sonderzeichen). */
export function dateiName(text) {
  return (
    (text || "arbeit")
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
      .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue")
      .replace(/ß/g, "ss")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "arbeit"
  );
}

/* -------------------------------------------------------- Neue Objekte bauen */

export function neuePruefung(vorgaben = {}) {
  return {
    typ: "jjws-klassenarbeit-master",
    formatVersion: FORMAT_VERSION,
    id: neueId("ka"),
    titel: "Klassenarbeit 1",
    fach: "Informatik",
    thema: "",
    klasse: "",
    lehrkraft: "",
    schule: "JJWS",
    datum: heute(),
    bearbeitungszeitMin: 45,
    hinweise:
      "Bearbeite die Aufgaben in beliebiger Reihenfolge. Deine Eingaben werden automatisch " +
      "zwischengespeichert. Am Ende auf „Abgeben“ klicken und die Datei im Tauschordner ablegen.",
    hilfsmittel: "Keine.",
    ausgangssituation: "",
    identifikation: "name", // "name" | "nummer"
    mischenProSuS: true, // jede Person bekommt eine eigene Aufgabenreihenfolge
    notenschluessel: null, // null = Standard aus noten.js
    abschnitte: [], // optionale Zwischenüberschriften: {id, titel, vorAufgabeId}
    aufgaben: [],
    geaendertAm: new Date().toISOString(),
    ...vorgaben,
  };
}

export function neueAufgabe(typ) {
  const basis = {
    id: neueId("a"),
    typ,
    titel: "",
    text: "",
    abschnitt: "",
    // Anschluss an die Ausgangssituation – steht vor der Aufgabenstellung
    situationsAnschluss: "",
    handlungsschritt: "",
    punkte: 4,
  };
  switch (typ) {
    case "mc":
      return {
        ...basis,
        mehrfach: false,
        teilpunkte: true,
        mischen: true,
        optionen: [
          { id: neueId("o"), text: "", richtig: true },
          { id: neueId("o"), text: "", richtig: false },
          { id: neueId("o"), text: "", richtig: false },
        ],
      };

    case "wahrfalsch":
      return {
        ...basis,
        punkteProZeile: 1,
        spalten: [
          { id: neueId("s"), text: "wahr" },
          { id: neueId("s"), text: "falsch" },
        ],
        zeilen: [{ id: neueId("z"), text: "", richtig: "" }],
      };

    case "kurzantwort":
      return {
        ...basis,
        punkte: 2,
        loesungen: [""],
        ignoriereGross: true,
        ignoriereLeerzeichen: true,
        alsRegex: false,
        alsCode: false,
      };

    case "stichworte":
      return {
        ...basis,
        punkte: 0,
        zeilen: 5,
        begriffe: [{ id: neueId("b"), varianten: "", punkte: 1 }],
        maxPunkte: 0, // 0 = Summe aller Begriffe
      };

    case "aufzaehlung":
      return {
        ...basis,
        punkte: 0,
        anzahlFelder: 4,
        beschriftung: "Nennung",
        gesucht: [{ id: neueId("g"), varianten: "", punkte: 1 }],
        maxPunkte: 0,
      };

    case "zuordnung":
      return {
        ...basis,
        punkte: 0,
        punkteProPaar: 1,
        mischen: true,
        paare: [
          { id: neueId("p"), links: "", rechts: "" },
          { id: neueId("p"), links: "", rechts: "" },
        ],
      };

    case "reihenfolge":
      return {
        ...basis,
        punkte: 0,
        wertung: "nachbarn", // "nachbarn" = Teilpunkte je korrekter Abfolge, "alles" = alles oder nichts
        punkteProSchritt: 1,
        elemente: [
          { id: neueId("e"), text: "" },
          { id: neueId("e"), text: "" },
          { id: neueId("e"), text: "" },
        ],
      };

    case "lueckentext":
      return {
        ...basis,
        punkte: 0,
        punkteProLuecke: 1,
        ignoriereGross: true,
        alsCode: false,
        vorlage: "Eine Variable wird in Python mit dem Zeichen [[=]] zugewiesen.",
      };

    case "zahl":
      return { ...basis, punkte: 2, loesung: "0", toleranz: 0, einheit: "" };

    case "rechenweg":
      return {
        ...basis,
        punkte: 0,
        schritte: [
          { id: neueId("r"), bezeichnung: "Zwischenergebnis", loesung: "0", toleranz: 0, einheit: "", punkte: 2 },
        ],
      };

    case "code-python":
      return {
        ...basis,
        punkte: 0,
        startcode: "def loese(x):\n    # Deine Lösung hier\n    pass\n",
        loesungscode: "",
        vorlaufcode: "",
        selbsttests: [],
        tests: [neuerPythonTest()],
      };

    case "parsons":
      return {
        ...basis,
        punkte: 0,
        punkteProZeile: 1,
        pruefeEinrueckung: true,
        zeilen: [
          { id: neueId("z"), text: "def gruss(name):", einrueckung: 0 },
          { id: neueId("z"), text: "return f\"Hallo {name}\"", einrueckung: 1 },
        ],
        ablenker: [],
      };

    case "code-web":
      return {
        ...basis,
        punkte: 0,
        startHtml: "<!-- Dein HTML hier -->\n",
        startCss: "/* Dein CSS hier */\n",
        startJs: "// Dein JavaScript hier\n",
        jsAktiv: false,
        loesungHtml: "",
        loesungCss: "",
        loesungJs: "",
        tests: [neuerWebTest()],
      };

    case "freitext":
      return {
        ...basis,
        punkte: 6,
        zeilen: 8,
        erwartungshorizont: "",
        kriterien: [{ id: neueId("k"), text: "", punkte: 2 }],
      };

    default:
      throw new Error(`Unbekannter Aufgabentyp: ${typ}`);
  }
}

export function neuerPythonTest(art = "funktion") {
  const t = { id: neueId("t"), name: "Testfall", punkte: 1, art };
  if (art === "funktion") return { ...t, funktion: "loese", argumente: "", erwartet: "None" };
  if (art === "ausgabe") return { ...t, eingabe: "", erwartet: "" };
  if (art === "enthaelt") return { ...t, muster: "for", vorhanden: true, name: "Schleife verwendet" };
  return { ...t, code: "assert True" };
}

export function neuerWebTest(art = "selektor") {
  const t = { id: neueId("t"), name: "Testfall", punkte: 1, art };
  if (art === "selektor") return { ...t, selektor: "h1", mindestens: 1 };
  if (art === "text") return { ...t, selektor: "h1", erwartet: "", exakt: false };
  if (art === "attribut") return { ...t, selektor: "img", attribut: "alt", erwartet: "", exakt: false };
  if (art === "stil") return { ...t, selektor: "h1", eigenschaft: "color", erwartet: "rgb(0, 52, 77)" };
  return { ...t, ausdruck: "true" };
}

/* ------------------------------------------------------------ Punkteberechnung */

/** Punkte einer Aufgabe – bei zusammengesetzten Typen aus den Teilen berechnet. */
export function aufgabenPunkte(aufgabe) {
  const summe = (liste, feld = "punkte") =>
    (liste || []).reduce((s, x) => s + (Number(x[feld]) || 0), 0);

  switch (aufgabe.typ) {
    case "code-python":
    case "code-web":
      return summe(aufgabe.tests);
    case "wahrfalsch":
      return (aufgabe.zeilen?.length || 0) * (Number(aufgabe.punkteProZeile) || 0);
    case "stichworte": {
      const s = summe(aufgabe.begriffe);
      return aufgabe.maxPunkte > 0 ? Math.min(aufgabe.maxPunkte, s) : s;
    }
    case "aufzaehlung": {
      const s = summe(aufgabe.gesucht);
      const deckel = aufgabe.maxPunkte > 0 ? aufgabe.maxPunkte : s;
      // Es können nie mehr Punkte fallen, als Felder vorhanden sind.
      const felder = Number(aufgabe.anzahlFelder) || 0;
      const proTreffer = (aufgabe.gesucht || []).map((g) => Number(g.punkte) || 0).sort((a, b) => b - a);
      const maxDurchFelder = proTreffer.slice(0, felder).reduce((a, b) => a + b, 0);
      return Math.min(deckel, maxDurchFelder);
    }
    case "zuordnung":
      return (aufgabe.paare?.length || 0) * (Number(aufgabe.punkteProPaar) || 0);
    case "reihenfolge": {
      const n = aufgabe.elemente?.length || 0;
      if (aufgabe.wertung === "alles") return Number(aufgabe.punkte) || 0;
      return Math.max(0, n - 1) * (Number(aufgabe.punkteProSchritt) || 0);
    }
    case "lueckentext":
      return luecken(aufgabe.vorlage).filter((t) => t.art === "luecke").length *
        (Number(aufgabe.punkteProLuecke) || 0);
    case "rechenweg":
      return summe(aufgabe.schritte);
    case "parsons":
      return (aufgabe.zeilen?.length || 0) * (Number(aufgabe.punkteProZeile) || 0);
    case "freitext": {
      const s = summe(aufgabe.kriterien);
      return s > 0 ? s : Number(aufgabe.punkte) || 0;
    }
    default:
      return Number(aufgabe.punkte) || 0;
  }
}

export function gesamtPunkte(pruefung) {
  return runde2((pruefung.aufgaben || []).reduce((s, a) => s + aufgabenPunkte(a), 0));
}

export function runde2(x) {
  return Math.round((Number(x) || 0) * 100) / 100;
}

/* ------------------------------------------------------------ Lückentext-Parser */

/**
 * Zerlegt eine Lückentext-Vorlage in Textstücke und Lücken.
 * Schreibweise: „Der Befehl [[print|print()]] gibt etwas aus.“
 * Mehrere zulässige Lösungen mit | trennen.
 */
export function luecken(vorlage) {
  const teile = [];
  const re = /\[\[(.+?)\]\]/g;
  let letzte = 0;
  let treffer;
  let nr = 0;
  const text = String(vorlage || "");
  while ((treffer = re.exec(text)) !== null) {
    if (treffer.index > letzte) teile.push({ art: "text", inhalt: text.slice(letzte, treffer.index) });
    teile.push({
      art: "luecke",
      index: nr++,
      loesungen: treffer[1].split("|").map((s) => s.trim()).filter(Boolean),
    });
    letzte = treffer.index + treffer[0].length;
  }
  if (letzte < text.length) teile.push({ art: "text", inhalt: text.slice(letzte) });
  return teile;
}

/** Zerlegt eine Varianten-Eingabe („Zins | Zinsen; Zinssatz“) in eine Liste. */
export function varianten(text) {
  return String(text || "")
    .split(/[|;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ---------------------------------------------------- Master → SuS-Fassung */

/**
 * Mischen beim Export. Das ist NICHT dasselbe wie das Mischen pro Person
 * (mischen.js): Hier geht es darum, dass in der ausgelieferten Datei keine
 * Lösung mehr aus der REIHENFOLGE ablesbar ist. Wer die Datei im Editor
 * öffnet, soll auch dann nichts erkennen, wenn er den Quellcode dieser App
 * kennt.
 */
function mischenListe(liste) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Erzeugt aus dem Master die Fassung für die SuS – ohne jede Lösung.
 * @param {object} master
 * @param {object} oeffentlicherSchluessel  JWK der Lehrkraft
 * @param {string} fingerabdruck
 */
export function alsSusFassung(master, oeffentlicherSchluessel, fingerabdruck) {
  const aufgaben = (master.aufgaben || []).map((a, i) => {
    const gemeinsam = {
      id: a.id,
      nr: i + 1,
      typ: a.typ,
      titel: a.titel,
      text: a.text,
      abschnitt: a.abschnitt || "",
      situationsAnschluss: a.situationsAnschluss || "",
      punkte: aufgabenPunkte(a),
    };
    switch (a.typ) {
      case "mc": {
        // Beim Export mischen, damit die Reihenfolge in der Datei nichts verrät.
        // In der App wird zusätzlich pro Person gemischt (mischen.js).
        const optionen = mischenListe(a.optionen).map((o) => ({ id: o.id, text: o.text }));
        return { ...gemeinsam, mehrfach: a.mehrfach, optionen };
      }
      case "wahrfalsch":
        return {
          ...gemeinsam,
          spalten: (a.spalten || []).map((s) => ({ id: s.id, text: s.text })),
          zeilen: (a.zeilen || []).map((z) => ({ id: z.id, text: z.text })),
        };
      case "kurzantwort":
        return { ...gemeinsam, alsCode: !!a.alsCode };
      case "stichworte":
        return { ...gemeinsam, zeilen: a.zeilen };
      case "aufzaehlung":
        return { ...gemeinsam, anzahlFelder: a.anzahlFelder, beschriftung: a.beschriftung };
      case "zuordnung": {
        // Die rechte Spalte bekommt eigene, neutrale Kennungen und eine andere
        // Reihenfolge. Aus der Datei ist damit nicht mehr ablesbar, was
        // zusammengehört – die Zuordnung steht nur im Master.
        const links = mischenListe(a.paare).map((p) => ({ id: p.id, text: p.links }));
        const rechts = mischenListe(a.paare).map((p, i) => ({ id: `r${i}`, text: p.rechts }));
        return { ...gemeinsam, links, rechts };
      }
      case "reihenfolge":
        // Immer gemischt ausliefern – sonst stünde die Lösung schon in der Datei.
        return { ...gemeinsam, elemente: mischenListe(a.elemente).map((e) => ({ id: e.id, text: e.text })) };
      case "lueckentext": {
        // Nur die Struktur übergeben – die Lösungen bleiben im Master.
        const teile = luecken(a.vorlage).map((t) =>
          t.art === "text"
            ? t
            : { art: "luecke", index: t.index, breite: Math.max(6, Math.min(28, (t.loesungen[0] || "").length + 3)) }
        );
        return { ...gemeinsam, teile, alsCode: !!a.alsCode };
      }
      case "zahl":
        return { ...gemeinsam, einheit: a.einheit };
      case "rechenweg":
        return {
          ...gemeinsam,
          schritte: (a.schritte || []).map((s) => ({
            id: s.id,
            bezeichnung: s.bezeichnung,
            einheit: s.einheit,
            punkte: s.punkte,
          })),
        };
      case "code-python":
        return {
          ...gemeinsam,
          startcode: a.startcode,
          vorlaufcode: a.vorlaufcode || "",
          // Selbsttests sind bewusst sichtbar (Lernhilfe), zählen aber nicht.
          selbsttests: (a.selbsttests || []).map((t) => ({ ...t, punkte: 0 })),
        };
      case "parsons": {
        const alle = [
          ...(a.zeilen || []).map((z) => ({ id: z.id, text: z.text })),
          ...(a.ablenker || []).map((z) => ({ id: z.id, text: z.text })),
        ];
        // Gemischt, damit die richtigen Zeilen nicht vor den Ablenkern stehen.
        return { ...gemeinsam, bausteine: mischenListe(alle), pruefeEinrueckung: a.pruefeEinrueckung };
      }
      case "code-web":
        return {
          ...gemeinsam,
          startHtml: a.startHtml,
          startCss: a.startCss,
          startJs: a.startJs,
          jsAktiv: a.jsAktiv,
        };
      case "freitext":
        return { ...gemeinsam, zeilen: a.zeilen };
      default:
        return gemeinsam;
    }
  });

  return {
    typ: "jjws-klassenarbeit",
    formatVersion: FORMAT_VERSION,
    appVersion: APP_VERSION,
    id: master.id,
    titel: master.titel,
    fach: master.fach,
    thema: master.thema,
    klasse: master.klasse,
    lehrkraft: master.lehrkraft,
    schule: master.schule,
    datum: master.datum,
    bearbeitungszeitMin: master.bearbeitungszeitMin,
    hinweise: master.hinweise,
    hilfsmittel: master.hilfsmittel,
    ausgangssituation: master.ausgangssituation,
    situationTitel: master.situationTitel ?? "",
    identifikation: master.identifikation,
    mischenProSuS: master.mischenProSuS !== false,
    gesamtpunkte: gesamtPunkte(master),
    schluessel: { oeffentlich: oeffentlicherSchluessel, fingerabdruck },
    aufgaben,
    erstelltAm: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ Prüfungen */

export function pruefeMaster(master) {
  const probleme = [];
  if (!master.titel?.trim()) probleme.push("Die Arbeit hat keinen Titel.");
  if (!master.aufgaben?.length) probleme.push("Die Arbeit enthält keine Aufgaben.");

  (master.aufgaben || []).forEach((a, i) => {
    const wo = `Aufgabe ${i + 1}`;
    if (!a.text?.trim()) probleme.push(`${wo}: Es fehlt die Aufgabenstellung.`);
    if (aufgabenPunkte(a) <= 0) probleme.push(`${wo}: Es sind 0 Punkte hinterlegt.`);

    switch (a.typ) {
      case "mc":
        if (!a.optionen?.some((o) => o.richtig)) probleme.push(`${wo}: Keine Antwort als richtig markiert.`);
        if (a.optionen?.some((o) => !o.text.trim())) probleme.push(`${wo}: Eine Antwortoption ist leer.`);
        if (!a.mehrfach && a.optionen?.filter((o) => o.richtig).length > 1)
          probleme.push(`${wo}: Einfachauswahl, aber mehrere Antworten sind richtig.`);
        break;
      case "wahrfalsch":
        if ((a.spalten?.length || 0) < 2) probleme.push(`${wo}: Es braucht mindestens zwei Spalten.`);
        if (a.zeilen?.some((z) => !z.text.trim())) probleme.push(`${wo}: Eine Aussage ist leer.`);
        if (a.zeilen?.some((z) => !z.richtig)) probleme.push(`${wo}: Für eine Aussage fehlt die Lösung.`);
        break;
      case "kurzantwort":
        if (!a.loesungen?.some((l) => l.trim())) probleme.push(`${wo}: Es ist keine Lösung hinterlegt.`);
        break;
      case "stichworte":
        if (!a.begriffe?.some((b) => varianten(b.varianten).length))
          probleme.push(`${wo}: Es ist kein Stichwort hinterlegt.`);
        break;
      case "aufzaehlung":
        if (!a.gesucht?.some((g) => varianten(g.varianten).length))
          probleme.push(`${wo}: Es ist keine gesuchte Nennung hinterlegt.`);
        if ((a.gesucht?.length || 0) < (Number(a.anzahlFelder) || 0))
          probleme.push(
            `${wo}: Es gibt ${a.anzahlFelder} Eingabefelder, aber nur ${a.gesucht?.length ?? 0} hinterlegte Lösungen.`
          );
        break;
      case "zuordnung":
        if (a.paare?.some((p) => !p.links.trim() || !p.rechts.trim()))
          probleme.push(`${wo}: Ein Zuordnungspaar ist unvollständig.`);
        break;
      case "reihenfolge":
        if ((a.elemente?.length || 0) < 2) probleme.push(`${wo}: Es braucht mindestens zwei Elemente.`);
        if (a.elemente?.some((e) => !e.text.trim())) probleme.push(`${wo}: Ein Element ist leer.`);
        break;
      case "lueckentext":
        if (!luecken(a.vorlage).some((t) => t.art === "luecke"))
          probleme.push(`${wo}: Der Text enthält keine Lücke in [[doppelten Klammern]].`);
        break;
      case "zahl":
        if (!String(a.loesung).trim()) probleme.push(`${wo}: Es fehlt der Lösungswert.`);
        break;
      case "rechenweg":
        if (!a.schritte?.length) probleme.push(`${wo}: Es ist kein Teilergebnis hinterlegt.`);
        break;
      case "parsons":
        if ((a.zeilen?.length || 0) < 2) probleme.push(`${wo}: Es braucht mindestens zwei Codezeilen.`);
        break;
      case "code-python":
      case "code-web":
        if (!a.tests?.length)
          probleme.push(`${wo}: Kein Testfall hinterlegt – die Aufgabe kann nicht bewertet werden.`);
        break;
      case "freitext":
        if (!a.erwartungshorizont?.trim())
          probleme.push(`${wo}: Hinweis – es ist kein Erwartungshorizont hinterlegt.`);
        break;
    }
  });
  return probleme;
}

/* ---------------------------------------------------------------- Dateihilfen */

export function ladeJsonDatei(datei) {
  return new Promise((fertig, fehler) => {
    const leser = new FileReader();
    leser.onerror = () => fehler(new Error(`Datei „${datei.name}“ konnte nicht gelesen werden.`));
    leser.onload = () => {
      try {
        fertig(JSON.parse(leser.result));
      } catch {
        fehler(new Error(`Datei „${datei.name}“ enthält kein gültiges JSON.`));
      }
    };
    leser.readAsText(datei, "utf-8");
  });
}

export function speichereJson(objekt, name) {
  const blob = new Blob([JSON.stringify(objekt, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  ladeHerunter(blob, name);
}

export function ladeHerunter(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
