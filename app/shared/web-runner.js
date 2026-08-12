/* ==========================================================================
   Prüfung von HTML-/CSS-/JavaScript-Aufgaben.

   Die Seite der SuS wird in einem abgeschotteten iframe aufgebaut. Es gibt
   zwei Betriebsarten:

   A) Ohne JavaScript (HTML/CSS-Aufgaben)
      sandbox="allow-same-origin" – Skripte sind komplett abgeschaltet.
      Die Prüfungen laufen im Lehrer-Fenster und lesen nur DOM und berechnete
      Stile aus. Manipulation durch die SuS ist damit ausgeschlossen.

   B) Mit JavaScript
      sandbox="allow-scripts" – der Code der SuS läuft, hat aber keinen
      Zugriff auf das Lehrer-Fenster (kein allow-same-origin). Die Prüfung
      läuft im selben Rahmen und meldet ihr Ergebnis mit einer Zufallskennung
      zurück. Weil Schülercode und Prüfung sich denselben Kontext teilen,
      wird der Code zusätzlich auf verdächtige Aufrufe (postMessage & Co.)
      untersucht und die Lehrkraft gewarnt.
   ========================================================================== */

const STANDARD_ZEITLIMIT = 6000;

/* Der Prüfkern – wird in beiden Betriebsarten benutzt, in A vom Lehrer-Fenster
   aus, in B als eingebettetes Skript. Deshalb als Quelltext-String. */
const PRUEFKERN = String.raw`
function jjwsPruefe(doc, win, tests) {
  var norm = function (t) { return String(t == null ? "" : t).replace(/\s+/g, " ").trim(); };
  var farbe = function (t) { return norm(t).toLowerCase().replace(/\s+/g, ""); };

  return tests.map(function (t) {
    try {
      switch (t.art) {
        case "selektor": {
          var anzahl = doc.querySelectorAll(t.selektor).length;
          var min = Number(t.mindestens) || 1;
          return {
            id: t.id,
            bestanden: anzahl >= min,
            meldung: anzahl >= min ? "" :
              anzahl + " Treffer für „" + t.selektor + "“, erwartet mindestens " + min + ".",
          };
        }
        case "text": {
          var el = doc.querySelector(t.selektor);
          if (!el) return { id: t.id, bestanden: false, meldung: "Kein Element passt auf „" + t.selektor + "“." };
          var ist = norm(el.textContent);
          var soll = norm(t.erwartet);
          var ok = t.exakt
            ? ist.toLowerCase() === soll.toLowerCase()
            : ist.toLowerCase().indexOf(soll.toLowerCase()) >= 0;
          return { id: t.id, bestanden: ok, meldung: ok ? "" : "Text war „" + ist + "“, erwartet „" + soll + "“." };
        }
        case "attribut": {
          var el2 = doc.querySelector(t.selektor);
          if (!el2) return { id: t.id, bestanden: false, meldung: "Kein Element passt auf „" + t.selektor + "“." };
          var wert = el2.getAttribute(t.attribut);
          if (wert === null) return { id: t.id, bestanden: false, meldung: "Attribut „" + t.attribut + "“ fehlt." };
          if (!norm(t.erwartet)) return { id: t.id, bestanden: true, meldung: "" };
          var ok2 = t.exakt
            ? norm(wert).toLowerCase() === norm(t.erwartet).toLowerCase()
            : norm(wert).toLowerCase().indexOf(norm(t.erwartet).toLowerCase()) >= 0;
          return { id: t.id, bestanden: ok2, meldung: ok2 ? "" : "Attribut war „" + wert + "“, erwartet „" + t.erwartet + "“." };
        }
        case "stil": {
          var el3 = doc.querySelector(t.selektor);
          if (!el3) return { id: t.id, bestanden: false, meldung: "Kein Element passt auf „" + t.selektor + "“." };
          var stil = win.getComputedStyle(el3);
          var ist3 = stil.getPropertyValue(t.eigenschaft) || stil[t.eigenschaft] || "";
          var ok3 = farbe(ist3) === farbe(t.erwartet) || farbe(ist3).indexOf(farbe(t.erwartet)) >= 0;
          return { id: t.id, bestanden: ok3, meldung: ok3 ? "" : t.eigenschaft + " war „" + norm(ist3) + "“, erwartet „" + t.erwartet + "“." };
        }
        case "js": {
          if (!win.jjwsAuswerten) {
            return { id: t.id, bestanden: false, meldung: "JavaScript ist für diese Aufgabe nicht freigeschaltet." };
          }
          var ergebnis = win.jjwsAuswerten(t.ausdruck);
          var ok4 = !!ergebnis;
          return { id: t.id, bestanden: ok4, meldung: ok4 ? "" : "Der Ausdruck ergab " + JSON.stringify(ergebnis) + " statt eines wahren Wertes." };
        }
        default:
          return { id: t.id, bestanden: false, meldung: "Unbekannte Testart „" + t.art + "“." };
      }
    } catch (e) {
      return { id: t.id, bestanden: false, meldung: String((e && e.message) || e) };
    }
  });
}
`;

