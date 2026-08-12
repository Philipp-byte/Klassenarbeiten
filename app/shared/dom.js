/* ==========================================================================
   Kleine Oberflächen-Helfer. Bewusst kein Framework: die Apps sollen ohne
   Build-Schritt, ohne npm und ohne Internet laufen.
   ========================================================================== */

/** Erzeugt ein Element. Attribute als Objekt, Kinder als Liste oder Text. */
export function el(tag, attribute = {}, kinder = []) {
  const knoten = document.createElement(tag);
  for (const [name, wert] of Object.entries(attribute)) {
    if (wert === null || wert === undefined || wert === false) continue;
    if (name === "class") knoten.className = wert;
    else if (name === "text") knoten.textContent = wert;
    else if (name === "html") knoten.innerHTML = wert;
    else if (name === "dataset") Object.assign(knoten.dataset, wert);
    else if (name.startsWith("on") && typeof wert === "function") {
      knoten.addEventListener(name.slice(2).toLowerCase(), wert);
    } else if (name === "style" && typeof wert === "object") Object.assign(knoten.style, wert);
    else knoten.setAttribute(name, wert === true ? "" : wert);
  }
  for (const kind of [].concat(kinder)) {
    if (kind === null || kind === undefined || kind === false) continue;
    knoten.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return knoten;
}

export const $ = (auswahl, wurzel = document) => wurzel.querySelector(auswahl);
export const $$ = (auswahl, wurzel = document) => Array.from(wurzel.querySelectorAll(auswahl));

export function leere(knoten) {
  while (knoten.firstChild) knoten.removeChild(knoten.firstChild);
  return knoten;
}

export function maskiere(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------------------------------- Einfache Auszeichnung
   Bewusst minimal – Lehrkräfte sollen Aufgabentexte tippen, nicht HTML bauen.
     **fett**   *kursiv*   `code`
     - Listenpunkt      1. nummerierte Liste
     Leerzeile = neuer Absatz
   ---------------------------------------------------------------------------- */
export function auszeichnung(text) {
  const roh = String(text ?? "");
  if (!roh.trim()) return "";

  const zeilenInline = (z) =>
    maskiere(z)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  const abschnitte = roh.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const ausgabe = [];

  for (const abschnitt of abschnitte) {
    const zeilen = abschnitt.split("\n").filter((z) => z.trim() !== "");
    if (!zeilen.length) continue;

    if (zeilen.every((z) => /^\s*[-–•]\s+/.test(z))) {
      ausgabe.push(
        "<ul>" + zeilen.map((z) => `<li>${zeilenInline(z.replace(/^\s*[-–•]\s+/, ""))}</li>`).join("") + "</ul>"
      );
    } else if (zeilen.every((z) => /^\s*\d+[.)]\s+/.test(z))) {
      ausgabe.push(
        "<ol>" + zeilen.map((z) => `<li>${zeilenInline(z.replace(/^\s*\d+[.)]\s+/, ""))}</li>`).join("") + "</ol>"
      );
    } else {
      ausgabe.push(`<p>${zeilen.map(zeilenInline).join("<br>")}</p>`);
    }
  }
  return ausgabe.join("");
}

/* ------------------------------------------------------------------- Meldungen */

let meldungsBereich = null;

export function meldung(text, art = "info", dauerMs = 4500) {
  if (!meldungsBereich) {
    // Über der Statusleiste, damit der Abgeben-Knopf nie verdeckt wird.
    // pointer-events: none sorgt zusätzlich dafür, dass Einblendungen keine
    // Klicks abfangen können – nur die Meldung selbst ist anklickbar.
    meldungsBereich = el("div", {
      style: {
        position: "fixed",
        right: "1rem",
        bottom: "4.6rem",
        zIndex: "9999",
        display: "flex",
        flexDirection: "column",
        gap: ".5rem",
        maxWidth: "min(30rem, 90vw)",
        pointerEvents: "none",
      },
    });
    document.body.appendChild(meldungsBereich);
  }
  const farben = {
    info: ["#00344d", "#ffffff"],
    gut: ["#1e7a45", "#ffffff"],
    warn: ["#f26b43", "#ffffff"],
    fehler: ["#c00000", "#ffffff"],
  };
  const [hg, vg] = farben[art] || farben.info;
  const kasten = el("div", {
    text,
    role: "status",
    style: {
      background: hg,
      color: vg,
      padding: ".6rem .9rem",
      borderRadius: "6px",
      boxShadow: "0 4px 16px rgba(0,52,77,.25)",
      fontSize: ".9rem",
      lineHeight: "1.35",
      cursor: "pointer",
      pointerEvents: "auto",
    },
    onclick: () => kasten.remove(),
  });
  meldungsBereich.appendChild(kasten);
  if (dauerMs) setTimeout(() => kasten.remove(), dauerMs);
  return kasten;
}

/* --------------------------------------------------------------------- Dialoge */

export function frage(titel, text, { jaText = "Ja", neinText = "Abbrechen", gefaehrlich = false } = {}) {
  return new Promise((fertig) => {
    const dlg = el("dialog");
    const nein = el("button", { class: "btn sekundaer", text: neinText, onclick: () => { dlg.close(); fertig(false); } });
    const ja = el("button", {
      class: gefaehrlich ? "btn warnung" : "btn",
      text: jaText,
      onclick: () => { dlg.close(); fertig(true); },
    });
    dlg.append(
      el("div", { class: "dlg-inhalt" }, [
        el("h2", { text: titel }),
        el("p", { text }),
        el("div", { class: "zeile", style: { justifyContent: "flex-end", marginTop: "1rem" } }, [nein, ja]),
      ])
    );
    dlg.addEventListener("close", () => dlg.remove());
    document.body.appendChild(dlg);
    dlg.showModal();
    ja.focus();
  });
}

export function eingabeDialog(titel, felder, { okText = "Übernehmen" } = {}) {
  return new Promise((fertig) => {
    const dlg = el("dialog");
    const eingaben = {};
    const koerper = felder.map((f) => {
      const eingabe = el("input", {
        type: f.typ || "text",
        value: f.wert ?? "",
        placeholder: f.platzhalter ?? "",
        autocomplete: f.typ === "password" ? "new-password" : "off",
      });
      eingaben[f.name] = eingabe;
      return el("label", { class: "feld" }, [
        el("span", { class: "bez", text: f.bez }),
        eingabe,
        f.hinweis ? el("span", { class: "hinweis", text: f.hinweis }) : null,
      ]);
    });
    const form = el("form", {
      method: "dialog",
      onsubmit: (e) => {
        e.preventDefault();
        const werte = Object.fromEntries(Object.entries(eingaben).map(([k, v]) => [k, v.value]));
        dlg.close();
        fertig(werte);
      },
    }, [
      el("h2", { text: titel }),
      ...koerper,
      el("div", { class: "zeile", style: { justifyContent: "flex-end", marginTop: ".8rem" } }, [
        el("button", { type: "button", class: "btn sekundaer", text: "Abbrechen", onclick: () => { dlg.close(); fertig(null); } }),
        el("button", { type: "submit", class: "btn", text: okText }),
      ]),
    ]);
    dlg.append(el("div", { class: "dlg-inhalt" }, [form]));
    dlg.addEventListener("close", () => dlg.remove());
    document.body.appendChild(dlg);
    dlg.showModal();
    Object.values(eingaben)[0]?.focus();
  });
}

/* ------------------------------------------------------------------- Dateiwahl */

export function dateiWaehlen({ endungen = "", mehrere = false } = {}) {
  return new Promise((fertig) => {
    const eingabe = el("input", { type: "file", accept: endungen, multiple: mehrere, style: { display: "none" } });
    eingabe.addEventListener("change", () => {
      fertig(mehrere ? Array.from(eingabe.files) : eingabe.files[0] || null);
      eingabe.remove();
    });
    document.body.appendChild(eingabe);
    eingabe.click();
  });
}

/** Macht einen Bereich zur Ablagefläche für Dateien. */
export function ablageFlaeche(knoten, beiDateien, endungen = []) {
  const passt = (name) => !endungen.length || endungen.some((e) => name.toLowerCase().endsWith(e.toLowerCase()));
  const an = (e) => { e.preventDefault(); knoten.classList.add("ablage-aktiv"); };
  const aus = () => knoten.classList.remove("ablage-aktiv");
  knoten.addEventListener("dragover", an);
  knoten.addEventListener("dragenter", an);
  knoten.addEventListener("dragleave", aus);
  knoten.addEventListener("drop", (e) => {
    e.preventDefault();
    aus();
    const dateien = Array.from(e.dataTransfer?.files || []).filter((d) => passt(d.name));
    if (dateien.length) beiDateien(dateien);
  });
}

/* ------------------------------------------------------------------- Diverses */

/** Verzögert das Speichern, solange noch getippt wird. */
export function entprellt(fn, ms = 400) {
  let uhr = null;
  return (...args) => {
    clearTimeout(uhr);
    uhr = setTimeout(() => fn(...args), ms);
  };
}

export function zeitText(sekunden) {
  const s = Math.max(0, Math.round(sekunden));
  const std = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sek = s % 60;
  const zz = (n) => String(n).padStart(2, "0");
  return std > 0 ? `${std}:${zz(min)}:${zz(sek)}` : `${zz(min)}:${zz(sek)}`;
}

/** Sorgt dafür, dass eine Textarea mit dem Inhalt mitwächst. */
export function autoHoehe(textarea, minZeilen = 3) {
  const anpassen = () => {
    textarea.style.height = "auto";
    const min = minZeilen * 1.45 * 16;
    textarea.style.height = `${Math.max(min, textarea.scrollHeight + 2)}px`;
  };
  textarea.addEventListener("input", anpassen);
  setTimeout(anpassen, 0);
  return anpassen;
}

/** Tabulator in Code-Feldern soll einrücken, nicht das Feld verlassen. */
export function tabEinrueckung(textarea, breite = 4) {
  textarea.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    const { selectionStart: a, selectionEnd: b, value } = textarea;
    const leer = " ".repeat(breite);
    if (a === b && !e.shiftKey) {
      textarea.value = value.slice(0, a) + leer + value.slice(b);
      textarea.selectionStart = textarea.selectionEnd = a + breite;
    } else {
      const start = value.lastIndexOf("\n", a - 1) + 1;
      const block = value.slice(start, b);
      const neu = e.shiftKey
        ? block.replace(new RegExp(`^ {1,${breite}}`, "gm"), "")
        : block.replace(/^/gm, leer);
      textarea.value = value.slice(0, start) + neu + value.slice(b);
      textarea.selectionStart = start;
      textarea.selectionEnd = start + neu.length;
    }
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
