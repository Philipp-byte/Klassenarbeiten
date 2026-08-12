/* ==========================================================================
   Korrektur der Abgaben.

   Ablauf
     1. Klassenarbeit (Master) auswählen – nur damit lassen sich Lösungen prüfen
     2. Abgabedateien (*.jjwsa) aus dem Tauschordner hereinziehen
     3. Entschlüsseln, automatisch bewerten (inkl. Python- und Web-Tests)
     4. Freitexte von Hand bewerten, Punkte bei Bedarf überschreiben
     5. Notenliste, korrigierte Arbeiten als PDF, CSV für die Notenverwaltung

   Die entschlüsselten Abgaben leben nur im Arbeitsspeicher dieses Tabs.
   Beim Schließen sind sie weg – das ist Absicht.
   ========================================================================== */

import { el, meldung, frage, dateiWaehlen, ablageFlaeche } from "../shared/dom.js";
import {
  ladeJsonDatei,
  ladeHerunter,
  dateiName,
  aufgabenPunkte,
  gesamtPunkte,
  AUFGABENTYPEN,
  DATEI_ENDUNG,
  runde2,
} from "../shared/model.js";
import { entschluesseln } from "../shared/crypto.js";
import { bewerteAufgabe, ergebnisAusTests, summiere } from "../shared/bewertung.js";
import { notePunkte, formatNote, formatPunkte, statistik, standardSchluessel } from "../shared/noten.js";
import { masterListe, masterLaden } from "../shared/speicher.js";
import { schluessel, sicherstellenEntsperrt } from "./schluessel.js";
import { PythonRunner, pyodideVorhanden } from "../shared/python-runner.js";
import { WebRunner } from "../shared/web-runner.js";
import { druckAnsicht, druckNotenliste } from "../shared/druck.js";
import { codeAnsicht } from "../shared/code-editor.js";

let behaelter = null;
let master = null;
const abgaben = []; // { id, datei, identitaet, antworten, protokoll, bewertung, gesamt, kommentar, kommentare, warnungen }
let ausgewaehlt = null;
let pythonRunner = null;

export function zeigeKorrektur(inhalt) {
  behaelter = inhalt;
  zeichne();
}

function zeichne() {
  if (!master) return zeigeArbeitswahl();
  behaelter.replaceChildren(kopf(), ladeKarte(), abgaben.length ? arbeitsflaeche() : hinweisKarte());
}

/* ------------------------------------------------------------- Arbeitswahl */

function zeigeArbeitswahl() {
  const liste = masterListe();
  behaelter.replaceChildren(
    el("div", { class: "karte" }, [
      el("h2", { text: "Welche Klassenarbeit möchtest du korrigieren?" }),
      el("p", {
        class: "klein grau",
        text: "Zum Bewerten wird der Master mit den Lösungen gebraucht. Die Abgaben allein reichen nicht.",
      }),
      liste.length
        ? el(
            "div",
            { class: "spalten spalten-2", style: { marginTop: "1rem" } },
            liste.map((e) =>
              el("button", { class: "sit-karte", onclick: () => arbeitWaehlen(e.id) }, [
                el("div", { class: "fett", style: { color: "var(--navy)" }, text: e.titel }),
                el("div", { class: "klein grau", text: [e.fach, e.klasse].filter(Boolean).join(" · ") }),
                el("div", { class: "klein grau", text: `${e.aufgaben} Aufgaben` }),
              ])
            )
          )
        : el("p", { class: "leer", text: "Keine Klassenarbeit vorhanden. Bitte zuerst im Reiter „Klassenarbeiten“ eine anlegen oder laden." }),
    ])
  );
}

function arbeitWaehlen(id) {
  master = masterLaden(id);
  if (!master.notenschluessel) master.notenschluessel = standardSchluessel();
  abgaben.length = 0;
  ausgewaehlt = null;
  zeichne();
}

