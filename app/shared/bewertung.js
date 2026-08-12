/* ==========================================================================
   Automatische Bewertung.

   Läuft ausschließlich im Lehrer-Werkzeug, denn nur dort liegen die Lösungen.
   Für jede Aufgabe entsteht ein Ergebnisobjekt:

     { aufgabeId, typ, erreicht, moeglich, autoBewertet, teile:[…], hinweis }

   „teile“ enthält die Einzelprüfungen (Testfälle, Lücken, Aussagen …), damit
   die Korrektur nachvollziehbar ist und im PDF gezeigt werden kann.
   ========================================================================== */

import { aufgabenPunkte, luecken, varianten, runde2 } from "./model.js";

/* ------------------------------------------------------------ Textvergleiche */

/** Vereinheitlicht Text für den Vergleich (Umlaute bleiben erhalten). */
export function normalisiere(text, { gross = true, leerzeichen = true } = {}) {
  let s = String(text ?? "");
  s = s.replace(/ /g, " ").trim();
  if (leerzeichen) s = s.replace(/\s+/g, " ");
  if (gross) s = s.toLocaleLowerCase("de-DE");
  // typografische Zeichen angleichen
  s = s.replace(/[„“”»«]/g, '"').replace(/[‚‘’›‹]/g, "'").replace(/[–—]/g, "-");
  return s;
}

