/* ==========================================================================
   Lokale Ablage im Browser (localStorage).

   Was hier landet – und was bewusst NICHT:

   ✓ Klassenarbeiten im Master-Format (Aufgaben, Lösungen, Punkte)
   ✓ die passphrasengeschützte Schlüsseldatei der Lehrkraft
   ✓ kleine Einstellungen (zuletzt geöffnete Arbeit, Notenschlüssel-Vorgabe)

   ✗ KEINE Abgaben, keine Namen, keine Noten von Schülerinnen und Schülern.
     Korrekturergebnisse leben nur, solange der Tab offen ist, und werden
     bewusst als Datei exportiert statt im Browser abgelegt. Damit bleibt
     der Rechner nach dem Schließen frei von personenbezogenen Daten.
   ========================================================================== */

const PRAEFIX = "jjws.lehrer.";
const INDEX = `${PRAEFIX}index`;
const SCHLUESSEL = `${PRAEFIX}schluesseldatei`;
const EINSTELLUNG = `${PRAEFIX}einstellung.`;

function lies(schluessel, standard = null) {
  try {
    const roh = localStorage.getItem(schluessel);
    return roh === null ? standard : JSON.parse(roh);
  } catch {
    return standard;
  }
}

function schreib(schluessel, wert) {
  try {
    localStorage.setItem(schluessel, JSON.stringify(wert));
    return true;
  } catch (fehler) {
    if (fehler?.name === "QuotaExceededError") {
      throw new Error(
        "Der Speicher des Browsers ist voll. Bitte nicht mehr benötigte Klassenarbeiten " +
        "exportieren und danach löschen."
      );
    }
    throw fehler;
  }
}

/* ------------------------------------------------------------ Klassenarbeiten */

export function masterIndex() {
  return lies(INDEX, []);
}

function schreibeIndex(liste) {
  schreib(INDEX, liste);
}

export function masterListe() {
  return masterIndex()
    .map((eintrag) => ({ ...eintrag }))
    .sort((a, b) => String(b.geaendertAm).localeCompare(String(a.geaendertAm)));
}

export function masterLaden(id) {
  return lies(`${PRAEFIX}master.${id}`, null);
}

export function masterSpeichern(master) {
  master.geaendertAm = new Date().toISOString();
  schreib(`${PRAEFIX}master.${master.id}`, master);
  const index = masterIndex().filter((e) => e.id !== master.id);
  index.push({
    id: master.id,
    titel: master.titel,
    fach: master.fach,
    klasse: master.klasse,
    datum: master.datum,
    aufgaben: master.aufgaben?.length ?? 0,
    geaendertAm: master.geaendertAm,
  });
  schreibeIndex(index);
  return master;
}

export function masterLoeschen(id) {
  localStorage.removeItem(`${PRAEFIX}master.${id}`);
  schreibeIndex(masterIndex().filter((e) => e.id !== id));
}

/* -------------------------------------------------------------- Schlüsseldatei */

export function schluesseldateiLesen() {
  return lies(SCHLUESSEL, null);
}

export function schluesseldateiAblegen(datei) {
  schreib(SCHLUESSEL, datei);
}

export function schluesseldateiEntfernen() {
  localStorage.removeItem(SCHLUESSEL);
}

/* ---------------------------------------------------------------- Einstellungen */

export function einstellung(name, standard = null) {
  return lies(EINSTELLUNG + name, standard);
}

export function setzeEinstellung(name, wert) {
  schreib(EINSTELLUNG + name, wert);
}

/* ------------------------------------------------------------------- Aufräumen */

/** Löscht restlos alles, was diese Apps lokal abgelegt haben. */
export function allesLoeschen() {
  const zuLoeschen = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("jjws.")) zuLoeschen.push(k);
  }
  zuLoeschen.forEach((k) => localStorage.removeItem(k));
  return zuLoeschen.length;
}

/** Grobe Angabe, wie viel Platz belegt ist – für die Anzeige. */
export function belegung() {
  let zeichen = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("jjws.")) zeichen += (localStorage.getItem(k) || "").length + k.length;
  }
  return { zeichen, kb: Math.round(zeichen / 1024) };
}
