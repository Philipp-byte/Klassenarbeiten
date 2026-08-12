/* ==========================================================================
   Code-Editor mit Syntaxhervorhebung.

   Ohne externe Bibliothek – die Apps sollen offline und ohne Build-Schritt
   laufen. Das Verfahren ist bewährt und schlank:

     • Ein <textarea> liegt unsichtbar (transparente Schrift, sichtbarer
       Cursor) über einem <pre>, das denselben Text eingefärbt zeigt.
     • Beide haben exakt dieselbe Schrift, Größe, Zeilenhöhe und Polsterung,
       sodass die Zeichen deckungsgleich stehen.
     • Beim Tippen und Scrollen wird das <pre> nachgezogen.

   Dazu: Zeilennummern, Tab-Einrückung, automatische Einrückung nach „:“ und
   nach öffnenden Klammern.
   ========================================================================== */

import { el } from "./dom.js";

/* ============================================================== Tokenizer */

function maskiere(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const PYTHON_MUSTER = new RegExp(
  [
    String.raw`(?<kommentar>#[^\n]*)`,
    String.raw`(?<text>[rbfuRBFU]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))`,
    String.raw`(?<dekorator>@[A-Za-z_]\w*)`,
    String.raw`(?<zahl>\b(?:0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)\b)`,
    String.raw`(?<schluessel>\b(?:False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|match|case|self)\b)`,
    String.raw`(?<eingebaut>\b(?:abs|all|any|bin|bool|chr|dict|dir|divmod|enumerate|eval|filter|float|format|frozenset|getattr|hasattr|hex|id|input|int|isinstance|issubclass|iter|len|list|map|max|min|next|object|oct|open|ord|pow|print|range|repr|reversed|round|set|setattr|slice|sorted|str|sum|tuple|type|zip|Exception|ValueError|TypeError|IndexError|KeyError|ZeroDivisionError)\b)`,
    String.raw`(?<funktion>\b[A-Za-z_]\w*(?=\s*\())`,
    String.raw`(?<klammer>[()\[\]{}])`,
    String.raw`(?<operator>[+\-*/%=<>!&|^~:,.;]+)`,
  ].join("|"),
  "g"
);

const JS_MUSTER = new RegExp(
  [
    String.raw`(?<kommentar>\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))`,
    String.raw`(?<text>"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|\`(?:\\.|[^\`\\])*\`?)`,
    String.raw`(?<zahl>\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b)`,
    String.raw`(?<schluessel>\b(?:async|await|break|case|catch|class|const|continue|default|delete|do|else|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|of|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|yield)\b)`,
    String.raw`(?<eingebaut>\b(?:Array|Boolean|Date|Error|JSON|Map|Math|Number|Object|Promise|RegExp|Set|String|console|document|window|alert|parseInt|parseFloat|isNaN|querySelector|querySelectorAll|addEventListener|getElementById)\b)`,
    String.raw`(?<funktion>\b[A-Za-z_$][\w$]*(?=\s*\())`,
    String.raw`(?<klammer>[()\[\]{}])`,
    String.raw`(?<operator>[+\-*/%=<>!&|^~?:,.;]+)`,
  ].join("|"),
  "g"
);

const CSS_MUSTER = new RegExp(
  [
    String.raw`(?<kommentar>\/\*[\s\S]*?(?:\*\/|$))`,
    String.raw`(?<text>"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)`,
    String.raw`(?<zahl>#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|mm|cm|pt|s|ms|fr|deg)?\b)`,
    String.raw`(?<eigenschaft>[-a-zA-Z]+(?=\s*:))`,
    String.raw`(?<klasse>[.#][-\w]+|@[-\w]+|:{1,2}[-\w]+)`,
    String.raw`(?<klammer>[{}();,])`,
  ].join("|"),
  "g"
);

/** HTML wird eigenständig zerlegt, damit Tags und Attribute stimmen. */
function htmlHervorheben(quelltext) {
  let ausgabe = "";
  const muster =
    /(<!--[\s\S]*?(?:-->|$))|(<\/?)([a-zA-Z][\w-]*)((?:[^<>"']|"[^"]*"|'[^']*')*?)(\/?>)/g;
  let letzte = 0;
  let treffer;
  while ((treffer = muster.exec(quelltext)) !== null) {
    ausgabe += maskiere(quelltext.slice(letzte, treffer.index));
    if (treffer[1]) {
      ausgabe += `<span class="t-kommentar">${maskiere(treffer[1])}</span>`;
    } else {
      const [, , oeffner, name, rest, schliesser] = treffer;
      const attribute = maskiere(rest ?? "")
        .replace(/([-\w:]+)(=)/g, '<span class="t-eigenschaft">$1</span><span class="t-operator">$2</span>')
        .replace(/(&quot;[^&]*&quot;|'[^']*')/g, '<span class="t-text">$1</span>');
      ausgabe +=
        `<span class="t-klammer">${maskiere(oeffner)}</span>` +
        `<span class="t-schluessel">${maskiere(name)}</span>` +
        attribute +
        `<span class="t-klammer">${maskiere(schliesser)}</span>`;
    }
    letzte = muster.lastIndex;
  }
  ausgabe += maskiere(quelltext.slice(letzte));
  return ausgabe;
}

const SPRACHEN = {
  python: { muster: PYTHON_MUSTER, name: "Python" },
  javascript: { muster: JS_MUSTER, name: "JavaScript" },
  css: { muster: CSS_MUSTER, name: "CSS" },
  html: { eigen: htmlHervorheben, name: "HTML" },
  text: { name: "Text" },
};

/** Färbt Quelltext ein und liefert HTML. */
export function hervorheben(quelltext, sprache = "python") {
  const eintrag = SPRACHEN[sprache] ?? SPRACHEN.text;
  const roh = String(quelltext ?? "");
  if (eintrag.eigen) return eintrag.eigen(roh);
  if (!eintrag.muster) return maskiere(roh);

  const muster = eintrag.muster;
  muster.lastIndex = 0;
  let ausgabe = "";
  let letzte = 0;
  let treffer;
  while ((treffer = muster.exec(roh)) !== null) {
    if (treffer.index > letzte) ausgabe += maskiere(roh.slice(letzte, treffer.index));
    const gruppen = treffer.groups ?? {};
    const art = Object.keys(gruppen).find((k) => gruppen[k] !== undefined);
    const inhalt = maskiere(treffer[0]);
    ausgabe += art ? `<span class="t-${art}">${inhalt}</span>` : inhalt;
    letzte = muster.lastIndex;
    if (muster.lastIndex === treffer.index) muster.lastIndex++; // Endlosschleife verhindern
  }
  ausgabe += maskiere(roh.slice(letzte));
  return ausgabe;
}

/* ======================================================= Nur-Lese-Ansicht */

/** Eingefärbte Anzeige ohne Bearbeitung – für die Korrektur. */
export function codeAnsicht(quelltext, sprache = "python", { zeilennummern = true } = {}) {
  const text = String(quelltext ?? "");
  const zeilen = text.split("\n").length;
  return el("div", { class: "code-ansicht" }, [
    zeilennummern
      ? el("div", {
          class: "ce-zeilen",
          text: Array.from({ length: zeilen }, (_, i) => i + 1).join("\n"),
        })
      : null,
    el("pre", { class: "ce-hervorhebung" }, [
      el("code", { html: hervorheben(text, sprache) || "&nbsp;" }),
    ]),
  ]);
}

/* ============================================================ Der Editor */

/**
 * Baut einen Code-Editor.
 *
 * @param {object} optionen
 *   wert        Anfangsinhalt
 *   sprache     "python" | "html" | "css" | "javascript"
 *   nurLesen    true = keine Eingabe möglich
 *   zeilen      Mindesthöhe in Zeilen
 *   beiAenderung(text)
 *   platzhalter Hinweistext bei leerem Feld
 * @returns {{knoten: HTMLElement, feld: HTMLTextAreaElement, setzeWert(t):void}}
 */
export function codeEditor({
  wert = "",
  sprache = "python",
  nurLesen = false,
  zeilen = 10,
  beiAenderung = () => {},
  platzhalter = "",
} = {}) {
  const eintrag = SPRACHEN[sprache] ?? SPRACHEN.text;

  const zeilenSpalte = el("div", { class: "ce-zeilen" });
  const hervorhebung = el("pre", { class: "ce-hervorhebung", "aria-hidden": "true" }, [
    el("code"),
  ]);
  const feld = el("textarea", {
    class: "ce-eingabe",
    spellcheck: "false",
    autocapitalize: "off",
    autocomplete: "off",
    autocorrect: "off",
    placeholder: platzhalter,
    readonly: nurLesen,
    "aria-label": `Quelltext (${eintrag.name})`,
  });
  feld.value = wert ?? "";

  const flaeche = el("div", { class: "ce-flaeche" }, [zeilenSpalte, el("div", { class: "ce-scroll" }, [hervorhebung, feld])]);
  const position = el("span", { class: "ce-position" });
  const knoten = el("div", { class: `code-editor${nurLesen ? " nur-lesen" : ""}`, dataset: { sprache } }, [
    el("div", { class: "ce-leiste" }, [
      el("span", { class: "ce-sprache", text: eintrag.name }),
      el("span", { class: "schieb-rechts" }),
      position,
    ]),
    flaeche,
  ]);

  flaeche.style.minHeight = `calc(${zeilen} * 1.55em + 1.4rem)`;

  /* ------------------------------------------------------------ Zeichnen */

  function zeichne() {
    const text = feld.value;
    hervorhebung.firstChild.innerHTML = hervorheben(text, sprache) + "\n";
    const anzahl = text.split("\n").length;
    zeilenSpalte.textContent = Array.from({ length: anzahl }, (_, i) => i + 1).join("\n");
    knoten.classList.toggle("ist-leer", text.length === 0);
  }

  function zeigePosition() {
    const bis = feld.value.slice(0, feld.selectionStart);
    const zeile = bis.split("\n").length;
    const spalte = bis.length - bis.lastIndexOf("\n");
    position.textContent = `Zeile ${zeile}, Spalte ${spalte}`;
  }

  function syncScroll() {
    hervorhebung.scrollTop = feld.scrollTop;
    hervorhebung.scrollLeft = feld.scrollLeft;
    zeilenSpalte.scrollTop = feld.scrollTop;
  }

  feld.addEventListener("input", () => {
    zeichne();
    syncScroll();
    beiAenderung(feld.value);
  });
  feld.addEventListener("scroll", syncScroll);
  feld.addEventListener("keyup", zeigePosition);
  feld.addEventListener("click", zeigePosition);
  feld.addEventListener("focus", () => knoten.classList.add("hat-fokus"));
  feld.addEventListener("blur", () => knoten.classList.remove("hat-fokus"));

  /* ------------------------------------------- Tastatur: Tab und Einrückung */

  const EINZUG = sprache === "python" ? 4 : 2;

  feld.addEventListener("keydown", (e) => {
    if (nurLesen) return;

    if (e.key === "Tab" && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const { selectionStart: a, selectionEnd: b, value } = feld;
      const leer = " ".repeat(EINZUG);
      if (a === b && !e.shiftKey) {
        ersetze(a, b, leer, a + EINZUG);
      } else {
        const start = value.lastIndexOf("\n", a - 1) + 1;
        const block = value.slice(start, b);
        const neu = e.shiftKey
          ? block.replace(new RegExp(`^ {1,${EINZUG}}`, "gm"), "")
          : block.replace(/^/gm, leer);
        feld.setRangeText(neu, start, b, "select");
        melde();
      }
      return;
    }

    // Automatische Einrückung: neue Zeile übernimmt den Einzug der alten,
    // nach „:“ oder einer offenen Klammer eine Stufe mehr.
    if (e.key === "Enter" && !e.shiftKey) {
      const { selectionStart: a, value } = feld;
      const zeilenAnfang = value.lastIndexOf("\n", a - 1) + 1;
      const zeile = value.slice(zeilenAnfang, a);
      const einzug = (zeile.match(/^[ \t]*/) || [""])[0];
      const mehr = /[:{[(]\s*$/.test(zeile) ? " ".repeat(EINZUG) : "";
      if (!einzug && !mehr) return;
      e.preventDefault();
      const einfuegen = "\n" + einzug + mehr;
      ersetze(a, feld.selectionEnd, einfuegen, a + einfuegen.length);
      return;
    }

    // Klammern und Anführungszeichen paarweise schließen
    const paare = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
    if (paare[e.key] && feld.selectionStart === feld.selectionEnd) {
      const naechstes = feld.value[feld.selectionStart] ?? "";
      if (/[\w"']/.test(naechstes)) return; // mitten im Wort nicht stören
      e.preventDefault();
      const a = feld.selectionStart;
      ersetze(a, a, e.key + paare[e.key], a + 1);
      return;
    }
    // Schließendes Zeichen übertippen statt verdoppeln
    if ([")", "]", "}", '"', "'"].includes(e.key) && feld.value[feld.selectionStart] === e.key) {
      e.preventDefault();
      feld.selectionStart = feld.selectionEnd = feld.selectionStart + 1;
      zeigePosition();
    }
  });

  function ersetze(von, bis, text, cursor) {
    feld.setRangeText(text, von, bis, "end");
    if (cursor !== undefined) feld.selectionStart = feld.selectionEnd = cursor;
    melde();
  }

  function melde() {
    zeichne();
    zeigePosition();
    syncScroll();
    beiAenderung(feld.value);
  }

  zeichne();
  zeigePosition();

  return {
    knoten,
    feld,
    setzeWert(text) {
      feld.value = text ?? "";
      zeichne();
    },
    holeWert: () => feld.value,
  };
}
