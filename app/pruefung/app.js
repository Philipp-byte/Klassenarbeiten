/* ==========================================================================
   Prüfungs-App – hier schreiben die Schülerinnen und Schüler die Arbeit.

   Ablauf
     1. Prüfungsdatei (*.jjwsp) laden
     2. Name/Klasse bzw. Prüfungsnummer eintragen
     3. Aufgaben bearbeiten – alles wird laufend lokal zwischengespeichert
     4. Abgeben: die Antworten werden verschlüsselt und als Datei
        heruntergeladen. Diese Datei kommt in den Tauschordner.

   Es gibt in dieser App keinen einzigen Netzwerkaufruf nach außen.
   ========================================================================== */

import { el, $, meldung, frage, dateiWaehlen, ablageFlaeche, auszeichnung, entprellt, zeitText } from "../shared/dom.js";
import { ladeJsonDatei, ladeHerunter, dateiName, DATEI_ENDUNG, APP_VERSION, datumDeutsch } from "../shared/model.js";
import { verschluesseln, pruefsumme } from "../shared/crypto.js";
import { baueAntwortfeld, istBearbeitet } from "../shared/aufgaben-ui.js";
import { PythonRunner, pyodideVorhanden } from "../shared/python-runner.js";
import { persoenlicheFassung } from "../shared/mischen.js";

const inhalt = $("#inhalt");
const statusleiste = $("#statusleiste");
const uhrAnzeige = $("#uhr");

const zustand = {
  pruefung: null, // Originalfassung aus der Datei
  meine: null, // persönliche Fassung mit eigener Aufgabenreihenfolge
  identitaet: null,
  antworten: {},
  aktuelleAufgabe: 0,
  startzeit: null,
  abgegeben: false,
  runner: null,
};

const SPEICHER = (id) => `jjws.abgabe.${id}`;

/* ============================================================ Zwischenspeicher */

function speichern() {
  if (!zustand.pruefung) return;
  try {
    localStorage.setItem(
      SPEICHER(zustand.pruefung.id),
      JSON.stringify({
        identitaet: zustand.identitaet,
        antworten: zustand.antworten,
        startzeit: zustand.startzeit,
        aktuelleAufgabe: zustand.aktuelleAufgabe,
        gespeichertAm: new Date().toISOString(),
      })
    );
    statusText("Zwischengespeichert", "gut");
  } catch {
    statusText("Zwischenspeichern nicht möglich – bitte melde dich bei der Lehrkraft.", "fehler");
  }
}
const speichernVerzoegert = entprellt(speichern, 600);

function ladeStand(pruefungId) {
  try {
    const roh = localStorage.getItem(SPEICHER(pruefungId));
    return roh ? JSON.parse(roh) : null;
  } catch {
    return null;
  }
}

/* ====================================================================== Start */

