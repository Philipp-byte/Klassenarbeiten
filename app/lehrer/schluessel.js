/* ==========================================================================
   Schlüsselverwaltung der Lehrkraft.

   Der private Schlüssel ist das einzige Mittel, mit dem sich Abgaben öffnen
   lassen. Geht er verloren, sind bereits geschriebene Arbeiten nicht mehr
   lesbar – darauf wird an mehreren Stellen deutlich hingewiesen.

   Ablage:
   • Die passphrasengeschützte Schlüsseldatei liegt im Browser (localStorage)
     UND sollte zusätzlich als Datei gesichert werden.
   • Der entschlüsselte private Schlüssel existiert nur im Arbeitsspeicher,
     solange der Tab offen ist.
   ========================================================================== */

import { el, $, meldung, frage, dateiWaehlen, eingabeDialog } from "../shared/dom.js";
import {
  erzeugeSchluesselpaar,
  schluesseldateiErzeugen,
  schluesseldateiOeffnen,
} from "../shared/crypto.js";
import { ladeJsonDatei, speichereJson, dateiName, DATEI_ENDUNG } from "../shared/model.js";
import {
  schluesseldateiLesen,
  schluesseldateiAblegen,
  schluesseldateiEntfernen,
} from "../shared/speicher.js";

export const schluessel = {
  datei: null, // passphrasengeschützte Schlüsseldatei
  privat: null, // entschlüsselt, nur im Arbeitsspeicher
  oeffentlich: null,
  fingerabdruck: null,
  bezeichnung: "",

  get vorhanden() {
    return !!this.datei;
  },
  get entsperrt() {
    return !!this.privat;
  },
};

let beiAenderung = () => {};
export function aufSchluesselAenderung(fn) {
  beiAenderung = fn;
}

export function schluesselLaden() {
  const datei = schluesseldateiLesen();
  if (datei) {
    schluessel.datei = datei;
    schluessel.oeffentlich = datei.oeffentlich;
    schluessel.fingerabdruck = datei.fingerabdruck;
    schluessel.bezeichnung = datei.bezeichnung ?? "";
  }
  return schluessel;
}

export function schluesselAnzeigeAktualisieren() {
  const anzeige = $("#schluessel-anzeige");
  if (!anzeige) return;
  if (!schluessel.vorhanden) {
    anzeige.textContent = "kein Schlüssel";
    anzeige.style.color = "var(--red)";
  } else if (schluessel.entsperrt) {
    anzeige.textContent = `Schlüssel entsperrt · ${schluessel.fingerabdruck}`;
    anzeige.style.color = "var(--green)";
  } else {
    anzeige.textContent = `Schlüssel gesperrt · ${schluessel.fingerabdruck}`;
    anzeige.style.color = "var(--grey)";
  }
}

/** Fragt bei Bedarf die Passphrase ab. Liefert true, wenn entsperrt. */
export async function sicherstellenEntsperrt() {
  if (schluessel.entsperrt) return true;
  if (!schluessel.vorhanden) {
    meldung("Es ist noch kein Schlüssel vorhanden. Bitte zuerst im Reiter „Schlüssel“ einen anlegen.", "warn", 8000);
    return false;
  }
  const werte = await eingabeDialog("Schlüssel entsperren", [
    {
      name: "passphrase",
      bez: "Passphrase",
      typ: "password",
      hinweis: `Schlüssel ${schluessel.fingerabdruck}`,
    },
  ], { okText: "Entsperren" });
  if (!werte) return false;
  try {
    const geoeffnet = await schluesseldateiOeffnen(schluessel.datei, werte.passphrase);
    schluessel.privat = geoeffnet.privat;
    schluessel.oeffentlich = geoeffnet.oeffentlich;
    schluessel.fingerabdruck = geoeffnet.fingerabdruck;
    schluesselAnzeigeAktualisieren();
    beiAenderung();
    meldung("Schlüssel entsperrt.", "gut");
    return true;
  } catch (fehler) {
    meldung(fehler.message, "fehler", 8000);
    return false;
  }
}

/* ------------------------------------------------------------------ Ansicht */

