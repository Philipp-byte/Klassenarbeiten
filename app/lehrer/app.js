/* ==========================================================================
   Lehrer-Werkzeug – Hülle mit den vier Bereichen.
   ========================================================================== */

import { el, $, meldung, frage } from "../shared/dom.js";
import { APP_VERSION } from "../shared/model.js";
import {
  schluesselLaden,
  schluesselAnzeigeAktualisieren,
  aufSchluesselAenderung,
  zeigeSchluessel,
  schluessel,
} from "./schluessel.js";
import { zeigeArbeiten } from "./editor.js";
import { zeigeKorrektur } from "./korrektur.js";
import { allesLoeschen, belegung } from "../shared/speicher.js";
import { pyodideVorhanden } from "../shared/python-runner.js";

const inhalt = $("#inhalt");
const tabsLeiste = $("#tabs");

const BEREICHE = [
  { id: "arbeiten", name: "Klassenarbeiten", zeichne: (z) => zeigeArbeiten(z) },
  { id: "korrektur", name: "Korrektur", zeichne: (z) => zeigeKorrektur(z) },
  { id: "schluessel", name: "Schlüssel", zeichne: (z) => zeigeSchluessel(z) },
  { id: "hilfe", name: "Hilfe & Datenschutz", zeichne: (z) => zeigeHilfe(z) },
];

let aktiv = "arbeiten";

function zeichneTabs() {
  tabsLeiste.replaceChildren(
    ...BEREICHE.map((b) =>
      el("button", {
        role: "tab",
        text: b.name,
        "aria-selected": b.id === aktiv ? "true" : "false",
        onclick: () => wechsle(b.id),
      })
    )
  );
}

function wechsle(id) {
  aktiv = id;
  location.hash = id;
  zeichneTabs();
  BEREICHE.find((b) => b.id === id)?.zeichne(inhalt);
}

/* --------------------------------------------------------------- Hilfeseite */