function zeigeStart() {
  document.body.classList.remove("pruefung-laeuft");
  statusleiste.hidden = true;
  uhrAnzeige.hidden = true;

  const flaeche = el("div", { class: "start-flaeche" }, [
    el("div", { style: { fontSize: "2rem", lineHeight: "1", marginBottom: ".6rem", opacity: ".55" }, text: "📄" }),
    el("p", { style: { fontSize: "1.02rem", fontWeight: "700", color: "var(--navy)", marginBottom: ".3rem" },
              text: "Klassenarbeitsdatei öffnen" }),
    el("p", { class: "klein grau", text: "Datei hierher ziehen oder unten auswählen · Endung .jjwsp" }),
    el("button", {
      class: "btn gross",
      style: { marginTop: ".9rem" },
      text: "Datei auswählen",
      onclick: async () => {
        const datei = await dateiWaehlen({ endungen: `.${DATEI_ENDUNG.pruefung},.json` });
        if (datei) ladePruefungsdatei(datei);
      },
    }),
  ]);
  ablageFlaeche(flaeche, (dateien) => ladePruefungsdatei(dateien[0]), [`.${DATEI_ENDUNG.pruefung}`, ".json"]);

  const punkt = (zeichen, titel, text) =>
    el("div", { class: "zeile", style: { alignItems: "flex-start", gap: ".7rem", marginBottom: ".7rem" } }, [
      el("span", { style: { fontSize: "1.1rem", lineHeight: "1.3", flex: "none" }, text: zeichen }),
      el("div", { style: { flex: "1", minWidth: "0" } }, [
        el("div", { class: "fett", style: { fontSize: ".92rem" }, text: titel }),
        el("div", { class: "klein grau", text }),
      ]),
    ]);

  inhalt.replaceChildren(
    el("div", { class: "wrap-schmal", style: { margin: "0 auto" } }, [
      el("div", { class: "willkommen" }, [
        el("div", { class: "marke", text: "Johann-Jakob-Widmann-Schule" }),
        el("h2", { text: "Klassenarbeit" }),
        el("p", { text: "Öffne die Datei, die deine Lehrkraft im Tauschordner bereitgelegt hat." }),
      ]),
      el("div", { class: "karte" }, [flaeche]),
      el("div", { class: "karte" }, [
        el("h3", { text: "Gut zu wissen" }),
        punkt("💾", "Deine Eingaben werden laufend gespeichert",
              "Nach einem Absturz kannst du dort weitermachen, wo du aufgehört hast."),
        punkt("🔒", "Nichts verlässt diesen Rechner",
              "Es wird nichts ins Internet geschickt – auch nicht dein Name."),
        punkt("📤", "Am Ende lädst du eine verschlüsselte Datei herunter",
              "Die legst du im Tauschordner ab. Erst dann ist die Arbeit abgegeben."),
      ]),
    ])
  );
}

async function ladePruefungsdatei(datei) {
  try {
    const daten = await ladeJsonDatei(datei);
    if (daten?.typ !== "jjws-klassenarbeit") {
      throw new Error(
        daten?.typ === "jjws-klassenarbeit-master"
          ? "Das ist die Lehrkraft-Fassung mit den Lösungen. Bitte die Datei mit der Endung .jjwsp verwenden."
          : "Diese Datei ist keine Klassenarbeit für die Prüfungs-App."
      );
    }
    if (!daten.schluessel?.oeffentlich) {
      throw new Error("In der Datei fehlt der Schlüssel für die Abgabe. Bitte die Lehrkraft ansprechen.");
    }
    zustand.pruefung = daten;
    $("#kopf-titel").textContent = daten.titel || "Klassenarbeit";
    $("#kopf-unter").textContent = [daten.fach, daten.klasse, datumDeutsch(daten.datum)].filter(Boolean).join(" · ");
    document.title = `${daten.titel} – JJWS`;

    const stand = ladeStand(daten.id);
    if (stand?.identitaet) {
      // Den Namen mit anzeigen: An einem gemeinsam genutzten Rechner darf
      // niemand aus Versehen die Arbeit der Vorgängerin fortsetzen.
      const wer = stand.identitaet.nummer
        ? `Prüfungsnummer ${stand.identitaet.nummer}`
        : [stand.identitaet.vorname, stand.identitaet.name].filter(Boolean).join(" ");
      const weiter = await frage(
        `Angefangene Arbeit von ${wer}`,
        `Auf diesem Rechner liegt eine begonnene Bearbeitung von ${wer} ` +
          `(zuletzt gespeichert: ${new Date(stand.gespeichertAm).toLocaleString("de-DE")}). ` +
          `Nur weitermachen, wenn das deine eigene Arbeit ist!`,
        { jaText: `Ja, ich bin ${wer}`, neinText: "Nein, neu beginnen" }
      );
      if (weiter) {
        zustand.identitaet = stand.identitaet;
        zustand.antworten = stand.antworten ?? {};
        zustand.startzeit = stand.startzeit;
        zustand.aktuelleAufgabe = stand.aktuelleAufgabe ?? 0;
        starteBearbeitung();
        return;
      }
      localStorage.removeItem(SPEICHER(daten.id));
    }
    zeigeIdentifikation();
  } catch (fehler) {
    meldung(fehler.message, "fehler", 9000);
  }
}

/* ========================================================== Identifikation */