/** Entfernt zusätzlich Satzzeichen – für großzügigen Stichwortvergleich. */
function kern(text) {
  return normalisiere(text).replace(/[.,;:!?()"'`]/g, "").trim();
}

/**
 * Levenshtein-Distanz, begrenzt – erlaubt kleine Tippfehler.
 * Wird nur bei ausdrücklich aktivierter Tippfehler-Toleranz genutzt.
 */
function distanz(a, b) {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  let vorher = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const aktuell = [i];
    for (let j = 1; j <= b.length; j++) {
      aktuell[j] = Math.min(
        vorher[j] + 1,
        aktuell[j - 1] + 1,
        vorher[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    vorher = aktuell;
  }
  return vorher[b.length];
}

/** Erlaubt bei längeren Wörtern einen Tippfehler. */
function fastGleich(a, b) {
  if (a === b) return true;
  const laenge = Math.max(a.length, b.length);
  if (laenge < 5) return false;
  return distanz(a, b) <= (laenge >= 10 ? 2 : 1);
}

/** Prüft eine Antwort gegen eine Liste zulässiger Lösungen. */
export function trifftLoesung(antwort, loesungen, optionen = {}) {
  const { alsRegex = false, ignoriereGross = true, ignoriereLeerzeichen = true, tippfehler = false } = optionen;
  const a = normalisiere(antwort, { gross: ignoriereGross, leerzeichen: ignoriereLeerzeichen });
  if (!a) return false;
  for (const roh of loesungen) {
    const l = String(roh ?? "");
    if (!l.trim()) continue;
    if (alsRegex) {
      try {
        if (new RegExp(`^(?:${l})$`, ignoriereGross ? "iu" : "u").test(String(antwort).trim())) return true;
      } catch {
        /* ungültiger Ausdruck – wie normaler Text behandeln */
      }
      continue;
    }
    const soll = normalisiere(l, { gross: ignoriereGross, leerzeichen: ignoriereLeerzeichen });
    if (a === soll) return true;
    if (kern(a) === kern(soll)) return true;
    if (tippfehler && fastGleich(kern(a), kern(soll))) return true;
  }
  return false;
}

/** Zahlenvergleich: Komma und Punkt gleichwertig, Tausenderpunkte ignorieren. */
export function zahlAus(text) {
  if (typeof text === "number") return text;
  let s = String(text ?? "").trim();
  if (!s) return null;
  s = s.replace(/[\s ']/g, "").replace(/€|EUR|%|(?:Mio\.?|Mrd\.?)/gi, "");
  // 1.234,56 → 1234.56 ; 1,234.56 → 1234.56 ; 1234,56 → 1234.56
  if (/,\d{1,3}$/.test(s) && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{1,3}$/.test(s) && s.includes(",")) s = s.replace(/,/g, "");
  else s = s.replace(",", ".");
  const z = Number(s);
  return Number.isFinite(z) ? z : null;
}

function zahlStimmt(antwort, loesung, toleranz) {
  const a = zahlAus(antwort);
  const l = zahlAus(loesung);
  if (a === null || l === null) return false;
  const t = Math.abs(Number(toleranz) || 0);
  return Math.abs(a - l) <= t + 1e-9;
}

/* ------------------------------------------------------------- Ergebnisgerüst */

function ergebnis(aufgabe, teile, autoBewertet = true, hinweis = "") {
  const moeglich = runde2(aufgabenPunkte(aufgabe));
  let erreicht = runde2(teile.reduce((s, t) => s + (Number(t.erreicht) || 0), 0));
  // Deckelung (z. B. maxPunkte bei Stichwörtern) und niemals negativ
  erreicht = Math.max(0, Math.min(erreicht, moeglich));
  return {
    aufgabeId: aufgabe.id,
    typ: aufgabe.typ,
    erreicht,
    moeglich,
    autoBewertet,
    teile,
    hinweis,
  };
}

function teil(bez, erreicht, moeglich, status, detail = "") {
  return { bez, erreicht: runde2(erreicht), moeglich: runde2(moeglich), status, detail };
}
// status: "richtig" | "teilweise" | "falsch" | "leer" | "offen"

function leerErgebnis(aufgabe, grund = "Nicht bearbeitet.") {
  return ergebnis(aufgabe, [teil("Ohne Bearbeitung", 0, aufgabenPunkte(aufgabe), "leer", grund)]);
}

/* ================================================================ Einzeltypen */

function bewerteMc(a, antwort) {
  const gewaehlt = new Set(Array.isArray(antwort) ? antwort : []);
  if (!gewaehlt.size) return leerErgebnis(a);

  const richtige = a.optionen.filter((o) => o.richtig).map((o) => o.id);
  const falsche = a.optionen.filter((o) => !o.richtig).map((o) => o.id);
  const gesamt = aufgabenPunkte(a);

  const trefferR = richtige.filter((id) => gewaehlt.has(id)).length;
  const trefferF = falsche.filter((id) => gewaehlt.has(id)).length;

  let punkte;
  if (!a.mehrfach || !a.teilpunkte) {
    punkte = trefferR === richtige.length && trefferF === 0 ? gesamt : 0;
  } else {
    // Teilpunkte: jede richtig gesetzte Marke zählt, jede falsche zieht ab.
    const proOption = gesamt / Math.max(richtige.length, 1);
    punkte = Math.max(0, (trefferR - trefferF) * proOption);
  }

  const teile = a.optionen.map((o) => {
    const gew = gewaehlt.has(o.id);
    const status = o.richtig ? (gew ? "richtig" : "falsch") : gew ? "falsch" : "richtig";
    return {
      bez: o.text,
      erreicht: 0,
      moeglich: 0,
      status,
      detail: o.richtig ? "richtige Antwort" : "",
      gewaehlt: gew,
      istLoesung: !!o.richtig,
    };
  });
  teile.unshift(
    teil(
      "Auswahl",
      punkte,
      gesamt,
      punkte >= gesamt ? "richtig" : punkte > 0 ? "teilweise" : "falsch",
      `${trefferR} von ${richtige.length} richtig markiert` + (trefferF ? `, ${trefferF} falsch markiert` : "")
    )
  );
  return ergebnis(a, teile);
}

function bewerteWahrfalsch(a, antwort) {
  const gewaehlt = antwort && typeof antwort === "object" ? antwort : {};
  if (!Object.keys(gewaehlt).length) return leerErgebnis(a);
  const pro = Number(a.punkteProZeile) || 0;
  const spalte = (id) => a.spalten.find((s) => s.id === id)?.text ?? "–";

  const teile = a.zeilen.map((z) => {
    const gew = gewaehlt[z.id];
    const ok = gew && gew === z.richtig;
    return teil(
      z.text,
      ok ? pro : 0,
      pro,
      ok ? "richtig" : gew ? "falsch" : "leer",
      gew ? `angekreuzt: ${spalte(gew)} · richtig: ${spalte(z.richtig)}` : `richtig: ${spalte(z.richtig)}`
    );
  });
  return ergebnis(a, teile);
}

function bewerteKurzantwort(a, antwort) {
  const text = String(antwort ?? "").trim();
  if (!text) return leerErgebnis(a);
  const ok = trifftLoesung(text, a.loesungen, {
    alsRegex: a.alsRegex,
    ignoriereGross: a.ignoriereGross,
    ignoriereLeerzeichen: a.ignoriereLeerzeichen,
    tippfehler: a.tippfehler,
  });
  const gesamt = aufgabenPunkte(a);
  return ergebnis(a, [
    teil(
      "Antwort",
      ok ? gesamt : 0,
      gesamt,
      ok ? "richtig" : "falsch",
      ok ? "" : `erwartet: ${a.loesungen.filter(Boolean).join(" / ")}`
    ),
  ]);
}

function bewerteStichworte(a, antwort) {
  const text = String(antwort ?? "").trim();
  if (!text) return leerErgebnis(a);
  const heuhaufen = kern(text);

  const teile = (a.begriffe || []).map((b) => {
    const liste = varianten(b.varianten);
    const gefunden = liste.find((v) => heuhaufen.includes(kern(v)));
    const p = Number(b.punkte) || 0;
    return teil(
      liste[0] || "(leer)",
      gefunden ? p : 0,
      p,
      gefunden ? "richtig" : "falsch",
      gefunden ? `gefunden: „${gefunden}“` : `gesucht: ${liste.join(" / ")}`
    );
  });
  const erg = ergebnis(a, teile);
  if (a.maxPunkte > 0) erg.erreicht = Math.min(erg.erreicht, a.maxPunkte);
  erg.hinweis = "Stichwortprüfung – bei Bedarf manuell nachjustieren.";
  return erg;
}

function bewerteAufzaehlung(a, antwort) {
  const eingaben = (Array.isArray(antwort) ? antwort : []).map((s) => String(s ?? "").trim());
  if (!eingaben.some(Boolean)) return leerErgebnis(a);

  const offen = [...(a.gesucht || [])];
  const teile = [];
  eingaben.forEach((eingabe, i) => {
    if (!eingabe) {
      teile.push(teil(`${a.beschriftung || "Nennung"} ${i + 1}`, 0, 0, "leer", ""));
      return;
    }
    // Erste noch nicht verbrauchte Lösungsgruppe suchen, die passt.
    const treffer = offen.findIndex((g) =>
      varianten(g.varianten).some((v) => {
        const kv = kern(v);
        const ke = kern(eingabe);
        return ke === kv || ke.includes(kv) || fastGleich(ke, kv);
      })
    );
    if (treffer >= 0) {
      const g = offen.splice(treffer, 1)[0];
      const p = Number(g.punkte) || 0;
      teile.push(teil(eingabe, p, p, "richtig", `zählt als: ${varianten(g.varianten)[0]}`));
    } else {
      teile.push(teil(eingabe, 0, 0, "falsch", "keiner hinterlegten Lösung zuzuordnen"));
    }
  });

  const erg = ergebnis(a, teile);
  if (a.maxPunkte > 0) erg.erreicht = Math.min(erg.erreicht, a.maxPunkte);
  if (offen.length) {
    erg.hinweis = `Nicht genannt: ${offen.map((g) => varianten(g.varianten)[0]).join(", ")}`;
  }
  return erg;
}

function bewerteZuordnung(a, antwort) {
  // Die Antwort enthält den gewählten TEXT, nicht eine Kennung. So muss in der
  // Schülerdatei nirgends stehen, welche Kennung zu welchem Paar gehört.
  const zuordnung = antwort && typeof antwort === "object" ? antwort : {};
  if (!Object.values(zuordnung).some((v) => String(v ?? "").trim())) return leerErgebnis(a);
  const pro = Number(a.punkteProPaar) || 0;

  const teile = a.paare.map((p) => {
    const gew = String(zuordnung[p.id] ?? "").trim();
    const ok = !!gew && trifftLoesung(gew, [p.rechts], { ignoriereGross: true, ignoriereLeerzeichen: true });
    return teil(
      p.links,
      ok ? pro : 0,
      pro,
      ok ? "richtig" : gew ? "falsch" : "leer",
      ok ? p.rechts : `gewählt: ${gew || "–"} · richtig: ${p.rechts}`
    );
  });
  return ergebnis(a, teile);
}

function bewerteReihenfolge(a, antwort) {
  const gegeben = Array.isArray(antwort) ? antwort : [];
  if (!gegeben.length) return leerErgebnis(a);
  const soll = a.elemente.map((e) => e.id);
  const text = (id) => a.elemente.find((e) => e.id === id)?.text ?? "?";

  if (a.wertung === "alles") {
    const ok = gegeben.length === soll.length && gegeben.every((id, i) => id === soll[i]);
    const gesamt = aufgabenPunkte(a);
    return ergebnis(a, [
      teil(
        "Reihenfolge",
        ok ? gesamt : 0,
        gesamt,
        ok ? "richtig" : "falsch",
        `richtig wäre: ${soll.map(text).join(" → ")}`
      ),
    ]);
  }

  // Teilpunkte: jedes benachbarte Paar, das in der richtigen Abfolge steht.
  const pro = Number(a.punkteProSchritt) || 0;
  const teile = [];
  for (let i = 0; i < soll.length - 1; i++) {
    const posA = gegeben.indexOf(soll[i]);
    const posB = gegeben.indexOf(soll[i + 1]);
    const ok = posA >= 0 && posB >= 0 && posB === posA + 1;
    teile.push(
      teil(`${text(soll[i])} → ${text(soll[i + 1])}`, ok ? pro : 0, pro, ok ? "richtig" : "falsch")
    );
  }
  const erg = ergebnis(a, teile);
  erg.hinweis = `Abgegeben: ${gegeben.map(text).join(" → ")}`;
  return erg;
}

function bewerteLueckentext(a, antwort) {
  const eingaben = Array.isArray(antwort) ? antwort : [];
  if (!eingaben.some((e) => String(e ?? "").trim())) return leerErgebnis(a);
  const pro = Number(a.punkteProLuecke) || 0;
  const stellen = luecken(a.vorlage).filter((t) => t.art === "luecke");

  const teile = stellen.map((l, i) => {
    const eingabe = String(eingaben[i] ?? "").trim();
    const ok = eingabe
      ? trifftLoesung(eingabe, l.loesungen, {
          ignoriereGross: a.ignoriereGross,
          ignoriereLeerzeichen: true,
          tippfehler: a.tippfehler,
        })
      : false;
    return teil(
      `Lücke ${i + 1}`,
      ok ? pro : 0,
      pro,
      ok ? "richtig" : eingabe ? "falsch" : "leer",
      `eingetragen: ${eingabe || "–"} · richtig: ${l.loesungen.join(" / ")}`
    );
  });
  return ergebnis(a, teile);
}

function bewerteZahl(a, antwort) {
  const text = String(antwort ?? "").trim();
  if (!text) return leerErgebnis(a);
  const ok = zahlStimmt(text, a.loesung, a.toleranz);
  const gesamt = aufgabenPunkte(a);
  return ergebnis(a, [
    teil(
      "Wert",
      ok ? gesamt : 0,
      gesamt,
      ok ? "richtig" : "falsch",
      `angegeben: ${text} ${a.einheit ?? ""} · richtig: ${a.loesung} ${a.einheit ?? ""}`.trim()
    ),
  ]);
}

function bewerteRechenweg(a, antwort) {
  const werte = antwort && typeof antwort === "object" ? antwort : {};
  if (!Object.values(werte).some((v) => String(v ?? "").trim())) return leerErgebnis(a);

  const teile = (a.schritte || []).map((s) => {
    const eingabe = String(werte[s.id] ?? "").trim();
    const ok = eingabe ? zahlStimmt(eingabe, s.loesung, s.toleranz) : false;
    const p = Number(s.punkte) || 0;
    return teil(
      s.bezeichnung || "Teilergebnis",
      ok ? p : 0,
      p,
      ok ? "richtig" : eingabe ? "falsch" : "leer",
      `angegeben: ${eingabe || "–"} ${s.einheit ?? ""} · richtig: ${s.loesung} ${s.einheit ?? ""}`.trim()
    );
  });
  return ergebnis(a, teile);
}

function bewerteParsons(a, antwort) {
  const reihenfolge = Array.isArray(antwort?.reihenfolge) ? antwort.reihenfolge : [];
  const einrueckungen = antwort?.einrueckungen ?? {};
  if (!reihenfolge.length) return leerErgebnis(a);

  const soll = a.zeilen;
  const pro = Number(a.punkteProZeile) || 0;
  const teile = soll.map((z, i) => {
    const anPosition = reihenfolge[i];
    const richtigePosition = anPosition === z.id;
    const einOk =
      !a.pruefeEinrueckung || Number(einrueckungen[z.id] ?? 0) === Number(z.einrueckung ?? 0);
    const ok = richtigePosition && einOk;
    let detail = "";
    if (!richtigePosition) detail = `an dieser Stelle steht etwas anderes`;
    else if (!einOk) detail = `richtige Zeile, falsche Einrückung`;
    return teil(`Zeile ${i + 1}: ${z.text}`, ok ? pro : 0, pro, ok ? "richtig" : "falsch", detail);
  });

  const ablenkerDrin = (a.ablenker || []).filter((z) => reihenfolge.includes(z.id));
  const erg = ergebnis(a, teile);
  if (ablenkerDrin.length) {
    erg.hinweis = `${ablenkerDrin.length} Ablenkerzeile(n) wurden mit eingebaut.`;
  }
  return erg;
}

function bewerteFreitext(a, antwort) {
  const text = String(antwort ?? "").trim();
  const teile = (a.kriterien || []).map((k) =>
    teil(k.text || "Kriterium", 0, Number(k.punkte) || 0, "offen", "")
  );
  if (!teile.length) teile.push(teil("Bewertung", 0, aufgabenPunkte(a), "offen", ""));
  const erg = ergebnis(a, teile, false, text ? "" : "Nicht bearbeitet.");
  erg.erreicht = 0;
  return erg;
}

/* ============================================================ Hauptfunktionen */

/**
 * Bewertet alle Aufgaben, die ohne Code-Ausführung auskömmlich sind.
 * Python- und Web-Aufgaben liefern die Runner nach (siehe korrektur.js).
 */
export function bewerteAufgabe(aufgabe, antwort) {
  switch (aufgabe.typ) {
    case "mc":
      return bewerteMc(aufgabe, antwort);
    case "wahrfalsch":
      return bewerteWahrfalsch(aufgabe, antwort);
    case "kurzantwort":
      return bewerteKurzantwort(aufgabe, antwort);
    case "stichworte":
      return bewerteStichworte(aufgabe, antwort);
    case "aufzaehlung":
      return bewerteAufzaehlung(aufgabe, antwort);
    case "zuordnung":
      return bewerteZuordnung(aufgabe, antwort);
    case "reihenfolge":
      return bewerteReihenfolge(aufgabe, antwort);
    case "lueckentext":
      return bewerteLueckentext(aufgabe, antwort);
    case "zahl":
      return bewerteZahl(aufgabe, antwort);
    case "rechenweg":
      return bewerteRechenweg(aufgabe, antwort);
    case "parsons":
      return bewerteParsons(aufgabe, antwort);
    case "freitext":
      return bewerteFreitext(aufgabe, antwort);
    case "code-python":
    case "code-web":
      // Werden asynchron von den Runnern bewertet.
      return {
        aufgabeId: aufgabe.id,
        typ: aufgabe.typ,
        erreicht: 0,
        moeglich: runde2(aufgabenPunkte(aufgabe)),
        autoBewertet: false,
        ausstehend: true,
        teile: [],
        hinweis: "Wird beim Ausführen der Testfälle bewertet.",
      };
    default:
      return leerErgebnis(aufgabe, `Unbekannter Aufgabentyp „${aufgabe.typ}“.`);
  }
}

/** Baut aus Testergebnissen eines Runners ein Aufgaben-Ergebnis. */
export function ergebnisAusTests(aufgabe, testErgebnisse, laufFehler = "") {
  const teile = (aufgabe.tests || []).map((t) => {
    const r = testErgebnisse.find((x) => x.id === t.id);
    const p = Number(t.punkte) || 0;
    if (!r) return teil(t.name, 0, p, "falsch", "Test nicht ausgeführt");
    return teil(t.name, r.bestanden ? p : 0, p, r.bestanden ? "richtig" : "falsch", r.meldung || "");
  });
  const erg = ergebnis(aufgabe, teile);
  if (laufFehler) erg.hinweis = laufFehler;
  return erg;
}

/** Fasst alle Aufgaben-Ergebnisse zu einer Gesamtwertung zusammen. */
export function summiere(ergebnisse) {
  const erreicht = runde2(ergebnisse.reduce((s, e) => s + (Number(e.erreicht) || 0), 0));
  const moeglich = runde2(ergebnisse.reduce((s, e) => s + (Number(e.moeglich) || 0), 0));
  const offen = ergebnisse.filter((e) => !e.autoBewertet && !e.manuellErledigt).length;
  return { erreicht, moeglich, offen, prozent: moeglich > 0 ? (erreicht / moeglich) * 100 : 0 };
}