function kopf() {
  return el("div", { class: "zeile", style: { marginBottom: "1rem" } }, [
    el("button", {
      class: "btn sekundaer",
      text: "← andere Arbeit",
      onclick: () => {
        master = null;
        abgaben.length = 0;
        zeichne();
      },
    }),
    el("h2", { style: { margin: 0 }, text: master.titel }),
    el("span", { class: "plakette info", text: `${formatPunkte(gesamtPunkte(master))} Punkte` }),
    el("span", { class: "plakette", text: master.notenschluessel.name ?? "Notenschlüssel" }),
    el("span", { class: "schieb-rechts" }),
    abgaben.length ? el("span", { class: "plakette gut", text: `${abgaben.length} Abgaben` }) : null,
  ]);
}

/* ------------------------------------------------------------ Dateien laden */

function ladeKarte() {
  const flaeche = el("div", { class: "ablage" }, [
    el("p", { style: { marginBottom: ".7rem" } }, [
      el("strong", { text: "Abgaben hier hereinziehen" }),
    ]),
    el("p", { class: "klein grau", text: `Alle Dateien aus dem Tauschordner mit der Endung .${DATEI_ENDUNG.abgabe}` }),
    el("button", {
      class: "btn",
      text: "Dateien auswählen",
      onclick: async () => {
        const dateien = await dateiWaehlen({ endungen: `.${DATEI_ENDUNG.abgabe},.json`, mehrere: true });
        if (dateien?.length) verarbeite(dateien);
      },
    }),
  ]);
  ablageFlaeche(flaeche, verarbeite, [`.${DATEI_ENDUNG.abgabe}`, ".json"]);
  return el("div", { class: "karte" }, [flaeche]);
}

function hinweisKarte() {
  return el("div", { class: "karte" }, [
    el("h3", { text: "So geht es weiter" }),
    el("ol", { style: { lineHeight: "1.8" } }, [
      el("li", { text: "Alle Abgabedateien aus dem Tauschordner markieren und oben hereinziehen." }),
      el("li", { text: "Die Bewertung läuft automatisch – auch die Python- und Web-Testfälle." }),
      el("li", { text: "Freitexte und Zweifelsfälle von Hand nachbewerten." }),
      el("li", { text: "Notenliste ansehen, korrigierte Arbeiten als PDF ausgeben." }),
    ]),
  ]);
}

async function verarbeite(dateien) {
  if (!(await sicherstellenEntsperrt())) return;

  const fortschritt = meldung(`0 von ${dateien.length} Abgaben werden geöffnet …`, "info", 0);
  let fehlerhaft = 0;

  for (let i = 0; i < dateien.length; i++) {
    fortschritt.textContent = `${i} von ${dateien.length} Abgaben werden geöffnet …`;
    try {
      const roh = await ladeJsonDatei(dateien[i]);
      if (roh?.typ !== "jjws-abgabe") throw new Error("keine Abgabedatei");
      if (roh.kopf?.pruefungId && roh.kopf.pruefungId !== master.id) {
        throw new Error(`gehört zu einer anderen Arbeit („${roh.kopf.pruefungTitel ?? "unbekannt"}“)`);
      }
      const nutzlast = await entschluesseln(schluessel.privat, roh);
      if (abgaben.some((x) => JSON.stringify(x.identitaet) === JSON.stringify(nutzlast.identitaet))) {
        throw new Error("diese Person ist bereits geladen");
      }
      abgaben.push({
        id: `abg_${abgaben.length}_${Date.now()}`,
        datei: dateien[i].name,
        identitaet: nutzlast.identitaet ?? {},
        antworten: nutzlast.antworten ?? {},
        protokoll: nutzlast.protokoll ?? {},
        bewertung: [],
        gesamt: { erreicht: 0, moeglich: gesamtPunkte(master), prozent: 0, note: null, offen: 0 },
        kommentar: "",
        kommentare: {},
        warnungen: [],
        bewertet: false,
      });
    } catch (fehler) {
      fehlerhaft++;
      meldung(`„${dateien[i].name}“ konnte nicht geöffnet werden: ${fehler.message}`, "fehler", 12000);
    }
  }
  fortschritt.remove();

  if (abgaben.length) {
    sortiereAbgaben();
    await bewerteAlle();
  }
  if (fehlerhaft) meldung(`${fehlerhaft} Datei(en) wurden übersprungen.`, "warn", 8000);
  zeichne();
}

