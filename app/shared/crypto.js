/* ==========================================================================
   Kryptographie – ausschließlich Web Crypto API des Browsers.
   Es verlässt zu keinem Zeitpunkt ein Byte den Rechner.

   Verfahren (hybrid, wie bei verschlüsselter E-Mail):
     1. Die Lehrkraft erzeugt einmalig ein Schlüsselpaar (ECDH, Kurve P-256).
        - Der ÖFFENTLICHE Schlüssel wandert in jede Prüfungsdatei.
        - Der PRIVATE Schlüssel bleibt bei der Lehrkraft, geschützt durch
          eine Passphrase (PBKDF2-SHA-256 + AES-256-GCM).
     2. Die Prüfungs-App der SuS erzeugt für jede Abgabe ein flüchtiges
        (ephemeres) Schlüsselpaar, leitet per ECDH + HKDF einen einmaligen
        AES-256-Schlüssel ab und verschlüsselt damit die Abgabe (AES-GCM).
        Der private ephemere Schlüssel wird nie gespeichert.
     3. Nur wer den privaten Lehrkraft-Schlüssel besitzt, kann die Abgabe
        wieder lesen. SuS können weder ihre eigene noch fremde Abgaben
        entschlüsseln, obwohl die Datei auf ihrem Rechner liegt.

   AES-GCM ist "authenticated encryption": jede nachträgliche Veränderung der
   Datei führt beim Entschlüsseln zu einem Fehler statt zu falschen Daten.
   ========================================================================== */

const KURVE = "P-256";
const PBKDF2_RUNDEN = 310000; // OWASP-Empfehlung für PBKDF2-HMAC-SHA256
const HKDF_INFO = "JJWS-Klassenarbeit/v1/abgabe";

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ----------------------------------------------------------- Hilfsfunktionen */

export function b64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function vonB64(text) {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function zufall(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

function pruefeVerfuegbar() {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "Die Verschlüsselung des Browsers (Web Crypto) ist nicht verfügbar. " +
      "Das passiert, wenn die Seite direkt über file:// geöffnet wurde. " +
      "Bitte die App über den mitgelieferten lokalen Webserver starten (start.cmd bzw. start.sh)."
    );
  }
}

/** Kurzer, gut vorlesbarer Fingerabdruck eines öffentlichen Schlüssels. */
export async function fingerabdruck(jwkOeffentlich) {
  pruefeVerfuegbar();
  const kanonisch = JSON.stringify([jwkOeffentlich.crv, jwkOeffentlich.x, jwkOeffentlich.y]);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(kanonisch)));
  return Array.from(hash.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .replace(/(.{4})(?=.)/g, "$1-")
    .toUpperCase();
}

/* ------------------------------------------------------------ Schlüsselpaar */

/** Erzeugt ein neues Lehrkraft-Schlüsselpaar. Rückgabe: JWK-Objekte. */
export async function erzeugeSchluesselpaar() {
  pruefeVerfuegbar();
  const paar = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: KURVE }, true, [
    "deriveBits",
  ]);
  const oeffentlich = await crypto.subtle.exportKey("jwk", paar.publicKey);
  const privat = await crypto.subtle.exportKey("jwk", paar.privateKey);
  // Aufräumen: Felder, die wir nicht brauchen, nicht mitschleppen.
  delete oeffentlich.key_ops;
  delete oeffentlich.ext;
  return {
    oeffentlich,
    privat,
    fingerabdruck: await fingerabdruck(oeffentlich),
    erzeugtAm: new Date().toISOString(),
  };
}

async function importPrivat(jwk) {
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: KURVE }, false, [
    "deriveBits",
  ]);
}

async function importOeffentlich(jwk) {
  return crypto.subtle.importKey("jwk", { ...jwk, key_ops: [] }, { name: "ECDH", namedCurve: KURVE }, false, []);
}

/* ------------------------------------ Passphrasen-Schutz der Schlüsseldatei */

async function schluesselAusPassphrase(passphrase, salt, runden) {
  const basis = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: runden, hash: "SHA-256" },
    basis,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Verpackt den privaten Schlüssel passphrasengeschützt in ein JSON-Objekt,
 * das als Datei „*.jjwskey“ gespeichert werden kann.
 */
export async function schluesseldateiErzeugen(schluesselpaar, passphrase, bezeichnung = "") {
  pruefeVerfuegbar();
  if (!passphrase || passphrase.length < 8) {
    throw new Error("Die Passphrase muss mindestens 8 Zeichen lang sein.");
  }
  const salt = zufall(16);
  const iv = zufall(12);
  const key = await schluesselAusPassphrase(passphrase, salt, PBKDF2_RUNDEN);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(schluesselpaar.privat))
  );
  return {
    typ: "jjws-schluessel",
    version: 1,
    bezeichnung,
    erzeugtAm: schluesselpaar.erzeugtAm ?? new Date().toISOString(),
    fingerabdruck: schluesselpaar.fingerabdruck ?? (await fingerabdruck(schluesselpaar.oeffentlich)),
    oeffentlich: schluesselpaar.oeffentlich,
    kdf: { name: "PBKDF2", hash: "SHA-256", runden: PBKDF2_RUNDEN, salt: b64(salt) },
    privatVerschluesselt: { alg: "AES-256-GCM", iv: b64(iv), daten: b64(ct) },
  };
}

