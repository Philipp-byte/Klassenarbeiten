/* ==========================================================================
   Editor für Klassenarbeiten.

   Hier entsteht der Master mit allen Lösungen. Beim Export werden daraus zwei
   Dateien: der Master zum Aufheben und die Fassung für die SuS – letztere
   ohne jede Lösung.
   ========================================================================== */

import { el, $, meldung, frage, dateiWaehlen, autoHoehe, entprellt } from "../shared/dom.js";
import {
  neuePruefung,
  neueAufgabe,
  neuerPythonTest,
  neuerWebTest,
  neueId,
  AUFGABENTYPEN,
  TYP_GRUPPEN,
  aufgabenPunkte,
  gesamtPunkte,
  pruefeMaster,
  alsSusFassung,
  ladeJsonDatei,
  speichereJson,
  dateiName,
  datumDeutsch,
  varianten,
  DATEI_ENDUNG,
} from "../shared/model.js";
import { VORLAGEN, standardSchluessel, punkteNotenTabelle, formatNote, formatPunkte, strukturKlon } from "../shared/noten.js";
import { SITUATIONEN, situationNach, anschluesseAnwenden, HANDLUNGSSCHRITTE, TYP_ZU_SCHRITT } from "../shared/situationen.js";
import { masterListe, masterLaden, masterSpeichern, masterLoeschen } from "../shared/speicher.js";
import { schluessel, sicherstellenEntsperrt } from "./schluessel.js";
import { druckAnsicht } from "../shared/druck.js";
import { baueAntwortfeld } from "../shared/aufgaben-ui.js";
import { codeEditor } from "../shared/code-editor.js";

let aktuell = null; // der Master, der gerade bearbeitet wird
let behaelter = null;

/* ============================================================ Übersichtsliste */

export function zeigeArbeiten(inhalt) {
  behaelter = inhalt;
  aktuell = null;
  const liste = masterListe();

  const tabelle = el("table", { class: "liste" }, [
    el("thead", {}, [
      el("tr", {}, [
        el("th", { text: "Titel" }),
        el("th", { text: "Fach" }),
        el("th", { text: "Klasse" }),
        el("th", { text: "Datum" }),
        el("th", { class: "zahl", text: "Aufgaben" }),
        el("th", { text: "Zuletzt geändert" }),
        el("th", { text: "" }),
      ]),
    ]),
  ]);
  const koerper = el("tbody");
  liste.forEach((e) => {
    koerper.appendChild(
      el("tr", {}, [
        el("td", { class: "fett", text: e.titel }),
        el("td", { text: e.fach || "—" }),
        el("td", { text: e.klasse || "—" }),
        el("td", { text: datumDeutsch(e.datum) }),
        el("td", { class: "zahl", text: String(e.aufgaben) }),
        el("td", { class: "klein grau", text: new Date(e.geaendertAm).toLocaleString("de-DE") }),
        el("td", {}, [
          el("div", { class: "zeile-eng" }, [
            el("button", { class: "btn klein", text: "Bearbeiten", onclick: () => oeffne(e.id) }),
            el("button", {
              class: "btn sekundaer klein",
              text: "Kopie",
              onclick: () => dupliziere(e.id),
            }),
            el("button", {
              class: "btn warnung klein",
              text: "Löschen",
              onclick: async () => {
                if (await frage("Klassenarbeit löschen?", `„${e.titel}“ wird aus diesem Browser entfernt.`, { gefaehrlich: true, jaText: "Löschen" })) {
                  masterLoeschen(e.id);
                  zeigeArbeiten(inhalt);
                }
              },
            }),
          ]),
        ]),
      ])
    );
  });
  tabelle.appendChild(koerper);

  inhalt.replaceChildren(
    el("div", { class: "karte" }, [
      el("div", { class: "karte-kopf" }, [
        el("h2", { text: "Meine Klassenarbeiten" }),
        el("div", { class: "zeile-eng" }, [
          el("button", { class: "btn", text: "+ Neue Klassenarbeit", onclick: () => neuAnlegen() }),
          el("button", { class: "btn sekundaer", text: "Master-Datei laden", onclick: () => importieren() }),
        ]),
      ]),
      liste.length ? el("div", { class: "tabelle-scroll" }, [tabelle]) : el("p", { class: "leer", text: "Noch keine Klassenarbeit angelegt." }),
    ])
  );
}

function neuAnlegen() {
  const m = neuePruefung({ notenschluessel: standardSchluessel() });
  masterSpeichern(m);
  oeffne(m.id);
}

function dupliziere(id) {
  const alt = masterLaden(id);
  if (!alt) return;
  const neu = JSON.parse(JSON.stringify(alt));
  neu.id = neueId("ka");
  neu.titel = `${alt.titel} (Kopie)`;
  neu.aufgaben.forEach((a) => (a.id = neueId("a")));
  masterSpeichern(neu);
  zeigeArbeiten(behaelter);
  meldung("Kopie angelegt.", "gut");
}

async function importieren() {
  const datei = await dateiWaehlen({ endungen: `.${DATEI_ENDUNG.master},.json` });
  if (!datei) return;
  try {
    const daten = await ladeJsonDatei(datei);
    if (daten?.typ !== "jjws-klassenarbeit-master") {
      throw new Error("Das ist keine Master-Datei einer Klassenarbeit (.jjwsm).");
    }
    if (masterLaden(daten.id)) daten.id = neueId("ka");
    masterSpeichern(daten);
    meldung(`„${daten.titel}“ geladen.`, "gut");
    oeffne(daten.id);
  } catch (fehler) {
    meldung(fehler.message, "fehler", 8000);
  }
}

/* Strg+S speichert – gewohnter Griff, auch wenn ohnehin laufend gespeichert wird. */
let tastenHorcherGesetzt = false;
function tastenHorcher() {
  if (tastenHorcherGesetzt) return;
  tastenHorcherGesetzt = true;
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (aktuell) {
        masterSpeichern(aktuell);
        meldung("Gespeichert.", "gut", 1800);
      }
    }
  });
}

export function oeffne(id) {
  aktuell = masterLaden(id);
  if (!aktuell) {
    meldung("Diese Klassenarbeit wurde nicht gefunden.", "fehler");
    return zeigeArbeiten(behaelter);
  }
  if (!aktuell.notenschluessel) aktuell.notenschluessel = standardSchluessel();
  tastenHorcher();
  zeichne();
}

const speichereVerzoegert = entprellt(() => {
  if (aktuell) masterSpeichern(aktuell);
}, 700);

function aendern(neuZeichnen = false) {
  speichereVerzoegert();
  if (neuZeichnen) zeichne();
  else aktualisierePunkteAnzeige();
}

/* ------------------------------------------------------------- Eingabehelfer */

function feld(bez, eingabe, hinweis = "") {
  return el("label", { class: "feld" }, [
    el("span", { class: "bez", text: bez }),
    eingabe,
    hinweis ? el("span", { class: "hinweis", text: hinweis }) : null,
  ]);
}