function sortiereAbgaben() {
  abgaben.sort((a, b) => bezeichnung(a).localeCompare(bezeichnung(b), "de"));
}

function bezeichnung(abgabe) {
  const i = abgabe.identitaet ?? {};
  if (i.nummer) return `Nr. ${String(i.nummer).padStart(2, "0")}`;
  return [i.name, i.vorname].filter(Boolean).join(", ") || abgabe.datei;
}

/* -------------------------------------------------------------- Bewertung */

async function bewerteAlle() {
  const brauchtPython = master.aufgaben.some((a) => a.typ === "code-python");
  const brauchtWeb = master.aufgaben.some((a) => a.typ === "code-web");

  if (brauchtPython) {
    if (!(await pyodideVorhanden())) {
      meldung(
        "Pyodide fehlt – Python-Aufgaben können nicht automatisch geprüft werden. " +
          "Bitte einmalig scripts/pyodide-holen.sh ausführen.",
        "warn",
        14000
      );
    } else if (!pythonRunner) {
      const laden = meldung("Python-Umgebung wird gestartet …", "info", 0);
      pythonRunner = new PythonRunner({ zeitlimitMs: 8000 });
      try {
        await pythonRunner.vorbereiten();
      } catch (fehler) {
        meldung(`Python konnte nicht gestartet werden: ${fehler.message}`, "fehler", 10000);
        pythonRunner = null;
      }
      laden.remove();
    }
  }
  const webRunner = brauchtWeb ? new WebRunner() : null;

  const fortschritt = meldung("Bewertung läuft …", "info", 0);
  for (let i = 0; i < abgaben.length; i++) {
    fortschritt.textContent = `Bewertung läuft … (${i + 1}/${abgaben.length}) ${bezeichnung(abgaben[i])}`;
    await bewerteEine(abgaben[i], webRunner);
  }
  fortschritt.remove();
  meldung("Bewertung abgeschlossen.", "gut");
}

async function bewerteEine(abgabe, webRunner) {
  abgabe.bewertung = [];
  abgabe.warnungen = [];

  for (const a of master.aufgaben) {
    const antwort = abgabe.antworten[a.id];

    if (a.typ === "code-python") {
      if (!pythonRunner) {
        abgabe.bewertung.push({
          aufgabeId: a.id,
          typ: a.typ,
          erreicht: 0,
          moeglich: runde2(aufgabenPunkte(a)),
          autoBewertet: false,
          teile: [],
          hinweis: "Python-Umgebung nicht verfügbar – bitte von Hand bewerten.",
        });
        continue;
      }
      const code = String(antwort?.code ?? "");
      if (!code.trim()) {
        abgabe.bewertung.push({
          aufgabeId: a.id,
          typ: a.typ,
          erreicht: 0,
          moeglich: runde2(aufgabenPunkte(a)),
          autoBewertet: true,
          teile: [
            { bez: "Ohne Bearbeitung", erreicht: 0, moeglich: runde2(aufgabenPunkte(a)), status: "leer", detail: "" },
          ],
          hinweis: "",
        });
        continue;
      }
      const ergebnisse = await pythonRunner.alleTests(a, code);
      abgabe.bewertung.push(ergebnisAusTests(a, ergebnisse));
      continue;
    }

    if (a.typ === "code-web") {
      const { ergebnisse, warnung } = await webRunner.pruefe(a, antwort);
      if (warnung) abgabe.warnungen.push(`Aufgabe „${a.titel || a.id}“: ${warnung}`);
      abgabe.bewertung.push(ergebnisAusTests(a, ergebnisse, warnung));
      continue;
    }

    abgabe.bewertung.push(bewerteAufgabe(a, antwort));
  }

  abgabe.bewertet = true;
  neuBerechnen(abgabe);
}

