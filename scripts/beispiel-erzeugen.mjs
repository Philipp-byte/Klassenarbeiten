/* ---------------------------------------------------------------------------
   Erzeugt aus dem Beispiel-Master die Dateien für den Demo-Modus:

     beispiele/klassenarbeit-schulkiosk.jjwsp   – Fassung für die SuS
     beispiele/demo-schluessel.jjwskey          – Demo-Schlüssel (Passphrase: demo1234)

   Der Demo-Schlüssel ist ABSICHTLICH öffentlich, damit jede Person den
   kompletten Ablauf durchspielen kann – schreiben, abgeben, korrigieren.
   Für echte Klassenarbeiten wird er selbstverständlich nie benutzt.

   Aufruf:  node scripts/beispiel-erzeugen.mjs
   ------------------------------------------------------------------------- */

import fs from "node:fs";
import { erzeugeSchluesselpaar, schluesseldateiErzeugen } from "../app/shared/crypto.js";
import { alsSusFassung } from "../app/shared/model.js";

const masterPfad = new URL("../beispiele/klassenarbeit-schulkiosk.jjwsm", import.meta.url);
const master = JSON.parse(fs.readFileSync(masterPfad, "utf8"));

const paar = await erzeugeSchluesselpaar();
const schluesseldatei = await schluesseldateiErzeugen(
  paar,
  "demo1234",
  "DEMO-Schlüssel – öffentlich bekannt, nie für echte Arbeiten verwenden!"
);

const fassung = alsSusFassung(master, paar.oeffentlich, paar.fingerabdruck);

fs.writeFileSync(
  new URL("../beispiele/klassenarbeit-schulkiosk.jjwsp", import.meta.url),
  JSON.stringify(fassung, null, 2)
);
fs.writeFileSync(
  new URL("../beispiele/demo-schluessel.jjwskey", import.meta.url),
  JSON.stringify(schluesseldatei, null, 2)
);

console.log("Demo-Dateien erzeugt:");
console.log("  klassenarbeit-schulkiosk.jjwsp –", fassung.aufgaben.length, "Aufgaben,", fassung.gesamtpunkte, "Punkte");
console.log("  demo-schluessel.jjwskey        – Fingerabdruck", paar.fingerabdruck, "· Passphrase: demo1234");
