/* ==========================================================================
   Individuelle Aufgabenreihenfolge je Schülerin und Schüler.

   Zweck: Wer auf den Nachbarbildschirm schaut, sieht dort eine andere
   Aufgabe – Abschreiben wird deutlich schwerer.

   Wichtig ist, dass die Reihenfolge REPRODUZIERBAR ist: Nach einem Absturz
   oder beim Weiterarbeiten muss dieselbe Reihenfolge wieder entstehen. Deshalb
   wird sie nicht zufällig gewürfelt, sondern aus Prüfungs-ID und Identität
   berechnet. Gleiche Person + gleiche Arbeit = gleiche Reihenfolge.

   Die Bewertung ist davon völlig unberührt: Antworten werden über die
   Aufgaben-ID zugeordnet, nicht über die Position.
   ========================================================================== */

/** Kleiner, schneller Zufallszahlengenerator mit Startwert (mulberry32). */
function generator(startwert) {
  let a = startwert >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Streuwert aus einer Zeichenkette (FNV-1a). */
export function startwertAus(text) {
  let h = 0x811c9dc5;
  const s = String(text ?? "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Fisher-Yates mit vorgegebenem Generator. */
function mische(liste, wuerfel) {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(wuerfel() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Baut den Startwert aus Arbeit und Person. */
export function startwertFuer(pruefungId, identitaet) {
  const kennung = identitaet?.nummer
    ? `nr:${identitaet.nummer}`
    : `${identitaet?.name ?? ""}|${identitaet?.vorname ?? ""}`;
  return startwertAus(`${pruefungId}::${kennung.toLocaleLowerCase("de-DE")}`);
}

/**
 * Erzeugt eine persönliche Fassung der Prüfung.
 *
 * • Aufgaben werden umsortiert – aber nur innerhalb ihres Abschnitts, damit
 *   eine gegliederte Arbeit gegliedert bleibt. Auch die Abschnitte selbst
 *   tauschen die Plätze.
 * • Antwortmöglichkeiten, Zuordnungsspalten, Reihenfolge-Elemente und
 *   Parsons-Bausteine werden ebenfalls gemischt.
 * • Die Nummerierung wird neu vergeben, damit „Aufgabe 3“ eindeutig bleibt.
 *
 * @param {object} pruefung   SuS-Fassung
 * @param {object} identitaet { name, vorname } oder { nummer }
 * @returns {object} neue Prüfung mit persönlicher Reihenfolge
 */
export function persoenlicheFassung(pruefung, identitaet) {
  if (!pruefung?.mischenProSuS) return pruefung;

  const wuerfel = generator(startwertFuer(pruefung.id, identitaet));

  /* --- Aufgabenreihenfolge: Abschnitte mischen, darin die Aufgaben --- */
  const gruppen = [];
  const nachName = new Map();
  (pruefung.aufgaben || []).forEach((a) => {
    const name = a.abschnitt || "";
    if (!nachName.has(name)) {
      const gruppe = { name, aufgaben: [] };
      nachName.set(name, gruppe);
      gruppen.push(gruppe);
    }
    nachName.get(name).aufgaben.push(a);
  });

  const gemischteGruppen = mische(gruppen, wuerfel).map((g) => ({
    ...g,
    aufgaben: mische(g.aufgaben, wuerfel),
  }));

  const aufgaben = gemischteGruppen
    .flatMap((g) => g.aufgaben)
    .map((a, i) => mischeAufgabe(a, wuerfel, i + 1));

  return { ...pruefung, aufgaben, persoenlicheReihenfolge: aufgaben.map((a) => a.id) };
}

function mischeAufgabe(a, wuerfel, neueNummer) {
  const kopie = { ...a, nr: neueNummer };
  switch (a.typ) {
    case "mc":
      kopie.optionen = mische(a.optionen ?? [], wuerfel);
      break;
    case "wahrfalsch":
      kopie.zeilen = mische(a.zeilen ?? [], wuerfel);
      break;
    case "zuordnung":
      kopie.links = mische(a.links ?? [], wuerfel);
      kopie.rechts = mische(a.rechts ?? [], wuerfel);
      break;
    case "reihenfolge":
      kopie.elemente = mische(a.elemente ?? [], wuerfel);
      break;
    case "parsons":
      kopie.bausteine = mische(a.bausteine ?? [], wuerfel);
      break;
    case "aufzaehlung":
      // Reihenfolge der Eingabefelder ist bedeutungslos – nichts zu tun.
      break;
    default:
      break;
  }
  return kopie;
}
