/* ==========================================================================
   Notenschlüssel und Notenberechnung.

   Standard ist der lineare Schlüssel, wie ihn der Notenschlüsselrechner von
   lehrerfreund.de ausgibt:

        Note = 6 − 5 · (erreichte Punkte / mögliche Punkte)

   auf eine Nachkommastelle gerundet, wobei genau auf der Hälfte liegende
   Werte ABgerundet werden (1,25 → 1,2 und 5,75 → 5,7).

   Gegenprobe mit 40 Punkten (Tabelle des Rechners):
        40,0 → 1,0 | 37,5 → 1,3 | 32,0 → 2,0 | 24,0 → 3,0
        16,0 → 4,0 | 12,0 → 4,5 |  8,0 → 5,0 |  2,0 → 5,7 | 0,0 → 6,0

   Die beiden Ankerpunkte (100 % → Note 1 und 0 % → Note 6) lassen sich pro
   Arbeit verschieben, damit der Schlüssel milder oder strenger wird.
   Zusätzlich stehen der IHK- und der KMK-Stufenschlüssel bereit.
   ========================================================================== */

export const NOTENTEXT = {
  1: "sehr gut",
  2: "gut",
  3: "befriedigend",
  4: "ausreichend",
  5: "mangelhaft",
  6: "ungenügend",
};

/** Notenpunkte der gymnasialen Oberstufe (15 … 0). */
const NOTENPUNKTE = {
  "1.0": 15, "1.3": 14, "1.7": 13,
  "2.0": 12, "2.3": 11, "2.7": 10,
  "3.0": 9, "3.3": 8, "3.7": 7,
  "4.0": 6, "4.3": 5, "4.7": 4,
  "5.0": 3, "5.3": 2, "5.7": 1,
  "6.0": 0,
};

export const VORLAGEN = {
  linear: {
    name: "Linear (Standard, Lehrerfreund)",
    beschreibung:
      "Note = 6 − 5 · Punkteanteil. Gleichmäßige Skala mit Zehntelnoten, Note 4 bei 40 %.",
    art: "formel",
    tendenzen: true,
    einsAbProzent: 100, // hier beginnt die Note 1,0
    sechsAbProzent: 0, // hier ist die Note 6,0 erreicht
  },
  linearMild: {
    name: "Linear, milder (Note 1 ab 95 %)",
    beschreibung:
      "Wie der lineare Standard, die Bestnote wird aber schon ab 95 % erreicht. Note 4 bei 38 %.",
    art: "formel",
    tendenzen: true,
    einsAbProzent: 95,
    sechsAbProzent: 0,
  },
  ihk: {
    name: "IHK-Schlüssel (Note 4 ab 50 %)",
    beschreibung: "Stufenschlüssel, an beruflichen Schulen verbreitet: 92 / 81 / 67 / 50 / 30 %.",
    art: "tabelle",
    tendenzen: false,
    tabelle: [
      { note: 1, abProzent: 92 },
      { note: 2, abProzent: 81 },
      { note: 3, abProzent: 67 },
      { note: 4, abProzent: 50 },
      { note: 5, abProzent: 30 },
      { note: 6, abProzent: 0 },
    ],
  },
  kmk: {
    name: "KMK-Schlüssel (strenger)",
    beschreibung: "Stufenschlüssel nach KMK-Vorbild: 87 / 73 / 59 / 45 / 18 %.",
    art: "tabelle",
    tendenzen: false,
    tabelle: [
      { note: 1, abProzent: 87 },
      { note: 2, abProzent: 73 },
      { note: 3, abProzent: 59 },
      { note: 4, abProzent: 45 },
      { note: 5, abProzent: 18 },
      { note: 6, abProzent: 0 },
    ],
  },
};

export function standardSchluessel() {
  return strukturKlon(VORLAGEN.linear);
}

export function strukturKlon(o) {
  return JSON.parse(JSON.stringify(o));
}