function textFeld(objekt, schluesselName, bez, { hinweis = "", platzhalter = "", breite = null } = {}) {
  const eingabe = el("input", {
    type: "text",
    value: objekt[schluesselName] ?? "",
    placeholder: platzhalter,
    style: breite ? { maxWidth: breite } : {},
  });
  eingabe.addEventListener("input", () => {
    objekt[schluesselName] = eingabe.value;
    aendern();
  });
  return feld(bez, eingabe, hinweis);
}

function zahlFeldEin(objekt, schluesselName, bez, { min = 0, schritt = 1, hinweis = "", neuZeichnen = false } = {}) {
  const eingabe = el("input", {
    type: "number",
    value: objekt[schluesselName] ?? 0,
    min,
    step: schritt,
    class: "schmal",
  });
  eingabe.addEventListener("input", () => {
    objekt[schluesselName] = Number(eingabe.value);
    aendern(neuZeichnen);
  });
  return feld(bez, eingabe, hinweis);
}

function bereichFeld(objekt, schluesselName, bez, { zeilen = 4, hinweis = "", code = false, platzhalter = "", sprache = "python" } = {}) {
  if (code) {
    const editor = codeEditor({
      wert: objekt[schluesselName] ?? "",
      sprache,
      zeilen,
      platzhalter,
      beiAenderung: (text) => {
        objekt[schluesselName] = text;
        aendern();
      },
    });
    return feld(bez, editor.knoten, hinweis);
  }
  const eingabe = el("textarea", { rows: zeilen, spellcheck: "true", placeholder: platzhalter });
  eingabe.value = objekt[schluesselName] ?? "";
  autoHoehe(eingabe, zeilen);
  eingabe.addEventListener("input", () => {
    objekt[schluesselName] = eingabe.value;
    aendern();
  });
  return feld(bez, eingabe, hinweis);
}

function schalter(objekt, schluesselName, bez, neuZeichnen = false) {
  const eingabe = el("input", { type: "checkbox", checked: !!objekt[schluesselName] });
  eingabe.addEventListener("change", () => {
    objekt[schluesselName] = eingabe.checked;
    aendern(neuZeichnen);
  });
  return el("label", { class: "schalter" }, [eingabe, el("span", { class: "gleis" }), el("span", { text: bez })]);
}

function auswahlFeld(objekt, schluesselName, bez, optionen, neuZeichnen = false) {
  const auswahl = el("select");
  optionen.forEach(([wert, text]) =>
    auswahl.appendChild(el("option", { value: wert, text, selected: objekt[schluesselName] === wert }))
  );
  auswahl.addEventListener("change", () => {
    objekt[schluesselName] = auswahl.value;
    aendern(neuZeichnen);
  });
  return feld(bez, auswahl);
}

/* ================================================================== Zeichnen */

function zeichne() {
  behaelter.replaceChildren(
    kopfLeiste(),
    kopfdatenKarte(),
    situationsKarte(),
    notenschluesselKarte(),
    aufgabenKarte(),
    aktionsKarte(),
    aktionsLeiste()
  );
  window.scrollTo({ top: 0 });
}

let punkteAnzeige = null;
function aktualisierePunkteAnzeige() {
  if (punkteAnzeige && aktuell) {
    punkteAnzeige.textContent = `${formatPunkte(gesamtPunkte(aktuell))} Punkte · ${aktuell.aufgaben.length} Aufgaben`;
  }
}

function kopfLeiste() {
  punkteAnzeige = el("span", { class: "plakette info" });
  aktualisierePunkteAnzeige();
  return el("div", {}, [
    el("div", { class: "zeile", style: { marginBottom: ".8rem" } }, [
      el("button", { class: "btn leise", text: "← Übersicht", onclick: () => zeigeArbeiten(behaelter) }),
      el("h2", { style: { margin: 0 }, text: aktuell.titel || "Ohne Titel" }),
      punkteAnzeige,
      el("span", { class: "schieb-rechts" }),
      el("span", { class: "klein grau", text: "Änderungen werden automatisch gespeichert" }),
    ]),
    schrittAnzeige(),
  ]);
}

/** Zeigt auf einen Blick, was schon steht und was noch fehlt. */
function schrittAnzeige() {
  const schritte = [
    { nr: 1, name: "Kopfdaten", fertig: !!(aktuell.titel?.trim() && aktuell.fach?.trim() && aktuell.klasse?.trim()) },
    { nr: 2, name: "Ausgangssituation", fertig: !!aktuell.ausgangssituation?.trim() },
    { nr: 3, name: "Aufgaben", fertig: aktuell.aufgaben.length > 0 && pruefeMaster(aktuell).length === 0 },
    { nr: 4, name: "Ausgeben", fertig: false },
  ];
  const ersterOffener = schritte.find((x) => !x.fertig);
  return el(
    "div",
    { class: "schritte" },
    schritte.map((x) =>
      el("div", { class: `schritt${x.fertig ? " erledigt" : x === ersterOffener ? " offen" : ""}` }, [
        el("span", { class: "zahl", text: x.fertig ? "✓" : String(x.nr) }),
        el("span", { text: x.name }),
      ])
    )
  );
}

/* -------------------------------------------------------------- Kopfdaten */

function kopfdatenKarte() {
  return el("div", { class: "karte" }, [
    el("h3", { text: "Kopfdaten" }),
    el("div", { class: "spalten spalten-3" }, [
      textFeld(aktuell, "titel", "Titel der Arbeit", { platzhalter: "Klassenarbeit 1" }),
      textFeld(aktuell, "fach", "Fach", { platzhalter: "VBL" }),
      textFeld(aktuell, "klasse", "Klasse", { platzhalter: "1BK2T" }),
      textFeld(aktuell, "thema", "Thema", { platzhalter: "Wirtschaftliche Zusammenhänge" }),
      textFeld(aktuell, "lehrkraft", "Lehrkraft", { platzhalter: "Riegert" }),
      textFeld(aktuell, "schule", "Schule (Fußzeile)", { platzhalter: "JJWS" }),
    ]),
    el("div", { class: "spalten spalten-3" }, [
      feld(
        "Datum",
        (() => {
          const e = el("input", { type: "date", value: aktuell.datum });
          e.addEventListener("input", () => {
            aktuell.datum = e.value;
            aendern();
          });
          return e;
        })()
      ),
      zahlFeldEin(aktuell, "bearbeitungszeitMin", "Bearbeitungszeit (Minuten)", { min: 5, schritt: 5 }),
      auswahlFeld(aktuell, "identifikation", "Die SuS geben an", [
        ["name", "Name, Vorname und Klasse"],
        ["nummer", "nur eine Prüfungsnummer (datensparsam)"],
      ]),
      el("div", {}, [
        schalter(aktuell, "mischenProSuS", "Aufgabenreihenfolge je Person mischen"),
        el("span", {
          class: "hinweis",
          text:
            "Jede Schülerin und jeder Schüler bekommt eine andere Reihenfolge – auch bei den " +
            "Antwortmöglichkeiten. Abschnitte bleiben zusammen. Erschwert das Abschreiben vom Nachbarplatz.",
        }),
      ]),
    ]),
    textFeld(aktuell, "hilfsmittel", "Erlaubte Hilfsmittel", { platzhalter: "Keine." }),
    bereichFeld(aktuell, "hinweise", "Hinweise für die SuS (erscheinen vor dem Start)", { zeilen: 3 }),
  ]);
}