function zeigeIdentifikation() {
  const p = zustand.pruefung;
  const nurNummer = p.identifikation === "nummer";

  const felder = nurNummer
    ? [{ name: "nummer", bez: "Prüfungsnummer", platzhalter: "z. B. 12" }]
    : [
        { name: "name", bez: "Nachname" },
        { name: "vorname", bez: "Vorname" },
      ];
  const eingaben = {};

  const form = el("form", {
    onsubmit: (e) => {
      e.preventDefault();
      const werte = Object.fromEntries(Object.entries(eingaben).map(([k, v]) => [k, v.value.trim()]));
      if (Object.values(werte).some((v) => !v)) {
        meldung("Bitte alle Felder ausfüllen.", "warn");
        return;
      }
      zustand.identitaet = { ...werte, klasse: eingaben.klasse?.value.trim() || p.klasse || "" };
      zustand.startzeit = Date.now();
      speichern();
      starteBearbeitung();
    },
  });

  felder.forEach((f) => {
    const eingabe = el("input", { type: "text", required: true, autocomplete: "off", placeholder: f.platzhalter ?? "" });
    eingaben[f.name] = eingabe;
    form.appendChild(el("label", { class: "feld" }, [el("span", { class: "bez", text: f.bez }), eingabe]));
  });
  const klasseEingabe = el("input", { type: "text", value: p.klasse || "", autocomplete: "off" });
  eingaben.klasse = klasseEingabe;
  form.appendChild(el("label", { class: "feld" }, [el("span", { class: "bez", text: "Klasse" }), klasseEingabe]));
  form.appendChild(el("button", { type: "submit", class: "btn gross", text: "Arbeit beginnen" }));

  inhalt.replaceChildren(
    el("div", { class: "wrap-schmal", style: { margin: "0 auto" } }, [
      el("div", { class: "karte" }, [
        el("h2", { text: p.titel }),
        el("div", { class: "spalten spalten-3", style: { marginBottom: "1rem" } }, [
          kennzahl(`${p.gesamtpunkte}`, "Punkte insgesamt"),
          kennzahl(`${p.aufgaben.length}`, "Aufgaben"),
          kennzahl(`${p.bearbeitungszeitMin} min`, "Bearbeitungszeit"),
        ]),
        p.hinweise ? el("div", { class: "hinweis", html: auszeichnung(p.hinweise) }) : null,
        p.hilfsmittel
          ? el("p", { class: "klein", style: { marginTop: ".7rem" } }, [
              el("strong", { text: "Erlaubte Hilfsmittel: " }),
              document.createTextNode(p.hilfsmittel),
            ])
          : null,
      ]),
      el("div", { class: "karte" }, [
        el("h3", {
          text: nurNummer ? "Deine Prüfungsnummer" : "Dein Name",
        }),
        el("p", {
          class: "klein grau",
          text: nurNummer
            ? "Trage die Nummer ein, die auf deinem Platz steht. Ein Name wird nicht gespeichert."
            : "Diese Angaben werden verschlüsselt in deine Abgabedatei geschrieben – nur deine Lehrkraft kann sie lesen.",
        }),
        form,
      ]),
    ])
  );
}

function kennzahl(wert, bez) {
  return el("div", { class: "kennzahl" }, [
    el("div", { class: "wert", text: wert }),
    el("div", { class: "bez", text: bez }),
  ]);
}

/* ============================================================== Bearbeitung */

async function starteBearbeitung() {
  // Jede Person bekommt eine eigene Aufgabenreihenfolge (siehe mischen.js).
  zustand.meine = persoenlicheFassung(zustand.pruefung, zustand.identitaet);
  document.body.classList.add("pruefung-laeuft");
  statusleiste.hidden = false;
  uhrAnzeige.hidden = false;
  starteUhr();
  window.addEventListener("beforeunload", warnungBeimVerlassen);

  const brauchtPython = zustand.meine.aufgaben.some((a) => a.typ === "code-python");
  if (brauchtPython && !zustand.runner) {
    zustand.runner = new PythonRunner({ zeitlimitMs: 10000 });
    if (!(await pyodideVorhanden())) {
      meldung(
        "Die Python-Umgebung wurde auf diesem Rechner nicht gefunden. Programmieraufgaben lassen sich " +
          "schreiben, aber nicht ausprobieren. Bitte der Lehrkraft Bescheid geben.",
        "warn",
        12000
      );
    } else {
      zustand.runner.vorbereiten().catch(() => {
        meldung("Die Python-Umgebung konnte nicht gestartet werden.", "warn", 8000);
      });
    }
  }

  zeichneAufgabe();
}

