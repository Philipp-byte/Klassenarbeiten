/* ==========================================================================
   Druckansicht / PDF-Erzeugung.

   Baut die Arbeit als feste A4-Blätter auf und öffnet den Druckdialog des
   Browsers. Dort „Als PDF speichern“ wählen – es wird nichts hochgeladen und
   keine fremde Bibliothek geladen.

   Drei Ausgaben:
     • "leer"      – die Angabe zum Austeilen auf Papier
     • "loesung"   – dasselbe mit eingetragenen Lösungen (Erwartungshorizont)
     • "korrektur" – die korrigierte Arbeit einer Schülerin / eines Schülers
                     mit Antworten, Punkten pro Prüfschritt und Note
   ========================================================================== */

import { el, auszeichnung } from "./dom.js";
import { aufgabenPunkte, gesamtPunkte, luecken, varianten, datumDeutsch } from "./model.js";
import { formatNote, formatPunkte, punkteNotenTabelle, standardSchluessel, NOTENTEXT } from "./noten.js";

const LOGO = new URL("../../assets/logo/JJWS_Bildmarke_bunt.png", import.meta.url).href;

/* ============================================================== Seitenaufbau */

class Blattsatz {
  /**
   * @param {object} kopf  { links, mitte, rechts }
   * @param {object} fuss  { links, mitte }
   */
  constructor(buehne, kopf, fuss) {
    this.buehne = buehne;
    this.kopf = kopf;
    this.fuss = fuss;
    this.blaetter = [];
    this.koerper = null;
  }

  neuesBlatt(deckblatt = false) {
    const koerper = el("div", { class: "koerper" });
    const blatt = el("div", { class: `blatt${deckblatt ? " deckblatt" : ""}` }, [
      el("div", { class: "kopf" }, [
        el("div", { class: "links", text: this.kopf.links }),
        el("div", { class: "mitte", text: this.kopf.mitte }),
        el("div", { class: "rechts" }, [
          el("span", { text: this.kopf.rechts }),
          el("img", { src: LOGO, alt: "JJWS" }),
        ]),
      ]),
      koerper,
      el("div", { class: "fuss" }, [
        el("div", { class: "links", text: this.fuss.links }),
        el("div", { class: "mitte", text: this.fuss.mitte }),
        el("div", { class: "rechts seitenzahl", text: "" }),
      ]),
    ]);
    this.buehne.appendChild(blatt);
    this.blaetter.push(blatt);
    this.koerper = koerper;
    return koerper;
  }

  /** Läuft der Inhalt gerade über den Rand des Blattes hinaus? */
  _ueberlauf() {
    return this.koerper.scrollHeight > this.koerper.clientHeight + 1;
  }

  /**
   * Hängt einen Block an.
   *
   * Es darf unter keinen Umständen etwas abgeschnitten werden. Deshalb drei
   * Stufen:
   *   1. Passt der Block auf das aktuelle Blatt? Dann fertig.
   *   2. Sonst ein neues Blatt beginnen und dort einfügen.
   *   3. Ist der Block auch für ein leeres Blatt zu hoch (langer Quelltext,
   *      viele Schreiblinien, große Tabelle), wird er aufgeteilt und über
   *      mehrere Blätter fortgesetzt.
   */
  fuegeEin(knoten) {
    if (!this.koerper) this.neuesBlatt();

    this.koerper.appendChild(knoten);
    if (!this._ueberlauf()) return knoten;

    if (this.koerper.childElementCount > 1) {
      this.koerper.removeChild(knoten);
      this.neuesBlatt();
      this.koerper.appendChild(knoten);
      if (!this._ueberlauf()) return knoten;
    }

    // Auch allein zu hoch: aufteilen.
    this.koerper.removeChild(knoten);
    this._teileAuf(knoten);
    return knoten;
  }

  /**
   * Zerlegt einen zu hohen Block in seine Kinder und verteilt ihn über
   * mehrere Blätter. Die Hülle (Rahmen, Klassen) wird auf jedem Blatt
   * wiederholt, damit die Fortsetzung gleich aussieht.
   */
  _teileAuf(knoten, tiefe = 0) {
    if (knoten.tagName === "TABLE") return this._teileTabelle(knoten, tiefe);

    const kinder = this._kinderAufloesen(knoten);
    if (!kinder.length || tiefe > 5) {
      // Nicht weiter teilbar – dann lieber überstehen lassen als verlieren.
      this.koerper.appendChild(knoten);
      return;
    }

    let huelle = this._neueHuelle(knoten, false);
    for (const kind of kinder) {
      huelle.appendChild(kind);
      if (!this._ueberlauf()) continue;

      huelle.removeChild(kind);
      if (huelle.childNodes.length === 0) {
        // Schon dieses eine Kind ist zu groß: eine Ebene tiefer aufteilen.
        huelle.remove();
        if (kind.nodeType === Node.ELEMENT_NODE) this._teileAuf(kind, tiefe + 1);
        else this.koerper.appendChild(kind);
        huelle = this._neueHuelle(knoten, true);
        continue;
      }
      this.neuesBlatt();
      huelle = this._neueHuelle(knoten, true);
      huelle.appendChild(kind);
      if (this._ueberlauf()) {
        huelle.removeChild(kind);
        huelle.remove();
        if (kind.nodeType === Node.ELEMENT_NODE) this._teileAuf(kind, tiefe + 1);
        else this.koerper.appendChild(kind);
        huelle = this._neueHuelle(knoten, true);
      }
    }
    if (!huelle.childNodes.length) huelle.remove();
  }