export function zeigeSchluessel(inhalt) {
  const karten = [];

  if (!schluessel.vorhanden) {
    karten.push(
      el("div", { class: "karte" }, [
        el("h2", { text: "Noch kein Schlüssel vorhanden" }),
        el("p", {
          text:
            "Bevor du eine Klassenarbeit ausgeben kannst, brauchst du ein Schlüsselpaar. Der " +
            "öffentliche Teil wandert in jede Prüfungsdatei, der private Teil bleibt bei dir und " +
            "ist das Einzige, womit sich Abgaben wieder öffnen lassen.",
        }),
        el("div", { class: "hinweis warn" }, [
          el("p", {}, [
            el("strong", { text: "Wichtig: " }),
            document.createTextNode(
              "Sichere die Schlüsseldatei zusätzlich außerhalb dieses Rechners (USB-Stick, " +
                "dienstliches Laufwerk). Ohne sie sind bereits geschriebene Arbeiten unwiderruflich unlesbar."
            ),
          ]),
        ]),
        el("div", { class: "zeile", style: { marginTop: "1rem" } }, [
          el("button", { class: "btn gross", text: "Schlüsselpaar erzeugen", onclick: () => neuErzeugen(inhalt) }),
          el("button", { class: "btn sekundaer", text: "Vorhandene Schlüsseldatei laden", onclick: () => importieren(inhalt) }),
        ]),
      ])
    );
  } else {
    karten.push(
      el("div", { class: "karte" }, [
        el("div", { class: "karte-kopf" }, [
          el("h2", { text: "Dein Schlüssel" }),
          el("span", {
            class: `plakette ${schluessel.entsperrt ? "gut" : "info"}`,
            text: schluessel.entsperrt ? "entsperrt" : "gesperrt",
          }),
        ]),
        el("table", { class: "liste" }, [
          el("tbody", {}, [
            zeile("Fingerabdruck", el("code", { text: schluessel.fingerabdruck })),
            zeile("Bezeichnung", schluessel.bezeichnung || "—"),
            zeile("Erzeugt am", new Date(schluessel.datei.erzeugtAm).toLocaleString("de-DE")),
            zeile("Verfahren", "ECDH P-256 · HKDF-SHA256 · AES-256-GCM · PBKDF2 (310 000 Runden)"),
          ]),
        ]),
        el("div", { class: "zeile", style: { marginTop: "1rem" } }, [
          schluessel.entsperrt
            ? el("button", {
                class: "btn sekundaer",
                text: "Sperren",
                onclick: () => {
                  schluessel.privat = null;
                  schluesselAnzeigeAktualisieren();
                  beiAenderung();
                  zeigeSchluessel(inhalt);
                },
              })
            : el("button", {
                class: "btn",
                text: "Entsperren",
                onclick: async () => {
                  if (await sicherstellenEntsperrt()) zeigeSchluessel(inhalt);
                },
              }),
          el("button", {
            class: "btn sekundaer",
            text: "Schlüsseldatei sichern",
            onclick: () =>
              speichereJson(
                schluessel.datei,
                `jjws-schluessel_${dateiName(schluessel.bezeichnung || "lehrkraft")}.${DATEI_ENDUNG.schluessel}`
              ),
          }),
          el("span", { class: "schieb-rechts" }),
          el("button", {
            class: "btn warnung",
            text: "Schlüssel aus diesem Browser entfernen",
            onclick: () => entfernen(inhalt),
          }),
        ]),
      ])
    );

    karten.push(
      el("div", { class: "karte" }, [
        el("h3", { text: "Anderen Schlüssel laden" }),
        el("p", {
          class: "klein grau",
          text:
            "Zum Beispiel auf einem zweiten Rechner oder um eine ältere Arbeit zu korrigieren, " +
            "die mit einem früheren Schlüssel ausgegeben wurde.",
        }),
        el("button", { class: "btn sekundaer", text: "Schlüsseldatei laden", onclick: () => importieren(inhalt) }),
      ])
    );
  }

  karten.push(
    el("div", { class: "karte" }, [
      el("h3", { text: "Wie das Verfahren funktioniert" }),
      el("ol", { style: { lineHeight: "1.7" } }, [
        el("li", { text: "Dein öffentlicher Schlüssel wird in jede Prüfungsdatei geschrieben." }),
        el("li", { text: "Die Prüfungs-App erzeugt für jede Abgabe einen einmaligen Sitzungsschlüssel und verschlüsselt damit die Antworten." }),
        el("li", { text: "Die SuS können ihre eigene Abgabe danach nicht mehr lesen – und fremde erst recht nicht." }),
        el("li", { text: "Nur mit deinem privaten Schlüssel lässt sich die Datei wieder öffnen. Jede nachträgliche Änderung an der Datei fällt beim Öffnen sofort auf." }),
      ]),
    ])
  );

  inhalt.replaceChildren(...karten);
}