function neuBerechnen(abgabe) {
  const s = summiere(abgabe.bewertung);
  const note = notePunkte(s.erreicht, s.moeglich, master.notenschluessel);
  abgabe.gesamt = { ...s, note: note.note, notenpunkte: note.notenpunkte, notentext: note.text };
}

/* ----------------------------------------------------------- Arbeitsfläche */

function arbeitsflaeche() {
  if (!ausgewaehlt || !abgaben.includes(ausgewaehlt)) ausgewaehlt = abgaben[0];

  const liste = el(
    "div",
    { class: "sus-liste" },
    abgaben.map((abgabe) =>
      el("button", {
        "aria-current": abgabe === ausgewaehlt ? "true" : "false",
        onclick: () => {
          ausgewaehlt = abgabe;
          zeichne();
        },
      }, [
        el("span", { text: bezeichnung(abgabe) }),
        el("span", { class: "zeile-eng" }, [
          abgabe.gesamt.offen
            ? el("span", { class: "plakette offen", text: `${abgabe.gesamt.offen} offen` })
            : null,
          el("span", { class: "fett", text: formatNote(abgabe.gesamt.note) }),
        ]),
      ])
    )
  );

  return el("div", { class: "spalten-korrektur" }, [
    el("div", {}, [
      el("div", { class: "karte" }, [
        el("h3", { text: "Abgaben" }),
        liste,
        el("hr", { class: "trenner" }),
        el("div", { class: "stapel" }, [
          el("button", { class: "btn sekundaer klein", text: "Alle neu bewerten", onclick: async () => { await bewerteAlle(); zeichne(); } }),
          el("button", { class: "btn sekundaer klein", text: "Notenliste anzeigen", onclick: zeigeNotenliste }),
        ]),
      ]),
      statistikKarte(),
    ]),
    ausgewaehlt ? abgabeAnsicht(ausgewaehlt) : el("div"),
  ]);
}

function statistikKarte() {
  const stat = statistik(abgaben.map((a) => ({ note: a.gesamt.note })));
  if (!stat.anzahl) return el("div");
  const farben = { 1: "#1e7a45", 2: "#4a9c5f", 3: "#009fe3", 4: "#f2b043", 5: "#f26b43", 6: "#c00000" };
  const balken = el(
    "div",
    { class: "balken" },
    [1, 2, 3, 4, 5, 6].map((n) =>
      el("span", {
        style: { width: `${((stat.verteilung[n] ?? 0) / stat.anzahl) * 100}%`, background: farben[n] },
        title: `Note ${n}: ${stat.verteilung[n] ?? 0}`,
      })
    )
  );
  return el("div", { class: "karte" }, [
    el("h3", { text: "Auf einen Blick" }),
    el("div", { class: "spalten spalten-2" }, [
      kennzahl(formatNote(stat.schnitt, 2), "Durchschnitt"),
      kennzahl(`${formatPunkte(stat.quote)} %`, "bestanden"),
    ]),
    el("div", { style: { marginTop: ".8rem" } }, [balken]),
    el("div", { class: "zeile-eng klein grau", style: { marginTop: ".4rem" } },
      [1, 2, 3, 4, 5, 6].map((n) => el("span", { text: `${n}: ${stat.verteilung[n] ?? 0}` }))
    ),
  ]);
}

function kennzahl(wert, bez) {
  return el("div", { class: "kennzahl" }, [
    el("div", { class: "wert", text: wert }),
    el("div", { class: "bez", text: bez }),
  ]);
}