async function zeigeHilfe(ziel) {
  const platz = belegung();
  const pyodide = await pyodideVorhanden();

  ziel.replaceChildren(
    el("div", { class: "karte" }, [
      el("h2", { text: "Ablauf in fünf Schritten" }),
      el("ol", { style: { lineHeight: "1.9" } }, [
        el("li", {}, [el("strong", { text: "Einmalig: " }), document.createTextNode("Im Reiter „Schlüssel“ ein Schlüsselpaar anlegen und die Schlüsseldatei sichern.")]),
        el("li", {}, [el("strong", { text: "Arbeit erstellen: " }), document.createTextNode("Unter „Klassenarbeiten“ eine Arbeit anlegen, Ausgangssituation wählen, Aufgaben ergänzen.")]),
        el("li", {}, [el("strong", { text: "Ausgeben: " }), document.createTextNode("„Datei für die Klasse erzeugen“ – die .jjwsp-Datei in den Tauschordner legen. Sie enthält keine Lösungen.")]),
        el("li", {}, [el("strong", { text: "Schreiben lassen: " }), document.createTextNode("Die SuS öffnen die Prüfungs-App, bearbeiten die Arbeit und legen ihre .jjwsa-Datei im Tauschordner ab.")]),
        el("li", {}, [el("strong", { text: "Korrigieren: " }), document.createTextNode("Unter „Korrektur“ die Arbeit wählen, alle Abgaben hereinziehen, Freitexte nachbewerten, PDFs und Notenliste ausgeben.")]),
      ]),
    ]),

    el("div", { class: "karte" }, [
      el("h3", { text: "Zustand dieses Rechners" }),
      el("table", { class: "liste" }, [
        el("tbody", {}, [
          statusZeile("Version", APP_VERSION, true),
          statusZeile(
            "Schlüssel",
            schluessel.vorhanden ? `vorhanden (${schluessel.fingerabdruck})` : "fehlt – bitte anlegen",
            schluessel.vorhanden
          ),
          statusZeile(
            "Python-Umgebung (Pyodide)",
            pyodide ? "lokal vorhanden" : "fehlt – Programmieraufgaben können nicht geprüft werden",
            pyodide
          ),
          statusZeile("Verschlüsselung des Browsers", window.crypto?.subtle ? "verfügbar" : "NICHT verfügbar – die App muss über http://localhost laufen", !!window.crypto?.subtle),
          statusZeile("Belegter Speicher", `${platz.kb} KB`, true),
        ]),
      ]),
      !pyodide
        ? el("div", { class: "hinweis warn", style: { marginTop: ".8rem" } }, [
            el("p", {}, [
              document.createTextNode("Zum Prüfen von Python-Aufgaben einmalig im Projektordner ausführen: "),
              el("code", { text: "scripts/pyodide-holen.cmd" }),
              document.createTextNode(" (Windows) bzw. "),
              el("code", { text: "./scripts/pyodide-holen.sh" }),
              document.createTextNode(" (macOS/Linux)."),
            ]),
          ])
        : null,
    ]),

    el("div", { class: "karte" }, [
      el("h3", { text: "Datenschutz – was wo liegt" }),
      el("table", { class: "liste" }, [
        el("thead", {}, [el("tr", {}, [el("th", { text: "Daten" }), el("th", { text: "Wo" }), el("th", { text: "Wie lange" })])]),
        el("tbody", {}, [
          datenZeile("Klassenarbeiten mit Lösungen", "Browser dieses Rechners", "bis du sie löschst"),
          datenZeile("Privater Schlüssel", "Browser, mit Passphrase verschlüsselt", "bis du ihn entfernst"),
          datenZeile("Abgaben der SuS", "nur im Arbeitsspeicher dieses Tabs", "bis der Tab geschlossen wird"),
          datenZeile("Namen, Punkte, Noten", "nur im Arbeitsspeicher · Export als PDF/CSV", "nicht dauerhaft gespeichert"),
          datenZeile("Übertragung ins Internet", "findet nicht statt", "—"),
        ]),
      ]),
      el("p", { class: "klein grau", style: { marginTop: ".7rem" } }, [
        document.createTextNode("Ausführlich in der Datei "),
        el("code", { text: "DATENSCHUTZ.md" }),
        document.createTextNode(" im Projektordner."),
      ]),
      el("div", { class: "zeile", style: { marginTop: "1rem" } }, [
        el("button", {
          class: "btn warnung",
          text: "Alle lokalen Daten dieser App löschen",
          onclick: async () => {
            if (
              await frage(
                "Wirklich alles löschen?",
                "Klassenarbeiten, Schlüssel und Einstellungen werden aus diesem Browser entfernt. " +
                  "Gesicherte Dateien bleiben erhalten.",
                { gefaehrlich: true, jaText: "Alles löschen" }
              )
            ) {
              const n = allesLoeschen();
              meldung(`${n} Einträge gelöscht. Die Seite wird neu geladen.`, "warn");
              setTimeout(() => location.reload(), 1200);
            }
          },
        }),
      ]),
    ]),

    el("div", { class: "karte" }, [
      el("h3", { text: "Dateiendungen" }),
      el("table", { class: "liste" }, [
        el("tbody", {}, [
          datenZeile(".jjwsm", "Master mit Lösungen", "bleibt bei dir"),
          datenZeile(".jjwsp", "Fassung für die Klasse, ohne Lösungen", "kommt in den Tauschordner"),
          datenZeile(".jjwsa", "verschlüsselte Abgabe einer Person", "kommt aus dem Tauschordner"),
          datenZeile(".jjwskey", "dein privater Schlüssel, passphrasengeschützt", "sicher aufbewahren"),
        ]),
      ]),
    ])
  );
}

function statusZeile(bez, wert, gut) {
  return el("tr", {}, [
    el("td", { style: { width: "18rem", fontWeight: "700" }, text: bez }),
    el("td", {}, [
      el("span", { class: `plakette ${gut ? "gut" : "fehler"}`, text: gut ? "OK" : "Achtung" }),
      document.createTextNode(" " + wert),
    ]),
  ]);
}

function datenZeile(...zellen) {
  return el("tr", {}, zellen.map((z, i) => el("td", { class: i === 0 ? "fett" : "", text: z })));
}

/* ------------------------------------------------------------------- Start */

schluesselLaden();
schluesselAnzeigeAktualisieren();
aufSchluesselAenderung(() => {
  if (aktiv === "hilfe") wechsle("hilfe");
});

const ausHash = location.hash.replace("#", "");
if (BEREICHE.some((b) => b.id === ausHash)) aktiv = ausHash;
if (!schluessel.vorhanden) aktiv = "schluessel";

zeichneTabs();
wechsle(aktiv);

if (!window.crypto?.subtle) {
  meldung(
    "Die Verschlüsselung des Browsers steht nicht zur Verfügung. Die App muss über den mitgelieferten " +
      "lokalen Webserver geöffnet werden (start.cmd bzw. start.sh), nicht per Doppelklick.",
    "fehler",
    0
  );
}
