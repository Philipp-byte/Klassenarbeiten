/* ==========================================================================
   Interaktive Darstellung der Aufgaben für die Prüfungs-App.

   Arbeitet ausschließlich auf der SuS-Fassung – hier sind keine Lösungen
   vorhanden und können deshalb auch nicht angezeigt werden.
   ========================================================================== */

import { el, autoHoehe, tabEinrueckung, entprellt } from "./dom.js";
import { WebRunner } from "./web-runner.js";

/**
 * Baut den Antwortbereich einer Aufgabe.
 *
 * @param {object} a         Aufgabe (SuS-Fassung)
 * @param {*} antwort        bisherige Antwort
 * @param {object} umgebung  { aendern(neueAntwort), runner, nurLesen }
 * @returns {HTMLElement}
 */
export function baueAntwortfeld(a, antwort, umgebung) {
  const bauer = {
    mc: mcFeld,
    wahrfalsch: wahrfalschFeld,
    kurzantwort: kurzantwortFeld,
    stichworte: stichworteFeld,
    aufzaehlung: aufzaehlungFeld,
    zuordnung: zuordnungFeld,
    reihenfolge: reihenfolgeFeld,
    lueckentext: lueckentextFeld,
    zahl: zahlFeld,
    rechenweg: rechenwegFeld,
    "code-python": pythonFeld,
    parsons: parsonsFeld,
    "code-web": webFeld,
    freitext: freitextFeld,
  }[a.typ];

  if (!bauer) {
    return el("div", { class: "hinweis fehler", text: `Unbekannter Aufgabentyp „${a.typ}“.` });
  }
  return bauer(a, antwort, umgebung);
}

/** Ist die Aufgabe bearbeitet? Steuert die Punkte in der Aufgabennavigation. */
export function istBearbeitet(a, antwort) {
  if (antwort === undefined || antwort === null) return false;
  switch (a.typ) {
    case "mc":
    case "reihenfolge":
      return Array.isArray(antwort) && antwort.length > 0;
    case "aufzaehlung":
    case "lueckentext":
      return Array.isArray(antwort) && antwort.some((x) => String(x ?? "").trim());
    case "wahrfalsch":
    case "zuordnung":
    case "rechenweg":
      return typeof antwort === "object" && Object.values(antwort).some((v) => String(v ?? "").trim());
    case "code-python":
      return !!String(antwort?.code ?? "").trim();
    case "code-web":
      return ["html", "css", "js"].some((k) => String(antwort?.[k] ?? "").trim());
    case "parsons":
      return Array.isArray(antwort?.reihenfolge) && antwort.reihenfolge.length > 0;
    default:
      return !!String(antwort ?? "").trim();
  }
}

/* ---------------------------------------------------------------- Bausteine */

function knopf(text, beiKlick, klasse = "btn sekundaer klein", titel = "") {
  return el("button", { type: "button", class: klasse, text, title: titel, onclick: beiKlick });
}

/* ------------------------------------------------------------ Multiple Choice */

function mcFeld(a, antwort, { aendern, nurLesen }) {
  const gewaehlt = new Set(Array.isArray(antwort) ? antwort : []);
  const behaelter = el("div", { role: a.mehrfach ? "group" : "radiogroup" });

  a.optionen.forEach((o) => {
    const eingabe = el("input", {
      type: a.mehrfach ? "checkbox" : "radio",
      name: `mc_${a.id}`,
      value: o.id,
      checked: gewaehlt.has(o.id),
      disabled: nurLesen,
    });
    const zeile = el("label", { class: `option${gewaehlt.has(o.id) ? " gewaehlt" : ""}` }, [
      eingabe,
      el("span", { text: o.text }),
    ]);
    eingabe.addEventListener("change", () => {
      if (a.mehrfach) {
        eingabe.checked ? gewaehlt.add(o.id) : gewaehlt.delete(o.id);
      } else {
        gewaehlt.clear();
        gewaehlt.add(o.id);
      }
      behaelter.querySelectorAll(".option").forEach((n, i) => {
        n.classList.toggle("gewaehlt", gewaehlt.has(a.optionen[i].id));
      });
      aendern([...gewaehlt]);
    });
    behaelter.appendChild(zeile);
  });

  if (a.mehrfach) {
    behaelter.appendChild(
      el("p", { class: "klein grau", style: { marginTop: ".4rem" }, text: "Mehrere Antworten können richtig sein." })
    );
  }
  return behaelter;
}

/* --------------------------------------------------------------- Aussagenraster */