/**
 * Kaufmännisch runden, aber die exakte Hälfte nach UNTEN.
 * Genau dieses Verhalten zeigt der Lehrerfreund-Rechner:
 * 1,25 → 1,2 und 5,75 → 5,7.
 */
function rundeHalbAb(wert, stellen = 1) {
  const f = 10 ** stellen;
  const x = wert * f;
  // Rundungsfehler der Gleitkommazahlen abfangen (z. B. 12.499999999999998).
  const gerundet = Math.round(x * 1e6) / 1e6;
  return Math.ceil(gerundet - 0.5) / f;
}

function sortiert(tabelle) {
  return [...tabelle].sort((a, b) => b.abProzent - a.abProzent);
}

/* ------------------------------------------------------------ Formelschlüssel */

function noteAusFormel(prozent, s) {
  const oben = Number(s.einsAbProzent ?? 100);
  const unten = Number(s.sechsAbProzent ?? 0);
  const spanne = Math.max(oben - unten, 0.001);
  const anteil = (prozent - unten) / spanne; // 0 … 1
  const roh = 6 - 5 * anteil;
  const note = Math.min(6, Math.max(1, rundeHalbAb(roh, s.tendenzen === false ? 0 : 1)));
  return Math.round(note * 10) / 10;
}

/** Prozentgrenze, ab der eine bestimmte Note erreicht wird (Formelschlüssel). */
function prozentFuerNote(note, s) {
  const oben = Number(s.einsAbProzent ?? 100);
  const unten = Number(s.sechsAbProzent ?? 0);
  const spanne = oben - unten;
  // Note = 6 − 5·anteil  ⇒  anteil = (6 − Note)/5
  // Wegen „Hälfte abrunden“ wird die Note bereits knapp unterhalb erreicht:
  // note gilt ab dem kleinsten Wert, der auf note rundet ⇒ note − 0,05 (exklusiv).
  const grenze = 6 - (note + 0.05);
  return unten + (grenze / 5) * spanne;
}

/* ------------------------------------------------------------ Stufenschlüssel */

function noteAusTabelle(prozent, s) {
  const tab = sortiert(s.tabelle || VORLAGEN.ihk.tabelle);
  let index = tab.findIndex((z) => prozent >= z.abProzent);
  if (index < 0) index = tab.length - 1;
  const stufe = tab[index];
  const ganz = stufe.note;
  if (!s.tendenzen || ganz >= 6) return ganz;

  const untergrenze = stufe.abProzent;
  const obergrenze = index === 0 ? 100 : tab[index - 1].abProzent;
  const spanne = Math.max(obergrenze - untergrenze, 0.001);
  const anteil = Math.min((prozent - untergrenze) / spanne, 0.9999);
  if (ganz === 1) return anteil < 0.5 ? 1.3 : 1.0; // eine 0,7 gibt es nicht
  const drittel = Math.floor(anteil * 3);
  return Math.round((ganz + [0.3, 0, -0.3][drittel]) * 10) / 10;
}

/* ----------------------------------------------------------------- Öffentlich */

/**
 * Rechnet einen Prozentwert in eine Note um.
 * @returns {{note:number, text:string, ganz:number, notenpunkte:number, prozent:number}}
 */
export function noteFuer(prozent, schluessel) {
  const s = schluessel || standardSchluessel();
  const p = Math.max(0, Math.min(100, Number(prozent) || 0));
  const note = s.art === "formel" ? noteAusFormel(p, s) : noteAusTabelle(p, s);
  const ganz = Math.min(6, Math.max(1, Math.round(note)));
  return {
    note,
    text: NOTENTEXT[ganz],
    ganz,
    notenpunkte: NOTENPUNKTE[note.toFixed(1)] ?? NOTENPUNKTE[`${ganz}.0`] ?? 0,
    prozent: Math.round(p * 10) / 10,
  };
}