/* --------------------------------------------------------- Einzelne Abgabe */

function abgabeAnsicht(abgabe) {
  const bloecke = master.aufgaben.map((a, i) => aufgabenBlock(abgabe, a, i));

  const kommentarFeld = el("textarea", { rows: 3, placeholder: "Rückmeldung an die Schülerin / den Schüler (erscheint im PDF)" });
  kommentarFeld.value = abgabe.kommentar;
  kommentarFeld.addEventListener("input", () => (abgabe.kommentar = kommentarFeld.value));

  return el("div", {}, [
    el("div", { class: "karte" }, [
      el("div", { class: "karte-kopf" }, [
        el("div", {}, [
          el("h2", { style: { margin: 0 }, text: bezeichnung(abgabe) }),
          el("div", { class: "klein grau", text: `${abgabe.datei} · abgegeben ${zeitpunkt(abgabe)}` }),
        ]),
        el("div", { class: "zeile-eng" }, [
          el("div", { style: { textAlign: "right" } }, [
            el("div", { class: "note-gross", text: formatNote(abgabe.gesamt.note) }),
            el("div", { class: "klein grau", text: `${formatPunkte(abgabe.gesamt.erreicht)} / ${formatPunkte(abgabe.gesamt.moeglich)} P. · ${formatPunkte(abgabe.gesamt.prozent)} %` }),
          ]),
        ]),
      ]),
      abgabe.gesamt.offen
        ? el("div", { class: "hinweis warn", text: `${abgabe.gesamt.offen} Aufgabe(n) warten noch auf deine Bewertung.` })
        : null,
      ...abgabe.warnungen.map((w) => el("div", { class: "hinweis fehler", text: w })),
      el("label", { class: "feld", style: { marginTop: ".8rem" } }, [
        el("span", { class: "bez", text: "Rückmeldung" }),
        kommentarFeld,
      ]),
      el("div", { class: "zeile" }, [
        el("button", {
          class: "btn",
          text: "Korrigierte Arbeit als PDF",
          onclick: () =>
            druckAnsicht({
              modus: "korrektur",
              pruefung: master,
              daten: {
                identitaet: abgabe.identitaet,
                antworten: abgabe.antworten,
                bewertung: abgabe.bewertung,
                gesamt: abgabe.gesamt,
                kommentar: abgabe.kommentar,
                kommentare: abgabe.kommentare,
              },
            }),
        }),
        el("span", { class: "schieb-rechts" }),
        el("button", { class: "btn sekundaer", text: "diese Abgabe neu bewerten", onclick: async () => {
          await bewerteEine(abgabe, new WebRunner());
          zeichne();
        } }),
      ]),
    ]),
    ...bloecke,
  ]);
}

function zeitpunkt(abgabe) {
  const t = abgabe.protokoll?.abgegebenAm;
  if (!t) return "unbekannt";
  const dauer = abgabe.protokoll?.dauerSekunden;
  const dauerText = dauer ? ` · Bearbeitungsdauer ${Math.round(dauer / 60)} min` : "";
  return new Date(t).toLocaleString("de-DE") + dauerText;
}