  /** Tabellen zeilenweise trennen und den Tabellenkopf wiederholen. */
  _teileTabelle(tabelle, tiefe) {
    const kopf = tabelle.querySelector("thead");
    const zeilen = Array.from(tabelle.querySelectorAll("tbody > tr"));
    if (!zeilen.length) {
      this.koerper.appendChild(tabelle);
      return;
    }

    const neueTabelle = (fortsetzung) => {
      const t = tabelle.cloneNode(false);
      if (fortsetzung) t.classList.add("fortsetzung");
      if (kopf) t.appendChild(kopf.cloneNode(true));
      const koerper = document.createElement("tbody");
      t.appendChild(koerper);
      this.koerper.appendChild(t);
      return { t, koerper };
    };

    let { t, koerper } = neueTabelle(false);
    for (const zeile of zeilen) {
      koerper.appendChild(zeile);
      if (!this._ueberlauf()) continue;
      koerper.removeChild(zeile);
      if (!koerper.childElementCount) {
        // Eine einzelne Zeile passt auf kein Blatt – dann eben überstehen lassen.
        koerper.appendChild(zeile);
        continue;
      }
      this.neuesBlatt();
      ({ t, koerper } = neueTabelle(true));
      koerper.appendChild(zeile);
    }
    if (!koerper.childElementCount) t.remove();
  }

  _neueHuelle(vorlage, fortsetzung) {
    const huelle = vorlage.cloneNode(false);
    if (fortsetzung && huelle.classList) huelle.classList.add("fortsetzung");
    this.koerper.appendChild(huelle);
    return huelle;
  }

  /**
   * Kinder eines Knotens als teilbare Liste. Lange Textknoten werden dabei
   * zerlegt: Quelltext zeilenweise, Fließtext wortweise. Nur so lässt sich
   * ein einzelner sehr langer Absatz sauber über zwei Seiten führen.
   */
  _kinderAufloesen(knoten) {
    const zeilenweise =
      knoten.tagName === "PRE" ||
      knoten.classList?.contains("code-feld") ||
      knoten.classList?.contains("schuelerantwort");

    const liste = [];
    for (const kind of Array.from(knoten.childNodes)) {
      if (kind.nodeType !== Node.TEXT_NODE || !kind.textContent.trim()) {
        liste.push(kind);
        continue;
      }
      const teile = zeilenweise
        ? kind.textContent.split(/(?<=\n)/)
        : kind.textContent.split(/(?<=\s)/);
      if (teile.length < 2) {
        liste.push(kind);
        continue;
      }
      teile.forEach((t) => liste.push(document.createTextNode(t)));
    }
    return liste;
  }

  /** Trägt „Seite x/y“ ein, sobald alle Blätter stehen. */
  nummeriere() {
    const gesamt = this.blaetter.length;
    this.blaetter.forEach((blatt, i) => {
      blatt.querySelector(".seitenzahl").textContent = `Seite ${i + 1}/${gesamt}`;
    });
  }
}

/* =============================================================== Bausteine */

function textBlock(text, klasse = "") {
  const html = auszeichnung(text);
  return el("div", { class: klasse, html });
}

function schreiblinien(anzahl) {
  return el(
    "div",
    { class: "linien" },
    Array.from({ length: Math.max(1, anzahl) }, () => el("div", { class: "linie" }))
  );
}

function kaestchen(inhalt = "") {
  return el("span", { class: "kaestchen", text: inhalt });
}

function punkteMarke(erreicht, moeglich) {
  const klasse = erreicht >= moeglich && moeglich > 0 ? "voll" : erreicht > 0 ? "teil" : "null";
  return el("span", {
    class: `korr-punkte ${klasse}`,
    text: `${formatPunkte(erreicht)} / ${formatPunkte(moeglich)} P.`,
  });
}

function pruefliste(teile) {
  const zeichen = { richtig: "✓", falsch: "✗", teilweise: "~", leer: "–", offen: "?" };
  return el(
    "ul",
    { class: "pruefliste" },
    teile.map((t) =>
      el("li", { class: t.status }, [
        el("span", { class: "zeichen", text: zeichen[t.status] ?? "·" }),
        el("span", {}, [
          el("span", { text: t.bez }),
          t.detail ? el("span", { class: "detail", text: t.detail }) : null,
        ]),
        el("span", {
          class: "p",
          text: t.moeglich > 0 ? `${formatPunkte(t.erreicht)}/${formatPunkte(t.moeglich)}` : "",
        }),
      ])
    )
  );
}