/** Setzt das Dokument der SuS zusammen. */
export function baueSeite({ html = "", css = "", js = "" }, mitSkript = true) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Vorschau</title>
<style>${css || ""}</style>
</head>
<body>
${html || ""}
${mitSkript && js ? `<script>\n${js}\n<\/script>` : ""}
</body>
</html>`;
}

/** Sucht nach Versuchen, aus dem Rahmen auszubrechen. */
export function verdaechtig(js) {
  const muster = [
    /postMessage\s*\(/,
    /\bparent\b/,
    /\btop\b\s*\./,
    /window\.opener/,
    /jjws[A-Za-z]*/,
  ];
  const treffer = muster.filter((m) => m.test(String(js || ""))).map((m) => m.source);
  return treffer;
}

function iframeAnlegen(sandbox) {
  const rahmen = document.createElement("iframe");
  rahmen.setAttribute("sandbox", sandbox);
  rahmen.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1024px;height:768px;border:0;visibility:hidden;";
  document.body.appendChild(rahmen);
  return rahmen;
}

/* ------------------------------------------------ Betriebsart A: ohne Skripte */

async function pruefeOhneSkript(inhalt, tests, zeitlimitMs) {
  const rahmen = iframeAnlegen("allow-same-origin");
  try {
    await new Promise((fertig, abbruch) => {
      const uhr = setTimeout(() => abbruch(new Error("Die Seite konnte nicht geladen werden.")), zeitlimitMs);
      rahmen.onload = () => {
        clearTimeout(uhr);
        fertig();
      };
      rahmen.srcdoc = baueSeite(inhalt, false);
    });
    const doc = rahmen.contentDocument;
    const win = rahmen.contentWindow;
    if (!doc) throw new Error("Auf den Prüfrahmen konnte nicht zugegriffen werden.");
    // Prüfkern im Lehrer-Fenster auswerten – der Rahmen enthält keinen aktiven Code.
    const kern = new Function(`${PRUEFKERN}; return jjwsPruefe;`)();
    return kern(doc, win, tests);
  } finally {
    rahmen.remove();
  }
}

/* ------------------------------------------------- Betriebsart B: mit Skripten */

async function pruefeMitSkript(inhalt, tests, zeitlimitMs) {
  const kennung = "jjws_" + crypto.randomUUID();
  const rahmen = iframeAnlegen("allow-scripts");

  const harnisch = `
<script>
${PRUEFKERN}
window.jjwsAuswerten = function (ausdruck) {
  try { return (0, eval)(ausdruck); } catch (e) { return false; }
};
window.addEventListener("error", function () { /* Fehler der SuS nicht weiterreichen */ });
setTimeout(function () {
  var tests = ${JSON.stringify(tests)};
  var ergebnisse;
  try { ergebnisse = jjwsPruefe(document, window, tests); }
  catch (e) { ergebnisse = tests.map(function (t) { return { id: t.id, bestanden: false, meldung: String(e) }; }); }
  parent.postMessage({ kennung: ${JSON.stringify(kennung)}, ergebnisse: ergebnisse }, "*");
}, 60);
<\/script>`;

  try {
    return await new Promise((fertig, abbruch) => {
      const uhr = setTimeout(() => {
        window.removeEventListener("message", horcher);
        abbruch(new Error("Zeitüberschreitung – die Seite hat nicht geantwortet."));
      }, zeitlimitMs);

      function horcher(e) {
        if (e.source !== rahmen.contentWindow) return;
        if (e.data?.kennung !== kennung) return;
        clearTimeout(uhr);
        window.removeEventListener("message", horcher);
        fertig(e.data.ergebnisse);
      }
      window.addEventListener("message", horcher);

      const seite = baueSeite(inhalt, true).replace("</body>", `${harnisch}\n</body>`);
      rahmen.srcdoc = seite;
    });
  } finally {
    rahmen.remove();
  }
}

/* -------------------------------------------------------------------- Öffentlich */

export class WebRunner {
  constructor({ zeitlimitMs = STANDARD_ZEITLIMIT } = {}) {
    this.zeitlimitMs = zeitlimitMs;
  }

  /**
   * Führt alle Testfälle einer Web-Aufgabe aus.
   * @returns {Promise<{ergebnisse:Array, warnung:string}>}
   */
  async pruefe(aufgabe, antwort, tests = null) {
    const liste = tests ?? aufgabe.tests ?? [];
    const inhalt = {
      html: antwort?.html ?? "",
      css: antwort?.css ?? "",
      js: antwort?.js ?? "",
    };
    const brauchtSkript = !!aufgabe.jsAktiv || liste.some((t) => t.art === "js");

    let warnung = "";
    if (brauchtSkript) {
      const auffaellig = verdaechtig(inhalt.js);
      if (auffaellig.length) {
        warnung =
          "Der abgegebene JavaScript-Code enthält Aufrufe, mit denen der Prüfrahmen beeinflusst " +
          `werden könnte (${auffaellig.join(", ")}). Bitte diese Aufgabe von Hand ansehen.`;
      }
    }

    try {
      const ergebnisse = brauchtSkript
        ? await pruefeMitSkript(inhalt, liste, this.zeitlimitMs)
        : await pruefeOhneSkript(inhalt, liste, this.zeitlimitMs);
      return { ergebnisse, warnung };
    } catch (fehler) {
      return {
        ergebnisse: liste.map((t) => ({
          id: t.id,
          bestanden: false,
          meldung: String(fehler.message || fehler),
        })),
        warnung,
      };
    }
  }

  /** Baut eine sichtbare Vorschau für die SuS in ein vorhandenes iframe-Element. */
  static vorschau(rahmen, antwort, jsAktiv) {
    rahmen.setAttribute("sandbox", jsAktiv ? "allow-scripts" : "");
    rahmen.srcdoc = baueSeite(
      { html: antwort?.html ?? "", css: antwort?.css ?? "", js: antwort?.js ?? "" },
      !!jsAktiv
    );
  }
}