/* ---------------------------------------------------- Ausgangssituation */

function situationsKarte() {
  const gewaehlteId = aktuell.situationId ?? "";

  const karten = SITUATIONEN.map((s) =>
    el(
      "button",
      {
        type: "button",
        class: `sit-karte${gewaehlteId === s.id ? " gewaehlt" : ""}`,
        onclick: () => situationWaehlen(s),
      },
      [
        el("div", { class: "fett", style: { color: "var(--navy)" }, text: s.titel }),
        el("div", { class: "klein grau", text: s.bereich + (s.stufe ? ` · ${s.stufe}` : "") }),
        s.faecher?.length ? el("div", { class: "klein grau", text: s.faecher.join(", ") }) : null,
      ]
    )
  );

  const anschlussUebersicht = aktuell.situationId
    ? el("div", { class: "hinweis", style: { marginTop: ".8rem" } }, [
        el("p", {}, [
          el("strong", { text: "Anschlüsse: " }),
          document.createTextNode(
            "Jede Aufgabe bekommt einen Einleitungssatz, der sie an die Situation zurückbindet. " +
              "Den Handlungsschritt kannst du pro Aufgabe unten ändern."
          ),
        ]),
        el("div", { class: "zeile-eng" }, [
          el("button", {
            class: "btn klein",
            text: "Anschlüsse auf alle Aufgaben anwenden",
            onclick: () => {
              const s = situationNach(aktuell.situationId);
              const n = anschluesseAnwenden(aktuell, s, true);
              aendern(true);
              meldung(`${n} Aufgaben angepasst.`, "gut");
            },
          }),
          el("button", {
            class: "btn sekundaer klein",
            text: "nur leere ergänzen",
            onclick: () => {
              const s = situationNach(aktuell.situationId);
              const n = anschluesseAnwenden(aktuell, s, false);
              aendern(true);
              meldung(`${n} Aufgaben ergänzt.`, "gut");
            },
          }),
          el("button", {
            class: "btn sekundaer klein",
            text: "alle Anschlüsse entfernen",
            onclick: () => {
              aktuell.aufgaben.forEach((a) => (a.situationsAnschluss = ""));
              aendern(true);
            },
          }),
        ]),
      ])
    : null;

  return el("details", { class: "karte", open: !!aktuell.ausgangssituation || !aktuell.aufgaben.length }, [
    el("summary", { style: { cursor: "pointer", fontWeight: "700", color: "var(--navy)" } }, [
      document.createTextNode("Ausgangssituation"),
      el("span", {
        class: "klein grau",
        text: aktuell.situationTitel ? `  ·  ${aktuell.situationTitel}` : "  ·  keine gewählt",
      }),
    ]),
    el("p", {
      class: "klein grau",
      style: { marginTop: ".6rem" },
      text:
        "Eine Klassenarbeit an beruflichen Schulen soll von einem authentischen Problem getragen " +
        "werden, das sich als roter Faden durchzieht. Wähle eine Vorlage oder schreibe eine eigene.",
    }),
    el("div", { class: "spalten spalten-3", style: { marginBottom: ".9rem" } }, karten),
    bereichFeld(aktuell, "ausgangssituation", "Text der Ausgangssituation", {
      zeilen: 7,
      hinweis: "Erscheint auf dem Aufgabenblatt in einem Kasten und in der App vor Aufgabe 1.",
    }),
    anschlussUebersicht,
  ]);
}

function situationWaehlen(s) {
  aktuell.situationId = s.id;
  aktuell.situationTitel = s.titel;
  if (s.id !== "frei") {
    aktuell.ausgangssituation = s.text;
    if (!aktuell.thema) aktuell.thema = s.titel;
    anschluesseAnwenden(aktuell, s, true);
  }
  aendern(true);
  meldung(s.id === "frei" ? "Eigene Situation – bitte Text eintragen." : `Situation „${s.titel}“ übernommen.`, "gut");
}

/* ------------------------------------------------------------ Notenschlüssel */

function notenschluesselKarte() {
  const s = aktuell.notenschluessel;
  const gesamt = gesamtPunkte(aktuell);

  const vorlagenWahl = el("select");
  Object.entries(VORLAGEN).forEach(([k, v]) => {
    vorlagenWahl.appendChild(el("option", { value: k, text: v.name, selected: s.name === v.name }));
  });
  vorlagenWahl.appendChild(el("option", { value: "__eigen", text: "eigene Schwellen …", selected: !Object.values(VORLAGEN).some((v) => v.name === s.name) }));
  vorlagenWahl.addEventListener("change", () => {
    if (vorlagenWahl.value === "__eigen") {
      aktuell.notenschluessel = { ...strukturKlon(VORLAGEN.ihk), name: "Eigener Schlüssel", tendenzen: true };
    } else {
      aktuell.notenschluessel = strukturKlon(VORLAGEN[vorlagenWahl.value]);
    }
    aendern(true);
  });

  const parameter = [];
  if (s.art === "formel") {
    parameter.push(
      zahlFeldEin(s, "einsAbProzent", "Note 1,0 ab … %", { min: 50, schritt: 1, neuZeichnen: true }),
      zahlFeldEin(s, "sechsAbProzent", "Note 6,0 bei … %", { min: 0, schritt: 1, neuZeichnen: true })
    );
  } else {
    s.tabelle.forEach((z) => {
      if (z.note === 6) return;
      parameter.push(
        (() => {
          const e = el("input", { type: "number", value: z.abProzent, min: 0, max: 100, step: 1, class: "schmal" });
          e.addEventListener("input", () => {
            z.abProzent = Number(e.value);
            aendern(true);
          });
          return feld(`Note ${z.note} ab … %`, e);
        })()
      );
    });
  }

  const tabelle = punkteNotenTabelle(gesamt, s, 0.5);
  const spalten = 4;
  const proSpalte = Math.ceil(tabelle.length / spalten);
  const vorschau = el("div", { class: "spalten", style: { gridTemplateColumns: `repeat(${spalten}, minmax(0,1fr))` } });
  for (let i = 0; i < spalten; i++) {
    const teil = tabelle.slice(i * proSpalte, (i + 1) * proSpalte);
    if (!teil.length) continue;
    vorschau.appendChild(
      el("table", { class: "liste" }, [
        el("thead", {}, [el("tr", {}, [el("th", { text: "Punkte" }), el("th", { class: "zahl", text: "Note" })])]),
        el(
          "tbody",
          {},
          teil.map((z) => el("tr", {}, [el("td", { text: z.bereich }), el("td", { class: "zahl fett", text: z.noteText })]))
        ),
      ])
    );
  }

  return el("details", { class: "karte" }, [
    el("summary", { style: { cursor: "pointer", fontWeight: "700", color: "var(--navy)" } }, [
      document.createTextNode("Notenschlüssel"),
      el("span", { class: "klein grau", text: `  ·  ${s.name ?? "eigen"} · ${formatPunkte(gesamt)} Punkte` }),
    ]),
    el("div", { class: "spalten spalten-3", style: { marginTop: ".7rem" } }, [
      feld("Vorlage", vorlagenWahl, s.beschreibung ?? ""),
      ...parameter,
      el("div", {}, [schalter(s, "tendenzen", "Zehntelnoten (1,3 / 1,7 …)", true)]),
    ]),
    gesamt > 0
      ? el("div", {}, [el("h4", { text: "Punkte-Noten-Tabelle" }), vorschau])
      : el("p", { class: "leer", text: "Sobald Aufgaben angelegt sind, erscheint hier die Punkte-Noten-Tabelle." }),
  ]);
}