/** Note aus erreichten und möglichen Punkten. */
export function notePunkte(erreicht, moeglich, schluessel) {
  const prozent = moeglich > 0 ? (erreicht / moeglich) * 100 : 0;
  return noteFuer(prozent, schluessel);
}

export function formatNote(note, nachkomma = 1) {
  const n = Number(note);
  if (!Number.isFinite(n)) return "–";
  return n.toFixed(nachkomma).replace(".", ",");
}

export function formatPunkte(p) {
  const n = Number(p) || 0;
  return (Math.round(n * 100) / 100).toString().replace(".", ",");
}

/* ---------------------------------------------- Punkte-Noten-Tabelle (Aushang) */

/**
 * Erzeugt die Punkte-Noten-Tabelle wie im Notenschlüsselrechner:
 * jede Zeile fasst die Punktwerte zusammen, die zur selben Note führen.
 *
 * @param {number} gesamtpunkte
 * @param {object} schluessel
 * @param {number} schritt  Punkteraster, üblich 0,5
 */
export function punkteNotenTabelle(gesamtpunkte, schluessel, schritt = 0.5) {
  const max = Number(gesamtpunkte) || 0;
  if (max <= 0) return [];
  const zeilen = [];
  const anzahl = Math.round(max / schritt);
  for (let i = anzahl; i >= 0; i--) {
    const punkte = Math.round(i * schritt * 100) / 100;
    const { note } = noteFuer((punkte / max) * 100, schluessel);
    const letzte = zeilen[zeilen.length - 1];
    if (letzte && letzte.note === note) {
      letzte.von = punkte; // wir laufen abwärts – „von“ wandert nach unten
    } else {
      zeilen.push({ note, von: punkte, bis: punkte });
    }
  }
  return zeilen.map((z) => ({
    note: z.note,
    noteText: formatNote(z.note),
    von: z.von,
    bis: z.bis,
    bereich:
      z.von === z.bis
        ? formatPunkte(z.von)
        : `${formatPunkte(z.von)} – ${formatPunkte(z.bis)}`,
  }));
}

/** Kompakte Übersicht: ab wie vielen Punkten gibt es welche ganze Note. */
export function ganzeNotenGrenzen(gesamtpunkte, schluessel, schritt = 0.5) {
  const max = Number(gesamtpunkte) || 0;
  const s = schluessel || standardSchluessel();
  const ergebnis = [];
  for (let note = 1; note <= 6; note++) {
    let prozent;
    if (s.art === "formel") {
      prozent = prozentFuerNote(note, s);
    } else {
      prozent = sortiert(s.tabelle).find((z) => z.note === note)?.abProzent ?? 0;
    }
    prozent = Math.max(0, Math.min(100, prozent));
    const rohPunkte = (prozent / 100) * max;
    const abPunkten = note === 6 ? 0 : Math.ceil((rohPunkte - 1e-9) / schritt) * schritt;
    ergebnis.push({
      note,
      text: NOTENTEXT[note],
      abProzent: Math.round(prozent * 10) / 10,
      abPunkten: Math.round(Math.min(abPunkten, max) * 100) / 100,
    });
  }
  return ergebnis;
}

/* ------------------------------------------------------------------ Statistik */

export function statistik(ergebnisse) {
  const noten = ergebnisse.map((e) => e.note).filter((n) => Number.isFinite(n));
  if (!noten.length) {
    return { anzahl: 0, schnitt: null, verteilung: {}, bestanden: 0, quote: null };
  }
  const verteilung = {};
  for (let i = 1; i <= 6; i++) verteilung[i] = 0;
  noten.forEach((n) => {
    verteilung[Math.min(6, Math.max(1, Math.round(n)))] += 1;
  });
  const summe = noten.reduce((s, n) => s + n, 0);
  const bestanden = noten.filter((n) => n <= 4.49).length;
  return {
    anzahl: noten.length,
    schnitt: Math.round((summe / noten.length) * 100) / 100,
    verteilung,
    bestanden,
    quote: Math.round((bestanden / noten.length) * 1000) / 10,
  };
}