function antwortKasten(inhalt, { code = false } = {}) {
  const text = String(inhalt ?? "").trim();
  return el("div", {
    class: `schuelerantwort${code ? " code" : ""}${text ? "" : " leer"}`,
    text: text || "— nicht bearbeitet —",
  });
}

/* ------------------------------------------------ Antwortbereiche je Aufgabentyp */

/**
 * Baut den Antwortbereich einer Aufgabe.
 * @param {object} a        Aufgabe aus dem Master (mit Lösungen)
 * @param {string} modus    "leer" | "loesung" | "korrektur"
 * @param {*} antwort       Antwort der SuS (nur im Korrekturmodus)
 * @param {object} erg      Bewertungsergebnis (nur im Korrekturmodus)
 */
function antwortBereich(a, modus, antwort, erg) {
  const knoten = el("div", { class: "antwort-bereich" });
  const zeig = (x) => knoten.appendChild(x);
  const istKorrektur = modus === "korrektur";
  const istLoesung = modus === "loesung";

  switch (a.typ) {
    case "mc": {
      const gewaehlt = new Set(Array.isArray(antwort) ? antwort : []);
      a.optionen.forEach((o) => {
        let marke = "";
        if (istLoesung) marke = o.richtig ? "X" : "";
        else if (istKorrektur) marke = gewaehlt.has(o.id) ? "X" : "";
        const zeile = el("div", { class: "wahl-zeile" }, [
          kaestchen(marke),
          el("span", { class: "text" }, [
            document.createTextNode(o.text),
            (istLoesung || istKorrektur) && o.richtig
              ? el("span", { text: "  ✓ richtig", style: { color: "#1e7a45", fontWeight: "700" } })
              : null,
          ]),
        ]);
        zeig(zeile);
      });
      break;
    }

    case "wahrfalsch": {
      const gew = antwort && typeof antwort === "object" ? antwort : {};
      const tabelle = el("table", { class: "raster" });
      tabelle.appendChild(
        el("thead", {}, [
          el("tr", {}, [
            el("th", { text: "Nr." }),
            el("th", { text: a.rasterUeberschrift || "Vorgang" }),
            ...a.spalten.map((s) => el("th", { text: s.text })),
          ]),
        ])
      );
      const koerper = el("tbody");
      a.zeilen.forEach((z, i) => {
        const zellen = a.spalten.map((s) => {
          let inhalt = "";
          if (istLoesung && z.richtig === s.id) inhalt = "X";
          if (istKorrektur && gew[z.id] === s.id) inhalt = "X";
          const falsch = istKorrektur && gew[z.id] === s.id && z.richtig !== s.id;
          const fehlt = istKorrektur && z.richtig === s.id && gew[z.id] !== s.id;
          return el("td", { class: "mitte" }, [
            el("span", { text: inhalt, style: falsch ? { color: "#c00000", fontWeight: "700" } : {} }),
            fehlt ? el("span", { text: "✓", style: { color: "#1e7a45", fontWeight: "700" } }) : null,
          ]);
        });
        koerper.appendChild(
          el("tr", {}, [el("td", { class: "nr", text: String(i + 1) }), el("td", { text: z.text }), ...zellen])
        );
      });
      tabelle.appendChild(koerper);
      zeig(tabelle);
      break;
    }

    case "kurzantwort":
      if (istKorrektur) zeig(antwortKasten(antwort, { code: a.alsCode }));
      else if (istLoesung) zeig(antwortKasten(a.loesungen.filter(Boolean).join("  /  "), { code: a.alsCode }));
      else zeig(schreiblinien(1));
      break;

    case "stichworte":
      if (istKorrektur) zeig(antwortKasten(antwort));
      else if (istLoesung) {
        zeig(
          el("div", { class: "schuelerantwort" }, [
            el("div", { text: "Erwartete Stichwörter:" }),
            el(
              "ul",
              { style: { margin: "1mm 0 0 5mm" } },
              (a.begriffe || []).map((b) =>
                el("li", { text: `${varianten(b.varianten).join(" / ")} (${formatPunkte(b.punkte)} P.)` })
              )
            ),
          ])
        );
      } else zeig(schreiblinien(a.zeilen || 5));
      break;

    case "aufzaehlung": {
      const eingaben = Array.isArray(antwort) ? antwort : [];
      const anzahl = Number(a.anzahlFelder) || 4;
      if (istLoesung) {
        zeig(
          el(
            "ol",
            { style: { margin: "1mm 0 0 6mm" } },
            (a.gesucht || []).map((g) =>
              el("li", { text: `${varianten(g.varianten).join(" / ")} (${formatPunkte(g.punkte)} P.)` })
            )
          )
        );
      } else {
        for (let i = 0; i < anzahl; i++) {
          zeig(
            el("div", { style: { display: "flex", gap: "2mm", alignItems: "baseline", marginBottom: "1.5mm" } }, [
              el("span", { text: `${i + 1}.`, style: { width: "6mm", flex: "none" } }),
              istKorrektur
                ? el("span", {
                    style: { flex: "1", borderBottom: ".3mm solid #1d1d1b" },
                    text: String(eingaben[i] ?? "").trim() || "—",
                  })
                : el("span", { style: { flex: "1", borderBottom: ".3mm solid #1d1d1b", height: "7mm" } }),
            ])
          );
        }
      }
      break;
    }

    case "zuordnung": {
      const zu = antwort && typeof antwort === "object" ? antwort : {};
      const tabelle = el("table", { class: "raster" });
      tabelle.appendChild(
        el("thead", {}, [
          el("tr", {}, [el("th", { text: "Begriff" }), el("th", { text: "Zuordnung" })]),
        ])
      );
      const koerper = el("tbody");
      a.paare.forEach((p) => {
        let inhalt = "";
        if (istLoesung) inhalt = p.rechts;
        else if (istKorrektur) inhalt = String(zu[p.id] ?? "").trim() || "—";
        const falsch =
          istKorrektur && String(zu[p.id] ?? "").trim().toLowerCase() !== String(p.rechts).trim().toLowerCase();
        koerper.appendChild(
          el("tr", {}, [
            el("td", { text: p.links }),
            el("td", {}, [
              el("span", { text: inhalt, style: falsch ? { color: "#c00000" } : {} }),
              falsch ? el("span", { text: `  (richtig: ${p.rechts})`, style: { color: "#1e7a45" } }) : null,
            ]),
          ])
        );
      });
      tabelle.appendChild(koerper);
      zeig(tabelle);
      if (!istKorrektur && !istLoesung) {
        zeig(
          el("div", { class: "korr-hinweis", text: "Trage rechts den passenden Begriff ein." })
        );
      }
      break;
    }

    case "reihenfolge": {
      const gegeben = Array.isArray(antwort) ? antwort : [];
      const text = (id) => a.elemente.find((e) => e.id === id)?.text ?? "?";
      if (istLoesung) {
        zeig(el("ol", { style: { margin: "1mm 0 0 6mm" } }, a.elemente.map((e) => el("li", { text: e.text }))));
      } else if (istKorrektur) {
        zeig(
          el(
            "ol",
            { style: { margin: "1mm 0 0 6mm" } },
            gegeben.map((id, i) => {
              const richtig = a.elemente[i]?.id === id;
              return el("li", {
                text: text(id),
                style: { color: richtig ? "#14572f" : "#c00000" },
              });
            })
          )
        );
      } else {
        zeig(
          el(
            "div",
            {},
            a.elemente.map((e) =>
              el("div", { style: { display: "flex", gap: "2mm", marginBottom: "1.5mm" } }, [
                el("span", { class: "luecke-druck", style: { minWidth: "12mm" } }),
                el("span", { text: e.text }),
              ])
            )
          )
        );
        zeig(el("div", { class: "korr-hinweis", text: "Nummeriere die Zeilen in der richtigen Reihenfolge." }));
      }
      break;
    }

    case "lueckentext": {
      const eingaben = Array.isArray(antwort) ? antwort : [];
      const zeile = el("div", { style: a.alsCode ? { fontFamily: "Consolas, monospace" } : {} });
      let nr = 0;
      luecken(a.vorlage).forEach((t) => {
        if (t.art === "text") {
          zeile.appendChild(document.createTextNode(t.inhalt));
        } else {
          const i = nr++;
          let inhalt = "";
          if (istLoesung) inhalt = t.loesungen[0];
          else if (istKorrektur) inhalt = String(eingaben[i] ?? "").trim() || "—";
          const falsch =
            istKorrektur && erg?.teile?.[i] && erg.teile[i].status !== "richtig";
          zeile.appendChild(
            el("span", {
              class: `luecke-druck${inhalt ? " gefuellt" : ""}`,
              text: inhalt,
              style: falsch ? { color: "#c00000" } : {},
            })
          );
          if (falsch) {
            zeile.appendChild(
              el("span", { text: ` (${t.loesungen[0]})`, style: { color: "#1e7a45", fontSize: "9pt" } })
            );
          }
        }
      });
      zeig(zeile);
      break;
    }

    case "zahl": {
      const einheit = a.einheit ? ` ${a.einheit}` : "";
      if (istLoesung) zeig(antwortKasten(`${a.loesung}${einheit}`));
      else if (istKorrektur) zeig(antwortKasten(`${String(antwort ?? "").trim() || "—"}${einheit}`));
      else zeig(schreiblinien(1));
      break;
    }

    case "rechenweg": {
      const werte = antwort && typeof antwort === "object" ? antwort : {};
      (a.schritte || []).forEach((s) => {
        let inhalt = "";
        if (istLoesung) inhalt = `${s.loesung} ${s.einheit ?? ""}`.trim();
        else if (istKorrektur) inhalt = `${String(werte[s.id] ?? "").trim() || "—"} ${s.einheit ?? ""}`.trim();
        zeig(
          el("div", { style: { display: "flex", gap: "2mm", alignItems: "baseline", marginBottom: "2mm" } }, [
            el("span", { text: `${s.bezeichnung}:`, style: { minWidth: "50mm" } }),
            el("span", { class: "luecke-druck", style: { minWidth: "35mm" }, text: inhalt }),
            el("span", { class: "korr-hinweis", text: `(${formatPunkte(s.punkte)} P.)` }),
          ])
        );
      });
      if (!istKorrektur && !istLoesung) zeig(schreiblinien(4));
      break;
    }

    case "code-python": {
      if (istLoesung) {
        zeig(el("div", { class: "code-feld", text: a.loesungscode || a.startcode || "" }));
      } else if (istKorrektur) {
        zeig(el("div", { class: "code-feld", text: String(antwort?.code ?? "").trim() || "— nicht bearbeitet —" }));
      } else {
        zeig(el("div", { class: "code-feld", text: a.startcode || "" }));
        zeig(el("div", { class: "code-feld leer", style: { minHeight: "45mm" }, text: "" }));
      }
      break;
    }

    case "parsons": {
      if (istLoesung) {
        zeig(
          el("div", {
            class: "code-feld",
            text: a.zeilen.map((z) => "    ".repeat(Number(z.einrueckung) || 0) + z.text).join("\n"),
          })
        );
      } else if (istKorrektur) {
        const reihenfolge = Array.isArray(antwort?.reihenfolge) ? antwort.reihenfolge : [];
        const alle = [...(a.zeilen || []), ...(a.ablenker || [])];
        const text = reihenfolge
          .map((id) => {
            const z = alle.find((x) => x.id === id);
            const tiefe = Number(antwort?.einrueckungen?.[id] ?? 0);
            return "    ".repeat(tiefe) + (z?.text ?? "?");
          })
          .join("\n");
        zeig(el("div", { class: "code-feld", text: text || "— nicht bearbeitet —" }));
      } else {
        const alle = [...(a.zeilen || []), ...(a.ablenker || [])];
        zeig(
          el(
            "div",
            {},
            alle.map((z) =>
              el("div", { style: { display: "flex", gap: "2mm", marginBottom: "1.2mm" } }, [
                el("span", { class: "luecke-druck", style: { minWidth: "10mm" } }),
                el("span", { style: { fontFamily: "Consolas, monospace", fontSize: "9.5pt" }, text: z.text }),
              ])
            )
          )
        );
        zeig(el("div", { class: "korr-hinweis", text: "Nummeriere die Zeilen und gib die Einrückung an." }));
      }
      break;
    }

    case "code-web": {
      const teile = istLoesung
        ? { HTML: a.loesungHtml, CSS: a.loesungCss, JavaScript: a.loesungJs }
        : istKorrektur
        ? { HTML: antwort?.html, CSS: antwort?.css, JavaScript: antwort?.js }
        : { HTML: a.startHtml, CSS: a.startCss, JavaScript: a.jsAktiv ? a.startJs : "" };
      for (const [bez, inhalt] of Object.entries(teile)) {
        if (!String(inhalt ?? "").trim() && !(modus === "leer")) continue;
        zeig(el("div", { style: { fontWeight: "700", fontSize: "9.5pt", marginTop: "2mm" }, text: bez }));
        zeig(el("div", { class: "code-feld", text: String(inhalt ?? "").trim() || " " }));
      }
      break;
    }

    case "freitext":
      if (istKorrektur) zeig(antwortKasten(antwort));
      else if (istLoesung) zeig(textBlock(a.erwartungshorizont, "schuelerantwort"));
      else zeig(schreiblinien(a.zeilen || 8));
      break;

    default:
      zeig(schreiblinien(4));
  }
  return knoten;
}