/* ------------------------------------------------------------------ Aufgaben */

function aufgabenKarte() {
  const liste = el("div", { class: "aufgaben-liste" });
  aktuell.aufgaben.forEach((a, i) => liste.appendChild(aufgabenEditor(a, i)));
  if (!aktuell.aufgaben.length) {
    liste.appendChild(
      el("div", { class: "leer-zustand" }, [
        el("div", { class: "zeichen", text: "✎" }),
        el("div", { class: "titel", text: "Noch keine Aufgabe" }),
        el("p", {
          text:
            "Wähle oben eine Aufgabenart. Am schnellsten geht es, wenn du zuerst eine " +
            "Ausgangssituation festlegst – dann bekommt jede neue Aufgabe automatisch den " +
            "passenden Einleitungssatz.",
        }),
        el("button", { class: "btn gross", text: "+ Erste Aufgabe anlegen", onclick: typAuswahl }),
      ])
    );
  }

  return el("div", { class: "karte" }, [
    el("div", { class: "karte-kopf" }, [
      el("h3", { text: "Aufgaben" }),
      el("div", { class: "zeile-eng" }, [
        el("span", { class: "plakette info", text: `${formatPunkte(gesamtPunkte(aktuell))} Punkte insgesamt` }),
        el("button", { class: "btn", text: "+ Aufgabe hinzufügen", onclick: typAuswahl }),
      ]),
    ]),
    liste,
  ]);
}

/** Aufgabentyp im Dialog wählen – mit Erklärung statt bloßem Knopf. */
function typAuswahl() {
  const dlg = el("dialog", { style: { maxWidth: "min(56rem, 95vw)" } });
  const inhalt = el("div", { class: "dlg-inhalt" }, [
    el("div", { class: "karte-kopf" }, [
      el("h2", { style: { margin: 0 }, text: "Welche Art von Aufgabe?" }),
      el("button", { class: "btn leise", text: "Schließen", onclick: () => dlg.close() }),
    ]),
    el("p", {
      class: "klein grau",
      text: "13 der 14 Arten werden vollautomatisch korrigiert. Nur der Freitext wird von dir bewertet.",
    }),
  ]);

  TYP_GRUPPEN.forEach((gruppe) => {
    const typen = Object.entries(AUFGABENTYPEN).filter(([, t]) => t.gruppe === gruppe);
    if (!typen.length) return;
    inhalt.appendChild(el("div", { class: "typ-gruppe", text: gruppe }));
    inhalt.appendChild(
      el(
        "div",
        { class: "typ-gitter" },
        typen.map(([k, t]) =>
          el("button", {
            class: "kachel",
            type: "button",
            onclick: () => {
              aufgabeAnlegen(k);
              dlg.close();
            },
          }, [
            el("div", { class: "zeile-eng", style: { marginBottom: ".15rem" } }, [
              el("span", { class: "kachel-titel", text: t.name }),
              el("span", { class: `plakette ${t.auto ? "gut" : "teil"}`, text: t.auto ? "automatisch" : "manuell" }),
            ]),
            el("div", { class: "kachel-zeile", text: t.kurz }),
          ])
        )
      )
    );
  });

  dlg.appendChild(inhalt);
  dlg.addEventListener("close", () => dlg.remove());
  document.body.appendChild(dlg);
  dlg.showModal();
}