function wahrfalschFeld(a, antwort, { aendern, nurLesen }) {
  const werte = { ...(antwort && typeof antwort === "object" ? antwort : {}) };
  const tabelle = el("table", { class: "liste" }, [
    el("thead", {}, [
      el("tr", {}, [
        el("th", { style: { width: "2.5rem" }, text: "Nr." }),
        el("th", { text: "Aussage" }),
        ...a.spalten.map((s) => el("th", { class: "zahl", style: { width: "7rem" }, text: s.text })),
      ]),
    ]),
  ]);
  const koerper = el("tbody");
  a.zeilen.forEach((z, i) => {
    const zellen = a.spalten.map((s) => {
      const eingabe = el("input", {
        type: "radio",
        name: `wf_${a.id}_${z.id}`,
        checked: werte[z.id] === s.id,
        disabled: nurLesen,
        "aria-label": `${z.text}: ${s.text}`,
      });
      eingabe.addEventListener("change", () => {
        werte[z.id] = s.id;
        aendern({ ...werte });
      });
      return el("td", { style: { textAlign: "center" } }, [eingabe]);
    });
    koerper.appendChild(el("tr", {}, [el("td", { text: String(i + 1) }), el("td", { text: z.text }), ...zellen]));
  });
  tabelle.appendChild(koerper);
  return el("div", { class: "tabelle-scroll" }, [tabelle]);
}

/* ------------------------------------------------------------- Kurze Antworten */

function kurzantwortFeld(a, antwort, { aendern, nurLesen }) {
  const eingabe = el("input", {
    type: "text",
    value: antwort ?? "",
    disabled: nurLesen,
    placeholder: "Antwort eingeben",
    class: a.alsCode ? "mono" : "",
    style: { maxWidth: "34rem" },
  });
  eingabe.addEventListener("input", () => aendern(eingabe.value));
  return el("div", {}, [eingabe]);
}

function stichworteFeld(a, antwort, { aendern, nurLesen }) {
  const feld = el("textarea", {
    rows: a.zeilen || 5,
    disabled: nurLesen,
    placeholder: "Antwort in ganzen Sätzen",
  });
  feld.value = antwort ?? "";
  feld.addEventListener("input", () => aendern(feld.value));
  autoHoehe(feld, a.zeilen || 5);
  return el("div", {}, [feld]);
}

function freitextFeld(a, antwort, { aendern, nurLesen }) {
  const feld = el("textarea", { rows: a.zeilen || 8, disabled: nurLesen });
  feld.value = antwort ?? "";
  feld.addEventListener("input", () => aendern(feld.value));
  autoHoehe(feld, a.zeilen || 8);
  return el("div", {}, [
    feld,
    el("p", { class: "klein grau", text: "Diese Aufgabe wird von der Lehrkraft von Hand bewertet." }),
  ]);
}

function aufzaehlungFeld(a, antwort, { aendern, nurLesen }) {
  const werte = Array.isArray(antwort) ? [...antwort] : [];
  const anzahl = Number(a.anzahlFelder) || 4;
  const behaelter = el("div", { class: "stapel" });
  for (let i = 0; i < anzahl; i++) {
    const eingabe = el("input", {
      type: "text",
      value: werte[i] ?? "",
      disabled: nurLesen,
      placeholder: `${a.beschriftung || "Nennung"} ${i + 1}`,
      style: { maxWidth: "34rem" },
    });
    eingabe.addEventListener("input", () => {
      werte[i] = eingabe.value;
      aendern([...werte]);
    });
    behaelter.appendChild(
      el("div", { class: "zeile-eng" }, [
        el("span", { class: "klein grau", style: { width: "1.5rem" }, text: `${i + 1}.` }),
        eingabe,
      ])
    );
  }
  return behaelter;
}

/* -------------------------------------------------------------------- Zuordnung */

function zuordnungFeld(a, antwort, { aendern, nurLesen }) {
  const werte = { ...(antwort && typeof antwort === "object" ? antwort : {}) };
  const tabelle = el("table", { class: "liste" }, [
    el("thead", {}, [el("tr", {}, [el("th", { text: "Begriff" }), el("th", { text: "Passt zu" })])]),
  ]);
  const koerper = el("tbody");
  a.links.forEach((l) => {
    const auswahl = el("select", { disabled: nurLesen });
    auswahl.appendChild(el("option", { value: "", text: "– bitte wählen –" }));
    a.rechts.forEach((r) => {
      // Wert ist der Text: die Abgabe enthält damit keine Kennung, aus der sich
      // die Lösung rekonstruieren ließe.
      auswahl.appendChild(el("option", { value: r.text, text: r.text, selected: werte[l.id] === r.text }));
    });
    auswahl.addEventListener("change", () => {
      if (auswahl.value) werte[l.id] = auswahl.value;
      else delete werte[l.id];
      aendern({ ...werte });
    });
    koerper.appendChild(el("tr", {}, [el("td", { text: l.text }), el("td", {}, [auswahl])]));
  });
  tabelle.appendChild(koerper);
  return el("div", { class: "tabelle-scroll" }, [tabelle]);
}