/* ============================================================== Deckblatt */

function deckblatt(satz, pruefung, daten, modus) {
  satz.neuesBlatt(true);
  // Ausgefüllte Fassungen tragen mehr Inhalt – dort enger setzen.
  if (modus !== "leer") satz.blaetter[satz.blaetter.length - 1].classList.add("eng");
  const einfuegen = (knoten) => satz.fuegeEin(knoten);
  const gesamt = gesamtPunkte(pruefung);

  einfuegen(
    el("div", { class: "deck-titel" }, [
      el("h1", { text: pruefung.titel || "Klassenarbeit" }),
      el("img", { src: LOGO, alt: "Johann-Jakob-Widmann-Schule" }),
    ])
  );

  const ident = daten?.identitaet ?? null;
  const namensZeile = (bez, wert) =>
    el("tr", {}, [
      el("td", { colspan: 2 }, [
        el("span", { class: "bez", text: bez }),
        wert ? el("span", { class: "wert", text: wert }) : null,
      ]),
    ]);

  const kopfTabelle = el("table", { class: `deck-kopf${modus === "leer" ? "" : " gedruckt"}` });
  if (pruefung.identifikation === "nummer") {
    kopfTabelle.appendChild(namensZeile("Prüfungsnummer:", ident?.nummer ?? ""));
  } else {
    kopfTabelle.appendChild(namensZeile("Name:", ident?.name ?? ""));
    kopfTabelle.appendChild(namensZeile("Vorname:", ident?.vorname ?? ""));
  }
  kopfTabelle.appendChild(
    el("tr", {}, [
      el("td", { class: "eng" }, [
        el("span", { class: "bez", text: "Klasse:" }),
        el("span", { class: "wert", text: ident?.klasse || pruefung.klasse || "" }),
      ]),
      el("td", { class: "eng" }, [
        el("span", { class: "bez", text: "Fach:" }),
        el("span", { class: "wert", text: pruefung.fach || "" }),
      ]),
    ])
  );
  kopfTabelle.appendChild(
    el("tr", {}, [
      el("td", { class: "eng" }, [
        el("span", { class: "bez", text: "Thema" }),
        el("span", { class: "wert", text: pruefung.thema || pruefung.titel || "" }),
      ]),
      el("td", { class: "eng" }, [
        el("span", { class: "bez", text: "Zeit:" }),
        el("span", { class: "wert", text: `${pruefung.bearbeitungszeitMin || 45} min` }),
      ]),
    ])
  );
  if (pruefung.hilfsmittel?.trim()) {
    kopfTabelle.appendChild(
      el("tr", {}, [
        el("td", { class: "eng", colspan: 2 }, [
          el("span", { class: "bez", text: "Erlaubte Hilfsmittel:" }),
          el("span", { class: "wert", text: pruefung.hilfsmittel }),
        ]),
      ])
    );
  }
  einfuegen(kopfTabelle);

  /* Aufgabenübersicht */
  const anzahl = pruefung.aufgaben.length;
  const enge = anzahl > 12 ? " sehr-kompakt" : anzahl > 6 ? " kompakt" : "";
  const ueber = el("table", { class: `uebersicht${enge}` }, [
    el("thead", {}, [
      el("tr", {}, [
        el("th", { style: { width: "14mm" }, text: "Nr." }),
        el("th", { text: "Aufgabe" }),
        el("th", { style: { width: "26mm" }, text: "Erreichte Punkte" }),
        el("th", { style: { width: "26mm" }, text: "Mögliche Punkte" }),
      ]),
    ]),
  ]);
  const ueberKoerper = el("tbody");
  pruefung.aufgaben.forEach((a, i) => {
    const erg = daten?.bewertung?.find((e) => e.aufgabeId === a.id);
    ueberKoerper.appendChild(
      el("tr", {}, [
        el("td", { text: String(i + 1) }),
        el("td", { class: "aufgabe", text: a.titel || a.abschnitt || `Aufgabe ${i + 1}` }),
        el("td", { class: "punkte", text: erg ? formatPunkte(erg.erreicht) : "" }),
        el("td", { class: "punkte", text: formatPunkte(aufgabenPunkte(a)) }),
      ])
    );
  });
  ueber.appendChild(ueberKoerper);
  einfuegen(ueber);

  /* Bewertungskasten */
  const note = daten?.gesamt?.note;
  const bewertung = el("div", { class: "deck-bewertung" }, [
    el("h2", { text: "Bewertung" }),
    el("table", { class: "bewertung" }, [
      el("tbody", {}, [
        el("tr", {}, [
          el("td", { class: "bez", text: "Erreichte Punkte:" }),
          el("td", { class: "gross", style: { width: "32mm" }, text: daten ? formatPunkte(daten.gesamt.erreicht) : "" }),
          el("td", { style: { width: "16mm" }, text: "von" }),
          el("td", { class: "gross", style: { width: "26mm" }, text: formatPunkte(gesamt) }),
          el("td", { text: "Punkten" }),
        ]),
        el("tr", {}, [
          el("td", { class: "bez", text: "Note:" }),
          el("td", { class: "note-feld", colspan: 4 }, [
            note !== undefined && note !== null
              ? el("span", {}, [
                  el("span", { text: formatNote(note) }),
                  el("span", {
                    style: { fontWeight: "400", fontSize: "10.5pt" },
                    text: `   (${NOTENTEXT[Math.round(note)]}, ${formatPunkte(daten.gesamt.prozent)} %)`,
                  }),
                ])
              : "",
          ]),
        ]),
      ]),
    ]),
  ]);
  einfuegen(bewertung);

  if (modus === "leer" && pruefung.hinweise?.trim()) {
    einfuegen(textBlock(pruefung.hinweise, "korr-hinweis"));
  }
}