function aufgabeAnlegen(typ) {
  const neu = neueAufgabe(typ);
  const situation = situationNach(aktuell.situationId);
  if (situation) {
    neu.handlungsschritt = TYP_ZU_SCHRITT[typ] ?? "durchfuehren";
    neu.situationsAnschluss = situation.anschluesse?.[neu.handlungsschritt] ?? "";
  }
  aktuell.aufgaben.push(neu);
  aendern(true);
  // Die neue Aufgabe gleich aufklappen und anspringen.
  setTimeout(() => {
    const karten = behaelter.querySelectorAll(".aufgabe-karte");
    const letzte = karten[karten.length - 1];
    if (letzte) {
      letzte.open = true;
      letzte.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 30);
}

function aufgabenEditor(a, index) {
  const typ = AUFGABENTYPEN[a.typ];
  const kopf = el("summary", {}, [
    el("span", { class: "nr-marke", text: String(index + 1) }),
    el("span", { text: typ?.name ?? a.typ }),
    a.titel ? el("span", { class: "klein grau", text: `· ${a.titel}` }) : null,
    el("span", { class: "plakette info", text: `${formatPunkte(aufgabenPunkte(a))} P.` }),
    typ && !typ.auto ? el("span", { class: "plakette teil", text: "manuell" }) : null,
    el("span", { class: "schieb-rechts" }),
    el("span", { class: "zeile-eng" }, [
      werkzeug("↑", () => verschiebe(index, -1)),
      werkzeug("↓", () => verschiebe(index, 1)),
      werkzeug("⧉", () => {
        const kopie = JSON.parse(JSON.stringify(a));
        kopie.id = neueId("a");
        aktuell.aufgaben.splice(index + 1, 0, kopie);
        aendern(true);
      }, "duplizieren"),
      werkzeug("✕", async () => {
        if (await frage("Aufgabe löschen?", `Aufgabe ${index + 1} wird entfernt.`, { gefaehrlich: true, jaText: "Löschen" })) {
          aktuell.aufgaben.splice(index, 1);
          aendern(true);
        }
      }, "löschen"),
    ]),
  ]);

  const koerper = el("div", { class: "koerper" }, [
    el("div", { class: "spalten spalten-2" }, [
      textFeld(a, "titel", "Kurztitel (erscheint in der Aufgabenübersicht)", { platzhalter: "Wirtschaftskreislauf" }),
      textFeld(a, "abschnitt", "Abschnittsüberschrift (optional)", {
        platzhalter: "Wertschöpfung und BIP",
        hinweis: "Gleiche Überschrift bei mehreren Aufgaben fasst sie zusammen.",
      }),
    ]),
    anschlussZeile(a),
    bereichFeld(a, "text", "Aufgabenstellung", {
      zeilen: 4,
      hinweis: "**fett** · *kursiv* · `code` · Aufzählung mit „- “ am Zeilenanfang",
    }),
    ...typEditor(a),
  ]);

  const karte = el("details", { class: "aufgabe-karte" }, [kopf, koerper]);
  return karte;
}

function werkzeug(text, beiKlick, titel = "") {
  return el("button", {
    class: "btn sekundaer klein",
    text,
    title: titel,
    onclick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      beiKlick();
    },
  });
}

function verschiebe(index, richtung) {
  const ziel = index + richtung;
  if (ziel < 0 || ziel >= aktuell.aufgaben.length) return;
  const [x] = aktuell.aufgaben.splice(index, 1);
  aktuell.aufgaben.splice(ziel, 0, x);
  aendern(true);
}

function anschlussZeile(a) {
  const s = situationNach(aktuell.situationId);
  const wahl = el("select", { class: "schmal" });
  wahl.appendChild(el("option", { value: "", text: "– kein Anschluss –" }));
  Object.entries(HANDLUNGSSCHRITTE).forEach(([k, v]) =>
    wahl.appendChild(el("option", { value: k, text: `${v.name} (AFB ${v.afb})`, selected: a.handlungsschritt === k }))
  );
  wahl.addEventListener("change", () => {
    a.handlungsschritt = wahl.value;
    a.situationsAnschluss = wahl.value && s ? s.anschluesse?.[wahl.value] ?? "" : "";
    aendern(true);
  });

  return el("div", { class: "spalten spalten-2" }, [
    feld("Handlungsschritt", wahl, s ? "" : "Erst eine Ausgangssituation wählen, dann füllt sich der Anschluss automatisch."),
    bereichFeld(a, "situationsAnschluss", "Anschluss an die Situation (steht vor der Aufgabenstellung)", { zeilen: 2 }),
  ]);
}

/* ------------------------------------------------- Editoren je Aufgabentyp */

function listeBearbeiten(titel, eintraege, spalten, beiNeu, neuText = "+ Zeile") {
  const box = el("div", {}, [el("h4", { text: titel })]);
  eintraege.forEach((eintrag, i) => {
    box.appendChild(
      el("div", { class: "teil-zeile", style: { gridTemplateColumns: spalten.raster } }, [
        ...spalten.bauen(eintrag, i),
        werkzeug("✕", () => {
          eintraege.splice(i, 1);
          aendern(true);
        }, "entfernen"),
      ])
    );
  });
  box.appendChild(el("button", { class: "btn sekundaer klein", text: neuText, onclick: beiNeu }));
  return box;
}

function kurzText(objekt, name, platzhalter = "") {
  const e = el("input", { type: "text", value: objekt[name] ?? "", placeholder: platzhalter });
  e.addEventListener("input", () => {
    objekt[name] = e.value;
    aendern();
  });
  return e;
}

function kurzZahl(objekt, name, { schritt = 0.5, min = 0, breite = "5rem" } = {}) {
  const e = el("input", { type: "number", value: objekt[name] ?? 0, step: schritt, min, style: { maxWidth: breite } });
  e.addEventListener("input", () => {
    objekt[name] = Number(e.value);
    aendern(true);
  });
  return e;
}

function typEditor(a) {
  switch (a.typ) {
    case "mc":
      return [
        el("div", { class: "zeile" }, [
          schalter(a, "mehrfach", "Mehrfachauswahl", true),
          schalter(a, "teilpunkte", "Teilpunkte vergeben"),
          schalter(a, "mischen", "Antworten mischen"),
          zahlFeldEin(a, "punkte", "Punkte", { schritt: 0.5 }),
        ]),
        listeBearbeiten(
          "Antwortmöglichkeiten",
          a.optionen,
          {
            raster: "auto 1fr auto",
            bauen: (o) => {
              const haken = el("input", { type: "checkbox", checked: !!o.richtig, title: "richtig" });
              haken.addEventListener("change", () => {
                o.richtig = haken.checked;
                aendern();
              });
              return [haken, kurzText(o, "text", "Antworttext")];
            },
          },
          () => {
            a.optionen.push({ id: neueId("o"), text: "", richtig: false });
            aendern(true);
          },
          "+ Antwort"
        ),
        el("p", { class: "klein grau", text: "Haken = richtige Antwort." }),
      ];

    case "wahrfalsch":
      return [
        el("div", { class: "zeile" }, [
          zahlFeldEin(a, "punkteProZeile", "Punkte je Aussage", { schritt: 0.5, neuZeichnen: true }),
          textFeld(a, "rasterUeberschrift", "Überschrift der Aussagenspalte", { platzhalter: "Vorgang" }),
        ]),
        listeBearbeiten(
          "Spalten (zum Ankreuzen)",
          a.spalten,
          { raster: "1fr auto", bauen: (s) => [kurzText(s, "text", "z. B. Geldstrom")] },
          () => {
            a.spalten.push({ id: neueId("s"), text: "" });
            aendern(true);
          },
          "+ Spalte"
        ),
        listeBearbeiten(
          "Aussagen",
          a.zeilen,
          {
            raster: "1fr 12rem auto",
            bauen: (z) => {
              const wahl = el("select");
              wahl.appendChild(el("option", { value: "", text: "– Lösung wählen –" }));
              a.spalten.forEach((s) =>
                wahl.appendChild(el("option", { value: s.id, text: s.text || "(leer)", selected: z.richtig === s.id }))
              );
              wahl.addEventListener("change", () => {
                z.richtig = wahl.value;
                aendern();
              });
              return [kurzText(z, "text", "Aussage"), wahl];
            },
          },
          () => {
            a.zeilen.push({ id: neueId("z"), text: "", richtig: "" });
            aendern(true);
          },
          "+ Aussage"
        ),
      ];

    case "kurzantwort":
      return [
        el("div", { class: "zeile" }, [
          zahlFeldEin(a, "punkte", "Punkte", { schritt: 0.5 }),
          schalter(a, "ignoriereGross", "Groß-/Kleinschreibung egal"),
          schalter(a, "ignoriereLeerzeichen", "Leerzeichen egal"),
          schalter(a, "tippfehler", "einen Tippfehler verzeihen"),
          schalter(a, "alsRegex", "Lösungen sind reguläre Ausdrücke"),
          schalter(a, "alsCode", "Eingabefeld in Schreibmaschinenschrift"),
        ]),
        listeBearbeiten(
          "Akzeptierte Lösungen",
          a.loesungen.map((wert, i) => ({ wert, i })),
          {
            raster: "1fr auto",
            bauen: (o) => {
              const e = el("input", { type: "text", value: a.loesungen[o.i] ?? "", placeholder: "Lösung" });
              e.addEventListener("input", () => {
                a.loesungen[o.i] = e.value;
                aendern();
              });
              return [e];
            },
          },
          () => {
            a.loesungen.push("");
            aendern(true);
          },
          "+ Lösung"
        ),
      ];

    case "stichworte":
      return [
        el("div", { class: "zeile" }, [
          zahlFeldEin(a, "zeilen", "Zeilen für die Antwort", { min: 1 }),
          zahlFeldEin(a, "maxPunkte", "Höchstpunktzahl (0 = Summe)", { schritt: 0.5, neuZeichnen: true }),
        ]),
        listeBearbeiten(
          "Gesuchte Stichwörter",
          a.begriffe,
          {
            raster: "1fr 6rem auto",
            bauen: (b) => [
              kurzText(b, "varianten", "Begriff | Synonym | weitere Schreibweise"),
              kurzZahl(b, "punkte"),
            ],
          },
          () => {
            a.begriffe.push({ id: neueId("b"), varianten: "", punkte: 1 });
            aendern(true);
          },
          "+ Stichwort"
        ),
        el("p", {
          class: "klein grau",
          text: "Der Antworttext wird nach diesen Begriffen durchsucht. Varianten mit | trennen.",
        }),
      ];

    case "aufzaehlung":
      return [
        el("div", { class: "zeile" }, [
          zahlFeldEin(a, "anzahlFelder", "Anzahl Eingabefelder", { min: 1, neuZeichnen: true }),
          textFeld(a, "beschriftung", "Beschriftung", { platzhalter: "Vorteil" }),
          zahlFeldEin(a, "maxPunkte", "Höchstpunktzahl (0 = Summe)", { schritt: 0.5, neuZeichnen: true }),
        ]),
        listeBearbeiten(
          "Gesuchte Nennungen",
          a.gesucht,
          {
            raster: "1fr 6rem auto",
            bauen: (g) => [kurzText(g, "varianten", "Nennung | Synonym | Umschreibung"), kurzZahl(g, "punkte")],
          },
          () => {
            a.gesucht.push({ id: neueId("g"), varianten: "", punkte: 1 });
            aendern(true);
          },
          "+ Nennung"
        ),
        el("p", {
          class: "klein grau",
          text: "Jede Eingabe zählt höchstens einmal – dieselbe Nennung doppelt bringt keine zusätzlichen Punkte.",
        }),
      ];

    case "zuordnung":
      return [
        el("div", { class: "zeile" }, [
          zahlFeldEin(a, "punkteProPaar", "Punkte je Paar", { schritt: 0.5, neuZeichnen: true }),
          schalter(a, "mischen", "rechte Spalte mischen"),
        ]),
        listeBearbeiten(
          "Paare",
          a.paare,
          {
            raster: "1fr 1fr auto",
            bauen: (p) => [kurzText(p, "links", "Begriff"), kurzText(p, "rechts", "gehört zu")],
          },
          () => {
            a.paare.push({ id: neueId("p"), links: "", rechts: "" });
            aendern(true);
          },
          "+ Paar"
        ),
      ];

    case "reihenfolge":
      return [
        el("div", { class: "zeile" }, [
          auswahlFeld(a, "wertung", "Wertung", [
            ["nachbarn", "Teilpunkte je richtiger Abfolge"],
            ["alles", "alles oder nichts"],
          ], true),
          a.wertung === "alles"
            ? zahlFeldEin(a, "punkte", "Punkte", { schritt: 0.5 })
            : zahlFeldEin(a, "punkteProSchritt", "Punkte je Übergang", { schritt: 0.5, neuZeichnen: true }),
        ]),
        listeBearbeiten(
          "Elemente in der RICHTIGEN Reihenfolge",
          a.elemente,
          { raster: "1fr auto", bauen: (e) => [kurzText(e, "text", "Schritt")] },
          () => {
            a.elemente.push({ id: neueId("e"), text: "" });
            aendern(true);
          },
          "+ Element"
        ),
        el("p", { class: "klein grau", text: "Den SuS werden die Elemente gemischt angezeigt." }),
      ];

    case "lueckentext":
      return [
        el("div", { class: "zeile" }, [
          zahlFeldEin(a, "punkteProLuecke", "Punkte je Lücke", { schritt: 0.5, neuZeichnen: true }),
          schalter(a, "ignoriereGross", "Groß-/Kleinschreibung egal"),
          schalter(a, "tippfehler", "einen Tippfehler verzeihen"),
          schalter(a, "alsCode", "als Code darstellen"),
        ]),
        bereichFeld(a, "vorlage", "Text mit Lücken", {
          zeilen: 5,
          code: !!a.alsCode,
          hinweis: "Lücke: [[Lösung]] · mehrere zulässige Lösungen mit | trennen: [[for|for-Schleife]]",
        }),
      ];

    case "zahl":
      return [
        el("div", { class: "zeile" }, [
          zahlFeldEin(a, "punkte", "Punkte", { schritt: 0.5 }),
          textFeld(a, "loesung", "Lösungswert", { breite: "10rem" }),
          textFeld(a, "toleranz", "Toleranz ±", { breite: "8rem" }),
          textFeld(a, "einheit", "Einheit", { breite: "8rem", platzhalter: "€, Mio. €, %" }),
        ]),
      ];

    case "rechenweg":
      return [
        listeBearbeiten(
          "Teilergebnisse",
          a.schritte,
          {
            raster: "1.6fr 8rem 6rem 6rem 5rem auto",
            bauen: (s) => [
              kurzText(s, "bezeichnung", "Bezeichnung"),
              kurzText(s, "loesung", "Lösung"),
              kurzText(s, "toleranz", "± Toleranz"),
              kurzText(s, "einheit", "Einheit"),
              kurzZahl(s, "punkte"),
            ],
          },
          () => {
            a.schritte.push({ id: neueId("r"), bezeichnung: "", loesung: "0", toleranz: 0, einheit: "", punkte: 2 });
            aendern(true);
          },
          "+ Teilergebnis"
        ),
      ];

    case "code-python":
      return [
        bereichFeld(a, "startcode", "Startcode (wird den SuS vorgegeben)", { zeilen: 6, code: true }),
        bereichFeld(a, "vorlaufcode", "Vorlaufcode (läuft vor dem Schülercode, z. B. Hilfsfunktionen)", {
          zeilen: 3,
          code: true,
        }),
        bereichFeld(a, "loesungscode", "Musterlösung (nur für dein Lösungsblatt)", { zeilen: 6, code: true }),
        pythonTests(a, "tests", "Bewertete Testfälle"),
        pythonTests(a, "selbsttests", "Selbsttests für die SuS (zählen nicht, sind sichtbar)"),
      ];

    case "parsons":
      return [
        el("div", { class: "zeile" }, [
          zahlFeldEin(a, "punkteProZeile", "Punkte je Zeile", { schritt: 0.5, neuZeichnen: true }),
          schalter(a, "pruefeEinrueckung", "Einrückung mitbewerten"),
        ]),
        listeBearbeiten(
          "Codezeilen in der RICHTIGEN Reihenfolge",
          a.zeilen,
          {
            raster: "1fr 7rem auto",
            bauen: (z) => {
              const t = kurzText(z, "text", "Codezeile");
              t.classList.add("mono");
              const tiefe = el("input", { type: "number", value: z.einrueckung ?? 0, min: 0, max: 6, style: { maxWidth: "6rem" }, title: "Einrückungstiefe" });
              tiefe.addEventListener("input", () => {
                z.einrueckung = Number(tiefe.value);
                aendern();
              });
              return [t, tiefe];
            },
          },
          () => {
            a.zeilen.push({ id: neueId("z"), text: "", einrueckung: 0 });
            aendern(true);
          },
          "+ Codezeile"
        ),
        listeBearbeiten(
          "Ablenkerzeilen (falsche Zeilen, die nicht gebraucht werden)",
          a.ablenker,
          {
            raster: "1fr auto",
            bauen: (z) => {
              const t = kurzText(z, "text", "falsche Codezeile");
              t.classList.add("mono");
              return [t];
            },
          },
          () => {
            a.ablenker.push({ id: neueId("z"), text: "" });
            aendern(true);
          },
          "+ Ablenker"
        ),
      ];

    case "code-web":
      return [
        el("div", { class: "zeile" }, [schalter(a, "jsAktiv", "JavaScript freischalten", true)]),
        el("div", { class: "spalten spalten-2" }, [
          bereichFeld(a, "startHtml", "Start-HTML", { zeilen: 6, code: true, sprache: "html" }),
          bereichFeld(a, "startCss", "Start-CSS", { zeilen: 6, code: true, sprache: "css" }),
        ]),
        a.jsAktiv ? bereichFeld(a, "startJs", "Start-JavaScript", { zeilen: 5, code: true, sprache: "javascript" }) : null,
        el("details", {}, [
          el("summary", { class: "klein", style: { cursor: "pointer" }, text: "Musterlösung (für das Lösungsblatt)" }),
          bereichFeld(a, "loesungHtml", "HTML", { zeilen: 5, code: true, sprache: "html" }),
          bereichFeld(a, "loesungCss", "CSS", { zeilen: 5, code: true, sprache: "css" }),
          a.jsAktiv ? bereichFeld(a, "loesungJs", "JavaScript", { zeilen: 5, code: true, sprache: "javascript" }) : null,
        ]),
        webTests(a),
      ];

    case "freitext":
      return [
        el("div", { class: "zeile" }, [zahlFeldEin(a, "zeilen", "Schreiblinien im Ausdruck", { min: 1 })]),
        bereichFeld(a, "erwartungshorizont", "Erwartungshorizont", { zeilen: 5 }),
        listeBearbeiten(
          "Bewertungskriterien",
          a.kriterien,
          { raster: "1fr 6rem auto", bauen: (k) => [kurzText(k, "text", "Kriterium"), kurzZahl(k, "punkte")] },
          () => {
            a.kriterien.push({ id: neueId("k"), text: "", punkte: 2 });
            aendern(true);
          },
          "+ Kriterium"
        ),
      ];

    default:
      return [];
  }
}

/* --------------------------------------------------------------- Testfälle */

function pythonTests(a, feldName, titel) {
  const tests = a[feldName] ?? (a[feldName] = []);
  const box = el("div", { style: { marginTop: ".8rem" } }, [el("h4", { text: titel })]);

  tests.forEach((t, i) => {
    const artWahl = el("select", { class: "schmal" });
    [
      ["funktion", "Funktion aufrufen"],
      ["ausgabe", "Ausgabe vergleichen"],
      ["assert", "freier Prüfcode"],
      ["enthaelt", "Code enthält / enthält nicht"],
    ].forEach(([w, txt]) => artWahl.appendChild(el("option", { value: w, text: txt, selected: t.art === w })));
    artWahl.addEventListener("change", () => {
      const neu = neuerPythonTest(artWahl.value);
      neu.id = t.id;
      neu.name = t.name;
      neu.punkte = t.punkte;
      tests[i] = neu;
      aendern(true);
    });

    const spezifisch = [];
    if (t.art === "funktion") {
      spezifisch.push(
        feld("Funktion", kurzText(t, "funktion", "loese")),
        feld("Argumente", kurzText(t, "argumente", "3, 4")),
        feld("Erwartetes Ergebnis", kurzText(t, "erwartet", "7"))
      );
    } else if (t.art === "ausgabe") {
      spezifisch.push(
        feld("Eingaben (stdin, je Zeile)", kurzText(t, "eingabe", "")),
        bereichFeld(t, "erwartet", "Erwartete Ausgabe", { zeilen: 2, code: true })
      );
    } else if (t.art === "enthaelt") {
      spezifisch.push(
        feld("Suchmuster (Text oder regulärer Ausdruck)", kurzText(t, "muster", "for")),
        el("div", {}, [schalter(t, "vorhanden", "muss vorkommen (sonst: darf nicht vorkommen)")])
      );
    } else {
      spezifisch.push(bereichFeld(t, "code", "Prüfcode (assert …)", { zeilen: 3, code: true }));
    }

    box.appendChild(
      el("div", { style: { border: "1px solid var(--grey-200)", borderRadius: "6px", padding: ".6rem .7rem", marginBottom: ".5rem" } }, [
        el("div", { class: "zeile" }, [
          feld("Bezeichnung", kurzText(t, "name", "Testfall")),
          feld("Art", artWahl),
          feldName === "tests" ? feld("Punkte", kurzZahl(t, "punkte")) : null,
          el("span", { class: "schieb-rechts" }),
          werkzeug("✕", () => {
            tests.splice(i, 1);
            aendern(true);
          }, "Testfall entfernen"),
        ]),
        el("div", { class: "spalten spalten-3" }, spezifisch),
      ])
    );
  });

  box.appendChild(
    el("button", {
      class: "btn sekundaer klein",
      text: "+ Testfall",
      onclick: () => {
        tests.push(neuerPythonTest());
        aendern(true);
      },
    })
  );
  return box;
}

function webTests(a) {
  const box = el("div", { style: { marginTop: ".8rem" } }, [el("h4", { text: "Bewertete Prüfungen" })]);
  a.tests.forEach((t, i) => {
    const artWahl = el("select", { class: "schmal" });
    [
      ["selektor", "Element vorhanden"],
      ["text", "Textinhalt"],
      ["attribut", "Attribut"],
      ["stil", "berechneter CSS-Stil"],
      ["js", "JavaScript-Ausdruck"],
    ].forEach(([w, txt]) => artWahl.appendChild(el("option", { value: w, text: txt, selected: t.art === w })));
    artWahl.addEventListener("change", () => {
      const neu = neuerWebTest(artWahl.value);
      neu.id = t.id;
      neu.name = t.name;
      neu.punkte = t.punkte;
      a.tests[i] = neu;
      aendern(true);
    });

    const spezifisch = [];
    if (t.art === "selektor") {
      spezifisch.push(feld("CSS-Selektor", kurzText(t, "selektor", "ul > li")), feld("mindestens", kurzZahl(t, "mindestens", { schritt: 1 })));
    } else if (t.art === "text") {
      spezifisch.push(
        feld("CSS-Selektor", kurzText(t, "selektor", "h1")),
        feld("erwarteter Text", kurzText(t, "erwartet", "")),
        el("div", {}, [schalter(t, "exakt", "exakt (sonst: enthält)")])
      );
    } else if (t.art === "attribut") {
      spezifisch.push(
        feld("CSS-Selektor", kurzText(t, "selektor", "img")),
        feld("Attribut", kurzText(t, "attribut", "alt")),
        feld("erwarteter Wert (leer = nur vorhanden)", kurzText(t, "erwartet", ""))
      );
    } else if (t.art === "stil") {
      spezifisch.push(
        feld("CSS-Selektor", kurzText(t, "selektor", "h1")),
        feld("Eigenschaft", kurzText(t, "eigenschaft", "color")),
        feld("erwarteter Wert", kurzText(t, "erwartet", "rgb(0, 52, 77)"))
      );
    } else {
      spezifisch.push(feld("JavaScript-Ausdruck (muss wahr ergeben)", kurzText(t, "ausdruck", "berechne(2,3) === 5")));
    }

    box.appendChild(
      el("div", { style: { border: "1px solid var(--grey-200)", borderRadius: "6px", padding: ".6rem .7rem", marginBottom: ".5rem" } }, [
        el("div", { class: "zeile" }, [
          feld("Bezeichnung", kurzText(t, "name", "Testfall")),
          feld("Art", artWahl),
          feld("Punkte", kurzZahl(t, "punkte")),
          el("span", { class: "schieb-rechts" }),
          werkzeug("✕", () => {
            a.tests.splice(i, 1);
            aendern(true);
          }, "entfernen"),
        ]),
        el("div", { class: "spalten spalten-3" }, spezifisch),
      ])
    );
  });
  box.appendChild(
    el("button", {
      class: "btn sekundaer klein",
      text: "+ Prüfung",
      onclick: () => {
        a.tests.push(neuerWebTest());
        aendern(true);
      },
    })
  );
  return box;
}

/* ------------------------------------------------------------------ Aktionen */

function aktionsKarte() {
  const probleme = pruefeMaster(aktuell);

  return el("div", { class: "karte" }, [
    el("h3", { text: "Prüfen und ausgeben" }),
    probleme.length
      ? el("div", { class: "hinweis warn" }, [
          el("p", {}, [el("strong", { text: `${probleme.length} Hinweis${probleme.length === 1 ? "" : "e"}:` })]),
          el("ul", {}, probleme.map((p) => el("li", { text: p }))),
        ])
      : el("div", { class: "hinweis gut", text: "Die Arbeit ist vollständig und kann ausgegeben werden." }),

    el("p", {
      class: "klein grau",
      style: { marginTop: ".7rem" },
      text:
        "„Datei für die Klasse“ erzeugt die Fassung ohne Lösungen (.jjwsp). Diese Datei kommt in den " +
        "Tauschordner. Der Master mit den Lösungen bleibt bei dir.",
    }),
  ]);
}

/** Immer sichtbare Leiste mit den vier Ausgaben. */
function aktionsLeiste() {
  return el("div", { class: "aktionsleiste" }, [
    el("button", { class: "btn sekundaer", text: "👁 Vorschau", title: "So sehen es die SuS", onclick: vorschau }),
    el("button", { class: "btn sekundaer", text: "🖶 Angabe", title: "Leere Arbeit als PDF drucken", onclick: () => druckAnsicht({ modus: "leer", pruefung: aktuell }) }),
    el("button", { class: "btn sekundaer", text: "🖶 Lösungsblatt", title: "Erwartungshorizont als PDF", onclick: () => druckAnsicht({ modus: "loesung", pruefung: aktuell }) }),
    el("span", { class: "schieb-rechts" }),
    el("button", { class: "btn sekundaer", text: "Master sichern", title: "Datei mit Lösungen für dein Archiv", onclick: masterExport }),
    el("button", { class: "btn dunkel", text: "Datei für die Klasse erzeugen", onclick: susExport }),
  ]);
}

function masterExport() {
  masterSpeichern(aktuell);
  speichereJson(aktuell, `${dateiName(aktuell.titel)}_master.${DATEI_ENDUNG.master}`);
}

async function susExport() {
  const probleme = pruefeMaster(aktuell);
  const echteFehler = probleme.filter((p) => !p.includes("Hinweis –"));
  if (echteFehler.length) {
    const trotzdem = await frage(
      "Es gibt noch offene Punkte",
      `${echteFehler.length} Punkt(e) sind noch offen. Trotzdem ausgeben?`,
      { jaText: "Trotzdem ausgeben", neinText: "Erst korrigieren" }
    );
    if (!trotzdem) return;
  }
  if (!schluessel.vorhanden) {
    meldung("Es fehlt der Schlüssel. Bitte zuerst im Reiter „Schlüssel“ einen anlegen.", "fehler", 9000);
    return;
  }
  masterSpeichern(aktuell);
  const fassung = alsSusFassung(aktuell, schluessel.oeffentlich, schluessel.fingerabdruck);
  speichereJson(fassung, `${dateiName(aktuell.titel)}.${DATEI_ENDUNG.pruefung}`);
  meldung(
    "Datei für die Klasse erzeugt. Diese Datei in den Tauschordner legen – sie enthält keine Lösungen.",
    "gut",
    9000
  );
}

function vorschau() {
  const fassung = alsSusFassung(aktuell, schluessel.oeffentlich ?? {}, schluessel.fingerabdruck ?? "");
  const antworten = {};
  const koerper = el("div", { class: "dlg-inhalt" }, [
    el("div", { class: "karte-kopf" }, [
      el("h2", { text: "Vorschau" }),
      el("button", { class: "btn sekundaer klein", text: "Schließen", onclick: () => dlg.close() }),
    ]),
    fassung.ausgangssituation
      ? el("div", { class: "hinweis", style: { marginBottom: "1rem" } }, [
          el("h4", { text: "Ausgangssituation" }),
          el("div", { style: { whiteSpace: "pre-wrap" }, text: fassung.ausgangssituation }),
        ])
      : null,
    ...fassung.aufgaben.map((a) =>
      el("div", { class: "aufgabe" }, [
        el("div", { class: "kopf" }, [
          el("span", { class: "nr", text: `Aufgabe ${a.nr}${a.titel ? `: ${a.titel}` : ""}` }),
          el("span", { class: "punkte", text: `${a.punkte} P.` }),
        ]),
        a.situationsAnschluss
          ? el("p", { class: "grau", style: { fontStyle: "italic" }, text: a.situationsAnschluss })
          : null,
        el("div", { class: "text", style: { whiteSpace: "pre-wrap" }, text: a.text }),
        baueAntwortfeld(a, antworten[a.id], { aendern: (w) => (antworten[a.id] = w), nurLesen: false }),
      ])
    ),
  ]);
  const dlg = el("dialog", { style: { maxWidth: "min(60rem, 95vw)" } }, [koerper]);
  dlg.addEventListener("close", () => dlg.remove());
  document.body.appendChild(dlg);
  dlg.showModal();
}