function zeile(bez, wert) {
  return el("tr", {}, [
    el("td", { style: { width: "12rem", fontWeight: "700" }, text: bez }),
    el("td", {}, [wert instanceof Node ? wert : document.createTextNode(String(wert))]),
  ]);
}

/* ------------------------------------------------------------------ Aktionen */

async function neuErzeugen(inhalt) {
  const werte = await eingabeDialog(
    "Schlüsselpaar erzeugen",
    [
      { name: "bezeichnung", bez: "Bezeichnung", platzhalter: "z. B. Riegert – Informatik" },
      {
        name: "passphrase",
        bez: "Passphrase",
        typ: "password",
        hinweis: "Mindestens 8 Zeichen. Diese Passphrase kann nicht zurückgesetzt werden.",
      },
      { name: "passphrase2", bez: "Passphrase wiederholen", typ: "password" },
    ],
    { okText: "Erzeugen" }
  );
  if (!werte) return;
  if (werte.passphrase !== werte.passphrase2) {
    meldung("Die beiden Passphrasen stimmen nicht überein.", "fehler");
    return;
  }
  try {
    const paar = await erzeugeSchluesselpaar();
    const datei = await schluesseldateiErzeugen(paar, werte.passphrase, werte.bezeichnung);
    schluesseldateiAblegen(datei);
    schluessel.datei = datei;
    schluessel.privat = paar.privat;
    schluessel.oeffentlich = paar.oeffentlich;
    schluessel.fingerabdruck = paar.fingerabdruck;
    schluessel.bezeichnung = werte.bezeichnung;

    speichereJson(datei, `jjws-schluessel_${dateiName(werte.bezeichnung || "lehrkraft")}.${DATEI_ENDUNG.schluessel}`);
    schluesselAnzeigeAktualisieren();
    beiAenderung();
    zeigeSchluessel(inhalt);
    meldung(
      "Schlüssel erzeugt und als Datei heruntergeladen. Bitte jetzt an einem sicheren Ort ablegen.",
      "gut",
      10000
    );
  } catch (fehler) {
    meldung(fehler.message, "fehler", 8000);
  }
}

async function importieren(inhalt) {
  const datei = await dateiWaehlen({ endungen: `.${DATEI_ENDUNG.schluessel},.json` });
  if (!datei) return;
  try {
    const daten = await ladeJsonDatei(datei);
    if (daten?.typ !== "jjws-schluessel") throw new Error("Das ist keine JJWS-Schlüsseldatei.");
    const werte = await eingabeDialog("Schlüsseldatei öffnen", [
      { name: "passphrase", bez: "Passphrase", typ: "password", hinweis: `Schlüssel ${daten.fingerabdruck}` },
    ], { okText: "Öffnen" });
    if (!werte) return;
    const geoeffnet = await schluesseldateiOeffnen(daten, werte.passphrase);
    schluesseldateiAblegen(daten);
    schluessel.datei = daten;
    schluessel.privat = geoeffnet.privat;
    schluessel.oeffentlich = geoeffnet.oeffentlich;
    schluessel.fingerabdruck = geoeffnet.fingerabdruck;
    schluessel.bezeichnung = geoeffnet.bezeichnung;
    schluesselAnzeigeAktualisieren();
    beiAenderung();
    zeigeSchluessel(inhalt);
    meldung("Schlüssel geladen und entsperrt.", "gut");
  } catch (fehler) {
    meldung(fehler.message, "fehler", 8000);
  }
}

async function entfernen(inhalt) {
  const sicher = await frage(
    "Schlüssel wirklich entfernen?",
    "Der Schlüssel wird aus diesem Browser gelöscht. Ohne gesicherte Schlüsseldatei lassen sich " +
      "damit verschlüsselte Abgaben NIE WIEDER öffnen.",
    { jaText: "Ja, entfernen", neinText: "Abbrechen", gefaehrlich: true }
  );
  if (!sicher) return;
  schluesseldateiEntfernen();
  schluessel.datei = null;
  schluessel.privat = null;
  schluessel.oeffentlich = null;
  schluessel.fingerabdruck = null;
  schluesselAnzeigeAktualisieren();
  beiAenderung();
  zeigeSchluessel(inhalt);
  meldung("Schlüssel aus diesem Browser entfernt.", "warn");
}