/* ------------------------------------------------------------------ Reihenfolge */

function reihenfolgeFeld(a, antwort, { aendern, nurLesen }) {
  let folge =
    Array.isArray(antwort) && antwort.length === a.elemente.length
      ? [...antwort]
      : a.elemente.map((e) => e.id);
  const behaelter = el("div", { class: "stapel" });

  const zeichne = () => {
    behaelter.replaceChildren();
    folge.forEach((id, i) => {
      const e = a.elemente.find((x) => x.id === id);
      behaelter.appendChild(
        el("div", { class: "option", style: { alignItems: "center" } }, [
          el("span", { class: "fett", style: { width: "1.6rem" }, text: `${i + 1}.` }),
          el("span", { style: { flex: "1" }, text: e?.text ?? "?" }),
          nurLesen
            ? null
            : el("span", { class: "zeile-eng" }, [
                knopf("↑", () => { if (i > 0) { [folge[i - 1], folge[i]] = [folge[i], folge[i - 1]]; fertig(); } }, "btn sekundaer klein", "nach oben"),
                knopf("↓", () => { if (i < folge.length - 1) { [folge[i + 1], folge[i]] = [folge[i], folge[i + 1]]; fertig(); } }, "btn sekundaer klein", "nach unten"),
              ]),
        ])
      );
    });
  };
  const fertig = () => {
    zeichne();
    aendern([...folge]);
  };
  zeichne();
  return el("div", {}, [
    behaelter,
    el("p", { class: "klein grau", text: "Bringe die Zeilen mit den Pfeilen in die richtige Reihenfolge." }),
  ]);
}

/* ------------------------------------------------------------------ Lückentext */

function lueckentextFeld(a, antwort, { aendern, nurLesen }) {
  const werte = Array.isArray(antwort) ? [...antwort] : [];
  const absatz = el("p", {
    class: a.alsCode ? "mono" : "",
    style: { lineHeight: "2.2", whiteSpace: a.alsCode ? "pre-wrap" : "normal" },
  });
  a.teile.forEach((t) => {
    if (t.art === "text") {
      absatz.appendChild(document.createTextNode(t.inhalt));
    } else {
      const eingabe = el("input", {
        type: "text",
        class: "luecke",
        value: werte[t.index] ?? "",
        disabled: nurLesen,
        size: t.breite || 10,
        "aria-label": `Lücke ${t.index + 1}`,
      });
      eingabe.addEventListener("input", () => {
        werte[t.index] = eingabe.value;
        aendern([...werte]);
      });
      absatz.appendChild(eingabe);
    }
  });
  return el("div", {}, [absatz]);
}

/* ------------------------------------------------------------------- Rechnen */

function zahlFeld(a, antwort, { aendern, nurLesen }) {
  const eingabe = el("input", {
    type: "text",
    inputmode: "decimal",
    value: antwort ?? "",
    disabled: nurLesen,
    placeholder: "Zahl",
    style: { maxWidth: "12rem" },
  });
  eingabe.addEventListener("input", () => aendern(eingabe.value));
  return el("div", { class: "zeile-eng" }, [
    eingabe,
    a.einheit ? el("span", { class: "fett", text: a.einheit }) : null,
  ]);
}

function rechenwegFeld(a, antwort, { aendern, nurLesen }) {
  const werte = { ...(antwort && typeof antwort === "object" ? antwort : {}) };
  return el(
    "div",
    { class: "stapel" },
    a.schritte.map((s) => {
      const eingabe = el("input", {
        type: "text",
        inputmode: "decimal",
        value: werte[s.id] ?? "",
        disabled: nurLesen,
        style: { maxWidth: "12rem" },
      });
      eingabe.addEventListener("input", () => {
        werte[s.id] = eingabe.value;
        aendern({ ...werte });
      });
      return el("div", { class: "zeile-eng" }, [
        el("span", { style: { minWidth: "16rem" }, text: `${s.bezeichnung}:` }),
        eingabe,
        s.einheit ? el("span", { class: "fett", text: s.einheit }) : null,
        el("span", { class: "klein grau", text: `(${s.punkte} P.)` }),
      ]);
    })
  );
}