/** Öffnet eine Schlüsseldatei mit der Passphrase. */
export async function schluesseldateiOeffnen(datei, passphrase) {
  pruefeVerfuegbar();
  if (datei?.typ !== "jjws-schluessel") {
    throw new Error("Das ist keine gültige JJWS-Schlüsseldatei.");
  }
  const key = await schluesselAusPassphrase(
    passphrase,
    vonB64(datei.kdf.salt),
    datei.kdf.runden ?? PBKDF2_RUNDEN
  );
  let klar;
  try {
    klar = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: vonB64(datei.privatVerschluesselt.iv) },
      key,
      vonB64(datei.privatVerschluesselt.daten)
    );
  } catch {
    throw new Error("Falsche Passphrase oder beschädigte Schlüsseldatei.");
  }
  return {
    privat: JSON.parse(dec.decode(klar)),
    oeffentlich: datei.oeffentlich,
    fingerabdruck: datei.fingerabdruck,
    bezeichnung: datei.bezeichnung ?? "",
    erzeugtAm: datei.erzeugtAm,
  };
}

/* ---------------------------------------------------- Kompression (optional) */

async function durchStream(bytes, stream) {
  const ds = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await ds.arrayBuffer());
}

async function packen(bytes) {
  if (typeof CompressionStream === "undefined") return { daten: bytes, komprimiert: false };
  try {
    return { daten: await durchStream(bytes, new CompressionStream("gzip")), komprimiert: true };
  } catch {
    return { daten: bytes, komprimiert: false };
  }
}

async function entpacken(bytes, komprimiert) {
  if (!komprimiert) return bytes;
  return durchStream(bytes, new DecompressionStream("gzip"));
}

/* -------------------------------------------------- Abgabe ver-/entschlüsseln */

/**
 * Verschlüsselt ein beliebiges JSON-fähiges Objekt für den Inhaber des
 * angegebenen öffentlichen Schlüssels.
 *
 * @param {object} empfaengerPubJwk  öffentlicher Schlüssel der Lehrkraft
 * @param {object} nutzlast          Klartext-Objekt (Antworten der SuS)
 * @param {object} [klartextKopf]    unverschlüsselte Metadaten zur Zuordnung
 *                                   (Prüfungs-ID, Zeitpunkt – KEINE Namen!)
 */
export async function verschluesseln(empfaengerPubJwk, nutzlast, klartextKopf = {}) {
  pruefeVerfuegbar();
  const empfaenger = await importOeffentlich(empfaengerPubJwk);

  // Flüchtiges Schlüsselpaar – existiert nur für diese eine Abgabe.
  const ephemer = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: KURVE }, true, [
    "deriveBits",
  ]);
  const gemeinsam = await crypto.subtle.deriveBits(
    { name: "ECDH", public: empfaenger },
    ephemer.privateKey,
    256
  );

  const hkdfSalt = zufall(32);
  const hkdfBasis = await crypto.subtle.importKey("raw", gemeinsam, "HKDF", false, ["deriveKey"]);
  const aesKey = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: hkdfSalt, info: enc.encode(HKDF_INFO) },
    hkdfBasis,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const roh = enc.encode(JSON.stringify(nutzlast));
  const { daten, komprimiert } = await packen(roh);
  const iv = zufall(12);

  // Der Klartext-Kopf wird als "additional authenticated data" mitgesichert:
  // wer ihn manipuliert, macht die Datei unentschlüsselbar.
  const aad = enc.encode(JSON.stringify(klartextKopf));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, aesKey, daten);

  const epk = await crypto.subtle.exportKey("jwk", ephemer.publicKey);
  delete epk.key_ops;
  delete epk.ext;

  return {
    verfahren: "ECDH-P256+HKDF-SHA256+AES-256-GCM",
    empfaenger: await fingerabdruck(empfaengerPubJwk),
    kopf: klartextKopf,
    ephemerOeffentlich: epk,
    hkdfSalt: b64(hkdfSalt),
    iv: b64(iv),
    komprimiert,
    daten: b64(ct),
  };
}

/** Entschlüsselt einen Umschlag mit dem privaten Schlüssel der Lehrkraft. */
export async function entschluesseln(privatJwk, umschlag) {
  pruefeVerfuegbar();
  const privat = await importPrivat(privatJwk);
  const ephemer = await importOeffentlich(umschlag.ephemerOeffentlich);

  const gemeinsam = await crypto.subtle.deriveBits({ name: "ECDH", public: ephemer }, privat, 256);
  const hkdfBasis = await crypto.subtle.importKey("raw", gemeinsam, "HKDF", false, ["deriveKey"]);
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: vonB64(umschlag.hkdfSalt),
      info: enc.encode(HKDF_INFO),
    },
    hkdfBasis,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const aad = enc.encode(JSON.stringify(umschlag.kopf ?? {}));
  let klar;
  try {
    klar = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: vonB64(umschlag.iv), additionalData: aad },
      aesKey,
      vonB64(umschlag.daten)
    );
  } catch {
    throw new Error(
      "Abgabe konnte nicht entschlüsselt werden. Entweder gehört sie zu einem anderen " +
      "Schlüssel oder die Datei wurde nachträglich verändert."
    );
  }
  const bytes = await entpacken(new Uint8Array(klar), umschlag.komprimiert);
  return JSON.parse(dec.decode(bytes));
}

/* ------------------------------------------------------------------ Prüfsumme */

/** SHA-256 über einen Text – für Integritätsanzeige in der Korrektur. */
export async function pruefsumme(text) {
  pruefeVerfuegbar();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(hash).slice(0, 6))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