function aufgabenBlock(abgabe, a, index) {
  const erg = abgabe.bewertung.find((e) => e.aufgabeId === a.id);
  if (!erg) return el("div");
  const typ = AUFGABENTYPEN[a.typ];

  const punkteEingabe = el("input", {
    type: "number",
    value: erg.erreicht,
    min: 0,
    max: erg.moeglich,
    step: 0.5,
    style: { maxWidth: "6rem" },
  });
  punkteEingabe.addEventListener("input", () => {
    erg.erreicht = Math.max(0, Math.min(erg.moeglich, Number(punkteEingabe.value) || 0));
    erg.manuellErledigt = true;
    neuBerechnen(abgabe);
    zeichne();
  });

  const kommentar = el("input", {
    type: "text",
    value: abgabe.kommentare[a.id] ?? "",
    placeholder: "Anmerkung zu dieser Aufgabe (erscheint im PDF)",
  });
  kommentar.addEventListener("input", () => (abgabe.kommentare[a.id] = kommentar.value));

  /* Kriterienraster für Freitexte */
  const kriterien =
    a.typ === "freitext" && a.kriterien?.length
      ? el(
          "div",
          { style: { marginTop: ".5rem" } },
          a.kriterien.map((k, i) => {
            const teil = erg.teile[i];
            const haken = el("input", { type: "checkbox", checked: teil?.status === "richtig" });
            haken.addEventListener("change", () => {
              if (teil) {
                teil.status = haken.checked ? "richtig" : "falsch";
                teil.erreicht = haken.checked ? teil.moeglich : 0;
              }
              erg.erreicht = runde2(erg.teile.reduce((s, t) => s + t.erreicht, 0));
              erg.manuellErledigt = true;
              neuBerechnen(abgabe);
              zeichne();
            });
            return el("label", { class: "zeile-eng", style: { cursor: "pointer", padding: ".2rem 0" } }, [
              haken,
              el("span", { style: { flex: "1" }, text: k.text || `Kriterium ${i + 1}` }),
              el("span", { class: "klein grau", text: `${formatPunkte(k.punkte)} P.` }),
            ]);
          })
        )
      : null;

  const zeichen = { richtig: "✓", falsch: "✗", teilweise: "~", leer: "–", offen: "?" };
  const pruefliste = erg.teile.length
    ? el(
        "ul",
        { style: { listStyle: "none", padding: 0, margin: ".6rem 0 0", fontSize: ".88rem" } },
        erg.teile.map((t) =>
          el("li", { style: { display: "grid", gridTemplateColumns: "1.4rem 1fr auto", gap: ".4rem", padding: ".2rem 0", borderBottom: "1px dotted var(--grey-200)" } }, [
            el("span", {
              text: zeichen[t.status] ?? "·",
              style: { fontWeight: "700", color: t.status === "richtig" ? "var(--green)" : t.status === "falsch" ? "var(--red)" : "var(--grey)" },
            }),
            el("span", {}, [
              el("span", { text: t.bez }),
              t.detail ? el("div", { class: "klein grau", text: t.detail }) : null,
            ]),
            el("span", { class: "klein nowrap", text: t.moeglich > 0 ? `${formatPunkte(t.erreicht)}/${formatPunkte(t.moeglich)}` : "" }),
          ])
        )
      )
    : null;

  const status =
    erg.erreicht >= erg.moeglich && erg.moeglich > 0 ? "gut" : erg.erreicht > 0 ? "teil" : "fehler";

  return el("details", { class: "karte", open: !erg.autoBewertet && !erg.manuellErledigt }, [
    el("summary", { style: { cursor: "pointer", display: "flex", gap: ".6rem", alignItems: "center", fontWeight: "700", color: "var(--navy)" } }, [
      el("span", { text: `${index + 1}. ${a.titel || typ?.name || a.typ}` }),
      el("span", { class: `plakette ${status}`, text: `${formatPunkte(erg.erreicht)} / ${formatPunkte(erg.moeglich)} P.` }),
      !erg.autoBewertet && !erg.manuellErledigt ? el("span", { class: "plakette offen", text: "zu bewerten" }) : null,
    ]),
    el("div", { style: { paddingTop: ".6rem" } }, [
      el("div", { class: "klein grau", style: { whiteSpace: "pre-wrap", marginBottom: ".5rem" }, text: a.text }),
      antwortAnzeige(a, abgabe.antworten[a.id]),
      pruefliste,
      erg.hinweis ? el("p", { class: "klein grau", style: { marginTop: ".4rem" }, text: erg.hinweis }) : null,
      kriterien,
      el("div", { class: "zeile", style: { marginTop: ".7rem" } }, [
        el("label", { class: "zeile-eng" }, [
          el("span", { class: "klein fett", text: "Punkte:" }),
          punkteEingabe,
          el("span", { class: "klein grau", text: `von ${formatPunkte(erg.moeglich)}` }),
        ]),
        el("span", { style: { flex: "1", minWidth: "12rem" } }, [kommentar]),
      ]),
    ]),
  ]);
}