/* ============================================================ Hauptfunktion */

/**
 * Öffnet die Druckansicht.
 *
 * @param {object} optionen
 *   modus      "leer" | "loesung" | "korrektur"
 *   pruefung   Master der Klassenarbeit
 *   daten      { identitaet, antworten, bewertung, gesamt, kommentar, kommentare }
 *   direktDrucken  true = Druckdialog sofort öffnen
 */
export function druckAnsicht({ modus = "leer", pruefung, daten = null, direktDrucken = false }) {
  document.querySelector(".druck-buehne")?.remove();

  const buehne = el("div", { class: "druck-buehne" });
  const titelText = {
    leer: "Angabe zum Ausdrucken",
    loesung: "Lösungsblatt (Erwartungshorizont)",
    korrektur: "Korrigierte Arbeit",
  }[modus];

  const leiste = el("div", { class: "druck-leiste" }, [
    el("span", { class: "titel", text: `${pruefung.titel} – ${titelText}` }),
    el("span", {
      class: "hinweis-klein",
      text: "Im Druckdialog „Als PDF speichern“ wählen · Ränder: Standard · Skalierung 100 %",
    }),
    el("span", { class: "schieb-rechts" }),
    el("button", { class: "btn", text: "Drucken / als PDF speichern", onclick: () => window.print() }),
    el("button", { class: "btn sekundaer", text: "Schließen", onclick: () => buehne.remove() }),
  ]);
  buehne.appendChild(leiste);
  document.body.appendChild(buehne);

  const satz = new Blattsatz(
    buehne,
    {
      links: pruefung.titel || "Klassenarbeit",
      mitte: pruefung.fach ? `Fach: ${pruefung.fach}` : "",
      rechts: daten?.identitaet?.klasse || pruefung.klasse || "",
    },
    {
      links: pruefung.schule || "JJWS",
      mitte: pruefung.lehrkraft || "",
    }
  );

  /* --- Deckblatt --- */
  deckblatt(satz, pruefung, daten, modus);

  /* --- Inhalt --- */
  satz.neuesBlatt();

  if (pruefung.ausgangssituation?.trim()) {
    satz.fuegeEin(el("div", { class: "abschnitt-titel", text: "Ausgangssituation" }));
    satz.fuegeEin(textBlock(pruefung.ausgangssituation, "situation"));
  }

  let letzterAbschnitt = null;
  pruefung.aufgaben.forEach((a, i) => {
    if (a.abschnitt && a.abschnitt !== letzterAbschnitt) {
      letzterAbschnitt = a.abschnitt;
      satz.fuegeEin(el("div", { class: "abschnitt-titel", text: a.abschnitt }));
    }

    const erg = daten?.bewertung?.find((e) => e.aufgabeId === a.id) ?? null;
    const antwort = daten?.antworten?.[a.id];
    const punkte = aufgabenPunkte(a);

    const kasten = el("div", { class: "aufgabe-kasten" }, [
      el("div", { class: "kopfzeile" }, [
        el("div", { class: "nummer", text: String(i + 1) }),
        el("div", { style: { flex: "1" } }, [
          el("span", { class: "bez", text: `Aufgabe (${formatPunkte(punkte)} Punkte):` }),
          a.titel ? el("span", { text: `  ${a.titel}` }) : null,
        ]),
        erg ? punkteMarke(erg.erreicht, erg.moeglich) : null,
      ]),
      el("div", { class: "inhalt" }, [
        a.situationsAnschluss ? el("p", { class: "anschluss", text: a.situationsAnschluss }) : null,
        textBlock(a.text),
      ]),
    ]);
    satz.fuegeEin(kasten);

    satz.fuegeEin(antwortBereich(a, modus, antwort, erg));

    if (modus === "korrektur" && erg?.teile?.length) {
      satz.fuegeEin(pruefliste(erg.teile));
      if (erg.hinweis) satz.fuegeEin(el("div", { class: "korr-hinweis", text: erg.hinweis }));
    }
    const kommentar = daten?.kommentare?.[a.id];
    if (kommentar?.trim()) {
      satz.fuegeEin(
        el("div", { class: "korr-kommentar" }, [
          el("span", { class: "bez", text: "Anmerkung: " }),
          document.createTextNode(kommentar),
        ])
      );
    }
  });

  /* --- Rückmeldung zum Schluss, nach der letzten Aufgabe --- */
  if (daten?.kommentar?.trim()) {
    satz.fuegeEin(el("div", { class: "abschnitt-titel", text: "Rückmeldung" }));
    satz.fuegeEin(el("div", { class: "korr-kommentar" }, [textBlock(daten.kommentar)]));
  }

  /* --- Notenschlüssel als letztes Blatt --- */
  if (modus !== "leer") {
    satz.neuesBlatt();
    satz.fuegeEin(el("div", { class: "abschnitt-titel", text: "Notenschlüssel" }));
    satz.fuegeEin(notenschluesselBlock(pruefung));
  }

  satz.nummeriere();
  if (direktDrucken) setTimeout(() => window.print(), 250);
  return buehne;
}