/* -------------------------------------------------------------------- Python */

function pythonFeld(a, antwort, { aendern, nurLesen, runner }) {
  const stand = { code: antwort?.code ?? a.startcode ?? "", eingabe: antwort?.eingabe ?? "" };

  const editor = el("textarea", { class: "code", spellcheck: "false", disabled: nurLesen });
  editor.value = stand.code;
  tabEinrueckung(editor);
  editor.addEventListener("input", () => {
    stand.code = editor.value;
    aendern({ ...stand });
  });

  const ausgabe = el("pre", { class: "ausgabe", text: "" });
  const stdinFeld = el("input", {
    type: "text",
    value: stand.eingabe,
    placeholder: "Eingaben für input() – mehrere mit ; trennen",
    disabled: nurLesen,
  });
  stdinFeld.addEventListener("input", () => {
    stand.eingabe = stdinFeld.value;
    aendern({ ...stand });
  });

  const laufKnopf = el("button", { type: "button", class: "btn", text: "▶ Code ausführen" });
  const testKnopf = a.selbsttests?.length
    ? el("button", { type: "button", class: "btn sekundaer", text: "Selbsttests prüfen" })
    : null;

  async function ausfuehren() {
    if (!runner) {
      ausgabe.textContent = "Die Python-Umgebung steht nicht bereit.";
      return;
    }
    laufKnopf.disabled = true;
    laufKnopf.textContent = "läuft …";
    ausgabe.textContent = "";
    try {
      const eingabe = stdinFeld.value.split(";").join("\n");
      const r = await runner.ausfuehren(editor.value, eingabe);
      ausgabe.textContent = [r.ausgabe, r.fehler].filter(Boolean).join("\n") || "(keine Ausgabe)";
      ausgabe.style.color = r.fehler ? "#c00000" : "";
    } finally {
      laufKnopf.disabled = false;
      laufKnopf.textContent = "▶ Code ausführen";
    }
  }
  laufKnopf.addEventListener("click", ausfuehren);

  if (testKnopf) {
    testKnopf.addEventListener("click", async () => {
      testKnopf.disabled = true;
      testKnopf.textContent = "prüft …";
      ausgabe.textContent = "";
      try {
        const ergebnisse = await runner.alleTests(a, editor.value, a.selbsttests);
        ausgabe.textContent = ergebnisse
          .map((r, i) => {
            const t = a.selbsttests[i];
            return `${r.bestanden ? "✓" : "✗"} ${t.name}${r.meldung ? ` – ${r.meldung}` : ""}`;
          })
          .join("\n");
        const alleGut = ergebnisse.every((r) => r.bestanden);
        ausgabe.style.color = alleGut ? "#1e7a45" : "#c00000";
      } finally {
        testKnopf.disabled = false;
        testKnopf.textContent = "Selbsttests prüfen";
      }
    });
  }

  return el("div", { class: "stapel" }, [
    editor,
    el("div", { class: "zeile" }, [laufKnopf, testKnopf, el("span", { class: "schieb-rechts" })]),
    el("label", { class: "feld", style: { marginBottom: 0 } }, [
      el("span", { class: "bez", text: "Eingaben (nur zum Ausprobieren)" }),
      stdinFeld,
    ]),
    el("div", {}, [el("h4", { text: "Ausgabe" }), ausgabe]),
    a.selbsttests?.length
      ? el("p", {
          class: "klein grau",
          text: "Die Selbsttests sind eine Hilfe für dich. Für die Note zählen die Tests der Lehrkraft.",
        })
      : null,
  ]);
}

/* -------------------------------------------------------------------- Parsons */