function antwortAnzeige(a, antwort) {
  const roh = (text, code = false) =>
    el("pre", { class: "ausgabe", style: code ? { fontFamily: "var(--mono)" } : {}, text: String(text ?? "").trim() || "— nicht bearbeitet —" });

  switch (a.typ) {
    case "code-python":
      return String(antwort?.code ?? "").trim()
        ? codeAnsicht(antwort.code, "python")
        : roh("");
    case "code-web":
      return el("div", { class: "spalten spalten-2" }, [
        el("div", {}, [el("h4", { text: "HTML" }), codeAnsicht(antwort?.html ?? "", "html")]),
        el("div", {}, [el("h4", { text: "CSS" }), codeAnsicht(antwort?.css ?? "", "css")]),
        a.jsAktiv
          ? el("div", {}, [el("h4", { text: "JavaScript" }), codeAnsicht(antwort?.js ?? "", "javascript")])
          : null,
      ]);
    case "freitext":
    case "stichworte":
    case "kurzantwort":
    case "zahl":
      return roh(antwort);
    case "aufzaehlung":
      return roh((Array.isArray(antwort) ? antwort : []).map((x, i) => `${i + 1}. ${x || "—"}`).join("\n"));
    default:
      return null; // Details stehen in der Prüfliste
  }
}

/* ------------------------------------------------------------- Notenliste */

function notenlisteZeilen() {
  return abgaben.map((a) => ({
    bezeichnung: bezeichnung(a),
    bewertung: a.bewertung,
    gesamt: a.gesamt,
  }));
}

function zeigeNotenliste() {
  const zeilen = notenlisteZeilen();
  const stat = statistik(abgaben.map((a) => ({ note: a.gesamt.note })));

  const tabelle = el("table", { class: "liste" }, [
    el("thead", {}, [
      el("tr", {}, [
        el("th", { text: "Nr." }),
        el("th", { text: master.identifikation === "nummer" ? "Prüfungsnr." : "Name" }),
        ...master.aufgaben.map((a, i) => el("th", { class: "zahl", title: a.titel || "", text: String(i + 1) })),
        el("th", { class: "zahl", text: "Punkte" }),
        el("th", { class: "zahl", text: "%" }),
        el("th", { class: "zahl", text: "Note" }),
      ]),
    ]),
    el(
      "tbody",
      {},
      zeilen.map((z, i) =>
        el("tr", {}, [
          el("td", { text: String(i + 1) }),
          el("td", { class: "fett", text: z.bezeichnung }),
          ...master.aufgaben.map((a) => {
            const e = z.bewertung.find((x) => x.aufgabeId === a.id);
            return el("td", { class: "zahl", text: e ? formatPunkte(e.erreicht) : "–" });
          }),
          el("td", { class: "zahl fett", text: formatPunkte(z.gesamt.erreicht) }),
          el("td", { class: "zahl", text: formatPunkte(z.gesamt.prozent) }),
          el("td", { class: "zahl fett", text: formatNote(z.gesamt.note) }),
        ])
      )
    ),
  ]);

  const dlg = el("dialog", { style: { maxWidth: "min(70rem, 96vw)" } }, [
    el("div", { class: "dlg-inhalt" }, [
      el("div", { class: "karte-kopf" }, [
        el("h2", { text: `Notenliste – ${master.titel}` }),
        el("button", { class: "btn sekundaer klein", text: "Schließen", onclick: () => dlg.close() }),
      ]),
      el("div", { class: "tabelle-scroll" }, [tabelle]),
      stat.anzahl
        ? el("p", { class: "klein grau", style: { marginTop: ".6rem" }, text: `${stat.anzahl} Arbeiten · Durchschnitt ${formatNote(stat.schnitt, 2)} · ${stat.bestanden} bestanden (${formatPunkte(stat.quote)} %)` })
        : null,
      el("div", { class: "zeile", style: { marginTop: "1rem" } }, [
        el("button", { class: "btn", text: "Notenliste drucken (PDF)", onclick: () => { dlg.close(); druckNotenliste({ pruefung: master, zeilen, statistik: stat }); } }),
        el("button", { class: "btn sekundaer", text: "CSV für Excel", onclick: csvExport }),
        el("button", { class: "btn sekundaer", text: "Alle Arbeiten als PDF", onclick: () => { dlg.close(); alleAlsPdf(); } }),
      ]),
    ]),
  ]);
  dlg.addEventListener("close", () => dlg.remove());
  document.body.appendChild(dlg);
  dlg.showModal();
}