/** Punkte-Noten-Tabelle in drei Spalten. */
export function notenschluesselBlock(pruefung) {
  const schluessel = pruefung.notenschluessel || standardSchluessel();
  const gesamt = gesamtPunkte(pruefung);
  const zeilen = punkteNotenTabelle(gesamt, schluessel, 0.5);

  const spalten = 3;
  const proSpalte = Math.ceil(zeilen.length / spalten);
  const behaelter = el("div", { class: "spalten-druck" });

  for (let s = 0; s < spalten; s++) {
    const teil = zeilen.slice(s * proSpalte, (s + 1) * proSpalte);
    if (!teil.length) continue;
    behaelter.appendChild(
      el("table", { class: "schluessel" }, [
        el("thead", {}, [el("tr", {}, [el("th", { text: "Punkte" }), el("th", { text: "Note" })])]),
        el(
          "tbody",
          {},
          teil.map((z) => el("tr", {}, [el("td", { text: z.bereich }), el("td", { text: z.noteText })]))
        ),
      ])
    );
  }

  return el("div", {}, [
    el("div", {
      class: "korr-hinweis",
      style: { marginBottom: "3mm" },
      text: `${schluessel.name ?? "Notenschlüssel"} · Gesamtpunktzahl ${formatPunkte(gesamt)}`,
    }),
    behaelter,
  ]);
}