function warnungBeimVerlassen(e) {
  if (zustand.abgegeben) return;
  e.preventDefault();
  e.returnValue = "";
}

function starteUhr() {
  const p = zustand.pruefung;
  const dauerMs = (p.bearbeitungszeitMin || 45) * 60000;
  const takt = () => {
    const verbraucht = Date.now() - (zustand.startzeit || Date.now());
    const rest = dauerMs - verbraucht;
    if (rest <= 0) {
      uhrAnzeige.textContent = "Zeit abgelaufen";
      uhrAnzeige.classList.add("knapp");
      return;
    }
    uhrAnzeige.textContent = zeitText(rest / 1000);
    uhrAnzeige.classList.toggle("knapp", rest < 5 * 60000);
  };
  takt();
  setInterval(takt, 1000);
}

function antwortSetzen(aufgabeId, wert) {
  zustand.antworten[aufgabeId] = wert;
  speichernVerzoegert();
  zeichneNavigation();
  zeichneStatusleiste();
}

function zeichneAufgabe() {
  const p = zustand.meine;
  const a = p.aufgaben[zustand.aktuelleAufgabe];

  const feld = baueAntwortfeld(a, zustand.antworten[a.id], {
    aendern: (wert) => antwortSetzen(a.id, wert),
    runner: zustand.runner,
    nurLesen: zustand.abgegeben,
  });

  inhalt.replaceChildren(
    el("div", { class: "spalten", style: { gridTemplateColumns: "minmax(0,1fr)" } }, [
      p.ausgangssituation && zustand.aktuelleAufgabe === 0
        ? el("div", { class: "karte" }, [
            el("h3", { text: "Ausgangssituation" }),
            el("div", { html: auszeichnung(p.ausgangssituation) }),
          ])
        : null,

      el("div", { class: "karte" }, [
        el("div", { class: "karte-kopf" }, [
          el("div", {}, [
            a.abschnitt ? el("div", { class: "klein grau fett", text: a.abschnitt }) : null,
            el("h2", { text: `Aufgabe ${a.nr}${a.titel ? `: ${a.titel}` : ""}` }),
          ]),
          el("span", { class: "plakette info", text: `${a.punkte} ${a.punkte === 1 ? "Punkt" : "Punkte"}` }),
        ]),
        a.situationsAnschluss
          ? el("p", {
              class: "grau",
              style: { fontStyle: "italic", borderLeft: "3px solid var(--blue)", paddingLeft: ".7rem" },
              text: a.situationsAnschluss,
            })
          : null,
        el("div", { class: "text", html: auszeichnung(a.text) }),
        el("hr", { class: "trenner" }),
        feld,
      ]),

      el("div", { class: "zeile" }, [
        el("button", {
          class: "btn sekundaer",
          text: "← Zurück",
          disabled: zustand.aktuelleAufgabe === 0,
          onclick: () => wechsleZu(zustand.aktuelleAufgabe - 1),
        }),
        el("span", { class: "schieb-rechts" }),
        zustand.aktuelleAufgabe < p.aufgaben.length - 1
          ? el("button", { class: "btn", text: "Weiter →", onclick: () => wechsleZu(zustand.aktuelleAufgabe + 1) })
          : el("button", { class: "btn dunkel", text: "Zur Abgabe →", onclick: zeigeAbgabe }),
      ]),
    ])
  );
  zeichneNavigation();
  zeichneStatusleiste();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function wechsleZu(index) {
  const p = zustand.meine;
  zustand.aktuelleAufgabe = Math.max(0, Math.min(p.aufgaben.length - 1, index));
  speichern();
  zeichneAufgabe();
}

let navBehaelter = null;
function zeichneNavigation() {
  const p = zustand.meine;
  if (!navBehaelter) navBehaelter = el("div", { class: "aufgaben-nav" });
  navBehaelter.replaceChildren(
    ...p.aufgaben.map((a, i) =>
      el("button", {
        text: String(i + 1),
        class: istBearbeitet(a, zustand.antworten[a.id]) ? "bearbeitet" : "",
        "aria-current": i === zustand.aktuelleAufgabe ? "true" : "false",
        title: `Aufgabe ${i + 1}${a.titel ? `: ${a.titel}` : ""} (${a.punkte} P.)`,
        onclick: () => wechsleZu(i),
      })
    )
  );
  return navBehaelter;
}

let statusText_ = null;
function statusText(text, art = "info") {
  if (!statusText_) return;
  statusText_.textContent = text;
  statusText_.className = `klein ${art === "fehler" ? "" : "grau"}`;
  if (art === "fehler") statusText_.style.color = "var(--red)";
  else statusText_.style.color = "";
}

function zeichneStatusleiste() {
  const p = zustand.meine;
  const fertig = p.aufgaben.filter((a) => istBearbeitet(a, zustand.antworten[a.id])).length;
  if (!statusText_) statusText_ = el("span", { class: "klein grau" });

  statusleiste.replaceChildren(
    zeichneNavigation(),
    el("span", { class: "klein grau nowrap", text: `${fertig} von ${p.aufgaben.length} bearbeitet` }),
    statusText_,
    el("span", { class: "schieb-rechts" }),
    el("button", { class: "btn dunkel", text: "Abgeben", onclick: zeigeAbgabe })
  );
}

/* ==================================================================== Abgabe */

function zeigeAbgabe() {
  const p = zustand.meine;
  const offen = p.aufgaben.filter((a) => !istBearbeitet(a, zustand.antworten[a.id]));

  inhalt.replaceChildren(
    el("div", { class: "wrap-schmal", style: { margin: "0 auto" } }, [
      el("div", { class: "karte" }, [
        el("h2", { text: "Arbeit abgeben" }),
        offen.length
          ? el("div", { class: "hinweis warn" }, [
              el("p", {}, [
                el("strong", { text: `${offen.length} Aufgabe${offen.length === 1 ? "" : "n"} ohne Eingabe: ` }),
                document.createTextNode(offen.map((a) => a.nr).join(", ")),
              ]),
              el("p", { text: "Du kannst trotzdem abgeben – unbearbeitete Aufgaben zählen mit 0 Punkten." }),
            ])
          : el("div", { class: "hinweis gut", text: "Alle Aufgaben sind bearbeitet." }),

        el("ol", { style: { marginTop: "1rem", lineHeight: "1.8" } }, [
          el("li", { text: "Auf „Verschlüsselt abgeben“ klicken – es wird eine Datei heruntergeladen." }),
          el("li", { text: "Die Datei aus dem Download-Ordner in den Tauschordner der Lehrkraft ziehen." }),
          el("li", { text: "Erst dann den Platz verlassen." }),
        ]),

        el("div", { class: "zeile", style: { marginTop: "1.2rem" } }, [
          el("button", { class: "btn sekundaer", text: "← Zurück zu den Aufgaben", onclick: () => zeichneAufgabe() }),
          el("span", { class: "schieb-rechts" }),
          el("button", { class: "btn gross dunkel", text: "Verschlüsselt abgeben", onclick: abgeben }),
        ]),
      ]),
      el("div", { class: "karte" }, [
        el("h3", { text: "Was passiert bei der Abgabe?" }),
        el("p", {
          class: "klein",
          text:
            "Deine Antworten werden mit dem öffentlichen Schlüssel deiner Lehrkraft verschlüsselt " +
            "(ECDH P-256 und AES-256-GCM). Die Datei kann nur die Lehrkraft öffnen – du selbst kannst " +
            "sie nicht mehr lesen und niemand kann sie unbemerkt verändern.",
        }),
      ]),
    ])
  );
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function abgeben() {
  const p = zustand.pruefung;
  const sicher = await frage(
    "Wirklich abgeben?",
    "Nach der Abgabe kannst du nichts mehr ändern. Die Datei wird heruntergeladen und gehört in den Tauschordner.",
    { jaText: "Ja, abgeben", neinText: "Noch nicht" }
  );
  if (!sicher) return;

  try {
    const nutzlast = {
      identitaet: zustand.identitaet,
      antworten: zustand.antworten,
      protokoll: {
        begonnenAm: new Date(zustand.startzeit).toISOString(),
        abgegebenAm: new Date().toISOString(),
        dauerSekunden: Math.round((Date.now() - zustand.startzeit) / 1000),
        appVersion: APP_VERSION,
        aufgabenfolge: zustand.meine?.persoenlicheReihenfolge ?? null,
      },
    };
    const kopf = {
      pruefungId: p.id,
      pruefungTitel: p.titel,
      klasse: p.klasse ?? "",
      abgegebenAm: new Date().toISOString(),
      appVersion: APP_VERSION,
    };

    const umschlag = await verschluesseln(p.schluessel.oeffentlich, nutzlast, kopf);
    const abgabe = {
      typ: "jjws-abgabe",
      formatVersion: 1,
      ...umschlag,
    };

    const text = JSON.stringify(abgabe, null, 2);
    const kennung = await pruefsumme(text);
    const bezeichner =
      p.identifikation === "nummer"
        ? `Nr${zustand.identitaet.nummer}`
        : `${zustand.identitaet.name}-${zustand.identitaet.vorname}`;
    const name = `${dateiName(p.titel)}_${dateiName(bezeichner)}.${DATEI_ENDUNG.abgabe}`;

    ladeHerunter(new Blob([text], { type: "application/json;charset=utf-8" }), name);

    zustand.abgegeben = true;
    window.removeEventListener("beforeunload", warnungBeimVerlassen);
    statusleiste.hidden = true;
    zeigeBestaetigung(name, kennung);
  } catch (fehler) {
    meldung(`Die Abgabe hat nicht geklappt: ${fehler.message}`, "fehler", 12000);
  }
}

function zeigeBestaetigung(name, kennung) {
  inhalt.replaceChildren(
    el("div", { class: "wrap-schmal", style: { margin: "0 auto" } }, [
      el("div", { class: "karte" }, [
        el("h2", { text: "Abgegeben ✓" }),
        el("div", { class: "hinweis gut" }, [
          el("p", {}, [
            document.createTextNode("Die Datei "),
            el("strong", { text: name }),
            document.createTextNode(" wurde heruntergeladen."),
          ]),
        ]),
        el("h3", { style: { marginTop: "1.2rem" }, text: "Jetzt noch:" }),
        el("ol", { style: { lineHeight: "1.9" } }, [
          el("li", { text: "Download-Ordner öffnen." }),
          el("li", { text: "Die Datei in den Tauschordner der Lehrkraft ziehen." }),
          el("li", { text: "Der Lehrkraft kurz Bescheid geben." }),
        ]),
        el("p", { class: "klein grau", style: { marginTop: "1rem" } }, [
          document.createTextNode("Prüfkennung: "),
          el("code", { text: kennung }),
          document.createTextNode(" – diese Zeichenfolge kann die Lehrkraft mit ihrer Anzeige vergleichen."),
        ]),
        el("div", { class: "zeile", style: { marginTop: "1.2rem" } }, [
          el("button", {
            class: "btn sekundaer",
            text: "Datei noch einmal herunterladen",
            onclick: () => location.reload(),
          }),
        ]),
      ]),
    ])
  );
}

/* ==================================================================== Aufruf */

zeigeStart();

// Bequemlichkeit: liegt neben der App eine Datei „klassenarbeit.jjwsp“,
// wird sie automatisch angeboten (praktisch für den Klassensatz auf dem Netzlaufwerk).
fetch(`./klassenarbeit.${DATEI_ENDUNG.pruefung}`)
  .then((r) => (r.ok ? r.json() : null))
  .then((daten) => {
    if (!daten || daten.typ !== "jjws-klassenarbeit" || zustand.pruefung) return;
    meldung(`Klassenarbeit „${daten.titel}“ gefunden – wird geöffnet.`, "info");
    ladePruefungsdatei(new File([JSON.stringify(daten)], `klassenarbeit.${DATEI_ENDUNG.pruefung}`));
  })
  .catch(() => {
    /* keine Datei daneben – völlig normal */
  });