function csvExport() {
  const trenner = ";";
  const kopfZeile = [
    master.identifikation === "nummer" ? "Pruefungsnummer" : "Name",
    ...master.aufgaben.map((a, i) => `A${i + 1}${a.titel ? ` ${a.titel}` : ""}`),
    "Punkte",
    "von",
    "Prozent",
    "Note",
  ];
  const zeilen = abgaben.map((abgabe) => [
    bezeichnung(abgabe),
    ...master.aufgaben.map((a) => {
      const e = abgabe.bewertung.find((x) => x.aufgabeId === a.id);
      return e ? String(e.erreicht).replace(".", ",") : "";
    }),
    String(abgabe.gesamt.erreicht).replace(".", ","),
    String(abgabe.gesamt.moeglich).replace(".", ","),
    String(Math.round(abgabe.gesamt.prozent * 10) / 10).replace(".", ","),
    formatNote(abgabe.gesamt.note),
  ]);

  const maskiere = (z) => (/[";\n]/.test(z) ? `"${z.replace(/"/g, '""')}"` : z);
  const text =
    "﻿" + [kopfZeile, ...zeilen].map((z) => z.map((x) => maskiere(String(x))).join(trenner)).join("\r\n");

  ladeHerunter(new Blob([text], { type: "text/csv;charset=utf-8" }), `${dateiName(master.titel)}_notenliste.csv`);
  meldung("CSV heruntergeladen – mit Semikolon als Trennzeichen, passend für Excel.", "gut", 7000);
}

async function alleAlsPdf() {
  const weiter = await frage(
    "Alle Arbeiten drucken",
    `Es werden ${abgaben.length} Druckansichten nacheinander geöffnet. Nach jedem Druckvorgang ` +
      "erscheint die nächste. Fortfahren?",
    { jaText: "Los", neinText: "Abbrechen" }
  );
  if (!weiter) return;

  for (const abgabe of abgaben) {
    druckAnsicht({
      modus: "korrektur",
      pruefung: master,
      daten: {
        identitaet: abgabe.identitaet,
        antworten: abgabe.antworten,
        bewertung: abgabe.bewertung,
        gesamt: abgabe.gesamt,
        kommentar: abgabe.kommentar,
        kommentare: abgabe.kommentare,
      },
      direktDrucken: true,
    });
    // Warten, bis der Druckdialog geschlossen wurde.
    await new Promise((fertig) => setTimeout(fertig, 1500));
    await new Promise((fertig) => {
      const pruefen = () => {
        if (!document.querySelector(".druck-buehne")) return fertig();
        setTimeout(pruefen, 800);
      };
      // Die Bühne bleibt offen – Nutzer schließt sie; wir warten darauf.
      pruefen();
    });
  }
  meldung("Alle Arbeiten wurden ausgegeben.", "gut");
}