/* ------------------------------------------------------------- Notenliste */

/** Druckansicht der Notenliste einer Klasse. */
export function druckNotenliste({ pruefung, zeilen, statistik: stat }) {
  document.querySelector(".druck-buehne")?.remove();
  const buehne = el("div", { class: "druck-buehne" });
  buehne.appendChild(
    el("div", { class: "druck-leiste" }, [
      el("span", { class: "titel", text: `Notenliste – ${pruefung.titel}` }),
      el("span", { class: "schieb-rechts" }),
      el("button", { class: "btn", text: "Drucken / als PDF speichern", onclick: () => window.print() }),
      el("button", { class: "btn sekundaer", text: "Schließen", onclick: () => buehne.remove() }),
    ])
  );
  document.body.appendChild(buehne);

  const satz = new Blattsatz(
    buehne,
    { links: "Notenliste", mitte: pruefung.fach ? `Fach: ${pruefung.fach}` : "", rechts: pruefung.klasse || "" },
    { links: pruefung.schule || "JJWS", mitte: pruefung.lehrkraft || "" }
  );
  satz.neuesBlatt();

  satz.fuegeEin(
    el("div", { class: "abschnitt-titel", text: `${pruefung.titel} · ${datumDeutsch(pruefung.datum)}` })
  );

  const kopf = el("tr", {}, [
    el("th", { text: "Nr." }),
    el("th", { text: pruefung.identifikation === "nummer" ? "Prüfungsnr." : "Name, Vorname" }),
    ...pruefung.aufgaben.map((a, i) => el("th", { text: `${i + 1}` })),
    el("th", { text: "Punkte" }),
    el("th", { text: "%" }),
    el("th", { text: "Note" }),
  ]);
  const koerper = el("tbody");
  zeilen.forEach((z, i) => {
    koerper.appendChild(
      el("tr", {}, [
        el("td", { text: String(i + 1) }),
        el("td", { style: { textAlign: "left" }, text: z.bezeichnung }),
        ...pruefung.aufgaben.map((a) => {
          const e = z.bewertung?.find((x) => x.aufgabeId === a.id);
          return el("td", { text: e ? formatPunkte(e.erreicht) : "–" });
        }),
        el("td", { text: formatPunkte(z.gesamt.erreicht) }),
        el("td", { text: formatPunkte(z.gesamt.prozent) }),
        el("td", { style: { fontWeight: "700" }, text: formatNote(z.gesamt.note) }),
      ])
    );
  });
  satz.fuegeEin(el("table", { class: "schluessel" }, [el("thead", {}, [kopf]), koerper]));

  if (stat?.anzahl) {
    satz.fuegeEin(el("div", { class: "abschnitt-titel", text: "Auswertung" }));
    satz.fuegeEin(
      el("div", { class: "korr-hinweis" }, [
        document.createTextNode(
          `${stat.anzahl} Arbeiten · Durchschnitt ${formatNote(stat.schnitt, 2)} · ` +
            `${stat.bestanden} bestanden (${formatPunkte(stat.quote)} %)`
        ),
      ])
    );
    satz.fuegeEin(
      el("table", { class: "schluessel" }, [
        el("thead", {}, [
          el("tr", {}, [el("th", { text: "Note" }), ...[1, 2, 3, 4, 5, 6].map((n) => el("th", { text: String(n) }))]),
        ]),
        el("tbody", {}, [
          el("tr", {}, [
            el("td", { style: { fontWeight: "700" }, text: "Anzahl" }),
            ...[1, 2, 3, 4, 5, 6].map((n) => el("td", { text: String(stat.verteilung[n] ?? 0) })),
          ]),
        ]),
      ])
    );
  }

  satz.fuegeEin(el("div", { class: "abschnitt-titel", text: "Notenschlüssel" }));
  satz.fuegeEin(notenschluesselBlock(pruefung));

  satz.nummeriere();
  return buehne;
}