function parsonsFeld(a, antwort, { aendern, nurLesen }) {
  const alle = a.bausteine;
  let ziel = Array.isArray(antwort?.reihenfolge) ? [...antwort.reihenfolge] : [];
  const tiefen = { ...(antwort?.einrueckungen ?? {}) };
  const vorrat = () => alle.filter((b) => !ziel.includes(b.id));
  const textVon = (id) => alle.find((b) => b.id === id)?.text ?? "?";

  const vorratBox = el("div", { class: "stapel" });
  const zielBox = el("div", { class: "stapel" });

  const melden = () => aendern({ reihenfolge: [...ziel], einrueckungen: { ...tiefen } });

  const zeichne = () => {
    vorratBox.replaceChildren();
    const rest = vorrat();
    if (!rest.length) vorratBox.appendChild(el("p", { class: "leer", text: "Alle Zeilen sind eingebaut." }));
    rest.forEach((b) => {
      vorratBox.appendChild(
        el("div", { class: "option", style: { alignItems: "center" } }, [
          el("code", { style: { flex: "1" }, text: b.text }),
          nurLesen ? null : knopf("↓ einbauen", () => { ziel.push(b.id); tiefen[b.id] ??= 0; zeichne(); melden(); }),
        ])
      );
    });

    zielBox.replaceChildren();
    if (!ziel.length) zielBox.appendChild(el("p", { class: "leer", text: "Noch keine Zeile eingebaut." }));
    ziel.forEach((id, i) => {
      const tiefe = Number(tiefen[id] ?? 0);
      zielBox.appendChild(
        el("div", { class: "option", style: { alignItems: "center" } }, [
          el("span", { class: "klein grau", style: { width: "1.4rem" }, text: `${i + 1}` }),
          el("code", {
            style: { flex: "1", paddingLeft: `${tiefe * 1.6}rem` },
            text: textVon(id),
          }),
          nurLesen
            ? null
            : el("span", { class: "zeile-eng" }, [
                knopf("◀", () => { tiefen[id] = Math.max(0, tiefe - 1); zeichne(); melden(); }, "btn sekundaer klein", "weniger einrücken"),
                knopf("▶", () => { tiefen[id] = Math.min(6, tiefe + 1); zeichne(); melden(); }, "btn sekundaer klein", "mehr einrücken"),
                knopf("↑", () => { if (i > 0) { [ziel[i - 1], ziel[i]] = [ziel[i], ziel[i - 1]]; zeichne(); melden(); } }, "btn sekundaer klein", "nach oben"),
                knopf("↓", () => { if (i < ziel.length - 1) { [ziel[i + 1], ziel[i]] = [ziel[i], ziel[i + 1]]; zeichne(); melden(); } }, "btn sekundaer klein", "nach unten"),
                knopf("✕", () => { ziel = ziel.filter((x) => x !== id); zeichne(); melden(); }, "btn warnung klein", "entfernen"),
              ]),
        ])
      );
    });
  };
  zeichne();

  return el("div", { class: "spalten spalten-2" }, [
    el("div", {}, [el("h4", { text: "Verfügbare Zeilen" }), vorratBox]),
    el("div", {}, [
      el("h4", { text: "Dein Programm" }),
      zielBox,
      a.pruefeEinrueckung
        ? el("p", { class: "klein grau", text: "Achte auch auf die Einrückung (◀ ▶)." })
        : null,
    ]),
  ]);
}

/* ------------------------------------------------------------------ HTML/CSS/JS */

function webFeld(a, antwort, { aendern, nurLesen }) {
  const stand = {
    html: antwort?.html ?? a.startHtml ?? "",
    css: antwort?.css ?? a.startCss ?? "",
    js: antwort?.js ?? a.startJs ?? "",
  };
  const rahmen = el("iframe", {
    title: "Vorschau",
    style: {
      width: "100%",
      height: "22rem",
      border: "1px solid var(--grey-200)",
      borderRadius: "6px",
      background: "#fff",
    },
  });

  const aktualisieren = entprellt(() => WebRunner.vorschau(rahmen, stand, a.jsAktiv), 350);

  const feld = (schluessel, bez, sichtbar = true) => {
    if (!sichtbar) return null;
    const t = el("textarea", { class: "code", spellcheck: "false", rows: 10, disabled: nurLesen });
    t.value = stand[schluessel];
    tabEinrueckung(t, 2);
    t.addEventListener("input", () => {
      stand[schluessel] = t.value;
      aendern({ ...stand });
      aktualisieren();
    });
    return el("label", { class: "feld" }, [el("span", { class: "bez", text: bez }), t]);
  };

  setTimeout(() => WebRunner.vorschau(rahmen, stand, a.jsAktiv), 0);

  return el("div", { class: "spalten spalten-2" }, [
    el("div", {}, [
      feld("html", "HTML"),
      feld("css", "CSS"),
      feld("js", "JavaScript", !!a.jsAktiv),
    ]),
    el("div", {}, [
      el("h4", { text: "Vorschau" }),
      rahmen,
      el("p", { class: "klein grau", text: "Die Vorschau aktualisiert sich automatisch." }),
    ]),
  ]);
}
