/* ==========================================================================
   Vorgefertigte Ausgangssituationen (Lernsituationen).

   Aufbau nach den Vorgaben für berufliche Schulen in BW:
   • ein authentisches Problem als roter Faden durch die ganze Arbeit
   • betrieblicher bzw. lebensweltlicher Bezug, in dem die SuS eine Rolle haben
   • zu jeder Aufgabe ein Anschluss entlang der vollständigen Handlung
     (informieren – planen – entscheiden – durchführen – kontrollieren –
     reflektieren)

   Der Anschluss ist der Satz, der VOR der eigentlichen Aufgabenstellung steht.
   Er bindet die Aufgabe zurück an die Situation, damit die Arbeit nicht in
   zusammenhanglose Einzelfragen zerfällt.
   ========================================================================== */

export const HANDLUNGSSCHRITTE = {
  informieren: { name: "Informieren", kurz: "Sachverhalt erschließen, Begriffe klären", afb: "I–II" },
  planen: { name: "Planen", kurz: "Vorgehen und Lösungsweg entwickeln", afb: "II" },
  entscheiden: { name: "Entscheiden", kurz: "Zwischen Alternativen wählen und begründen", afb: "III" },
  durchfuehren: { name: "Durchführen", kurz: "Handlung ausführen, Produkt erstellen", afb: "II–III" },
  kontrollieren: { name: "Kontrollieren", kurz: "Ergebnis prüfen und sichern", afb: "II" },
  reflektieren: { name: "Reflektieren", kurz: "Vorgehen und Ergebnis bewerten", afb: "III" },
};

/** Welcher Handlungsschritt passt üblicherweise zu welchem Aufgabentyp? */
export const TYP_ZU_SCHRITT = {
  mc: "informieren",
  wahrfalsch: "informieren",
  kurzantwort: "informieren",
  stichworte: "informieren",
  aufzaehlung: "informieren",
  zuordnung: "informieren",
  lueckentext: "informieren",
  reihenfolge: "planen",
  zahl: "durchfuehren",
  rechenweg: "durchfuehren",
  "code-python": "durchfuehren",
  "code-web": "durchfuehren",
  parsons: "planen",
  freitext: "reflektieren",
};

export const SITUATIONEN = [
  /* ------------------------------------------------------------ Programmieren */
  {
    id: "kiosk",
    titel: "Der Schulkiosk bekommt eine Kasse",
    bereich: "Programmieren",
    faecher: ["Informatik", "IuK", "Wirtschaftsinformatik"],
    stufe: "Einstieg – Variablen, Bedingungen, Schleifen",
    betrieb: "SMV-Kiosk der JJWS",
    rolle: "Mitglied des Kiosk-Teams",
    text:
      "Der Schulkiosk wird von der SMV betrieben. Bisher rechnet ihr in der großen Pause im Kopf, " +
      "und am Monatsende stimmt die Kasse selten. Deshalb sollt ihr ein kleines Kassenprogramm " +
      "schreiben.\n\n" +
      "Es gilt: Ein belegtes Brötchen kostet 2,20 €, ein Getränk 1,50 €, ein Müsliriegel 0,90 €. " +
      "Wer einen Schülerausweis vorzeigt, bekommt 10 % Rabatt. Ab einem Einkauf von 10 € gibt es " +
      "zusätzlich ein Getränk gratis.\n\n" +
      "Ihr arbeitet zu zweit an der Kasse und habt vereinbart, dass das Programm auch von jemandem " +
      "bedient werden kann, der nicht programmieren kann.",
    anschluesse: {
      informieren:
        "Bevor du programmierst, verschaffst du dir Klarheit über die Regeln des Kiosks.",
      planen:
        "Du überlegst dir zuerst den Ablauf des Programms, bevor du die erste Zeile Code schreibst.",
      entscheiden:
        "Im Kiosk-Team gibt es unterschiedliche Vorschläge zur Umsetzung. Du sollst dich begründet entscheiden.",
      durchfuehren:
        "Jetzt setzt du das Kassenprogramm um.",
      kontrollieren:
        "Bevor das Programm in der großen Pause zum Einsatz kommt, prüfst du es mit Testfällen.",
      reflektieren:
        "Nach der ersten Pause mit dem neuen Programm zieht ihr im Kiosk-Team Bilanz.",
    },
  },
  {
    id: "fahrgemeinschaft",
    titel: "Fahrgemeinschaft zur Berufsschule",
    bereich: "Programmieren",
    faecher: ["Informatik", "IuK", "Mathematik"],
    stufe: "Einstieg – Funktionen, Rechnen, Listen",
    betrieb: "private Fahrgemeinschaft",
    rolle: "Organisator/in der Fahrgemeinschaft",
    text:
      "Du fährst mit drei Mitschülerinnen und Mitschülern gemeinsam zur Berufsschule. Ihr wechselt " +
      "euch mit dem Auto ab, aber die Abrechnung am Monatsende führt regelmäßig zu Diskussionen: " +
      "Wer ist wie oft gefahren, wer war krank, wer hat getankt?\n\n" +
      "Die Strecke beträgt 27 km je Richtung. Ihr rechnet mit 0,30 € pro Kilometer. Wer an einem Tag " +
      "nicht mitfährt, zahlt für diesen Tag nichts.\n\n" +
      "Du hast angeboten, ein kleines Programm zu schreiben, das die Abrechnung übernimmt.",
    anschluesse: {
      informieren: "Zuerst klärst du die Grundlagen der Abrechnung.",
      planen: "Du planst, wie das Programm aufgebaut sein muss.",
      entscheiden: "Ihr müsst euch auf eine Regelung einigen – du bereitest die Entscheidung vor.",
      durchfuehren: "Jetzt schreibst du den Teil des Programms, der die Kosten berechnet.",
      kontrollieren: "Du prüfst deine Berechnung an einem bekannten Monat gegen.",
      reflektieren: "Nach dem ersten Monat mit dem Programm besprecht ihr das Ergebnis.",
    },
  },
  {
    id: "lager",
    titel: "Lagerbestand im Ausbildungsbetrieb",
    bereich: "Programmieren",
    faecher: ["Informatik", "Wirtschaftsinformatik", "IuK"],
    stufe: "Aufbau – Listen, Dictionaries, Funktionen",
    betrieb: "Nordhoff Elektrotechnik GmbH, Heilbronn",
    rolle: "Auszubildende/r in der IT-Abteilung",
    text:
      "Du bist im zweiten Ausbildungsjahr bei der Nordhoff Elektrotechnik GmbH. Im Lager werden " +
      "Kleinteile geführt: Kabel, Klemmen, Sicherungen, Verteilerdosen.\n\n" +
      "Bisher hängt an der Lagertür eine Strichliste. Zweimal in diesem Quartal stand die Montage " +
      "still, weil ein Teil ausgegangen war, das niemand nachbestellt hatte.\n\n" +
      "Dein Ausbilder bittet dich, ein Programm zu schreiben, das den Bestand führt und rechtzeitig " +
      "meldet, wenn der Mindestbestand unterschritten wird.",
    anschluesse: {
      informieren: "Bevor du beginnst, verschaffst du dir einen Überblick über die Datenstruktur.",
      planen: "Du planst den Aufbau des Programms und legst die Datenstruktur fest.",
      entscheiden: "Dein Ausbilder lässt dir bei der Umsetzung freie Hand – du begründest deine Wahl.",
      durchfuehren: "Jetzt setzt du die Lagerverwaltung um.",
      kontrollieren: "Vor der Übergabe an die Montage prüfst du dein Programm systematisch.",
      reflektieren: "Im Ausbildungsgespräch stellst du deine Lösung vor.",
    },
  },
  {
    id: "sensordaten",
    titel: "Temperaturdaten aus der Werkstatt",
    bereich: "Programmieren",
    faecher: ["Informatik", "Technik", "Mathematik"],
    stufe: "Aufbau – Listen, Schleifen, Auswertung",
    betrieb: "Ausbildungswerkstatt der JJWS",
    rolle: "Mitglied des Technikteams",
    text:
      "In der Ausbildungswerkstatt misst ein kleiner Sensor jede Stunde die Temperatur. Die Werte " +
      "eines Arbeitstages werden als Liste gespeichert, zum Beispiel:\n\n" +
      "`[17.2, 17.8, 19.1, 21.4, 23.0, 24.6, 24.9, 23.2]`\n\n" +
      "Die Werkstattleitung möchte wissen, ob im Sommer nachgerüstet werden muss. Dafür braucht sie " +
      "Höchstwert, Tiefstwert und Durchschnitt sowie eine Warnung, sobald 25 °C überschritten werden.\n\n" +
      "Du sollst die Auswertung programmieren.",
    anschluesse: {
      informieren: "Zunächst machst du dir die Datenlage klar.",
      planen: "Du überlegst, wie die Auswertung Schritt für Schritt ablaufen soll.",
      entscheiden: "Für die Auswertung gibt es mehrere Wege – du wählst begründet einen aus.",
      durchfuehren: "Jetzt programmierst du die Auswertung.",
      kontrollieren: "Du prüfst deine Auswertung mit einem Datensatz, dessen Ergebnis du kennst.",
      reflektieren: "Du stellst der Werkstattleitung dein Ergebnis vor.",
    },
  },
  {
    id: "vertretungsplan",
    titel: "Vertretungsplan für den Bildschirm im Foyer",
    bereich: "Web",
    faecher: ["Informatik", "IuK", "Wirtschaftsinformatik"],
    stufe: "HTML / CSS, optional JavaScript",
    betrieb: "Johann-Jakob-Widmann-Schule",
    rolle: "Mitglied der Medien-AG",
    text:
      "Im Foyer der Schule hängt ein Bildschirm, auf dem der Vertretungsplan laufen soll. Bisher " +
      "wird dort ein abfotografierter Ausdruck gezeigt – von hinten ist er nicht lesbar.\n\n" +
      "Die Schulleitung hat der Medien-AG den Auftrag gegeben, eine saubere Seite zu bauen: große " +
      "Schrift, klare Tabelle, Schulfarben (Navy #00344D und Blau #009FE3), Logo oben rechts.\n\n" +
      "Die Seite muss auch aus fünf Metern Entfernung lesbar sein.",
    anschluesse: {
      informieren: "Bevor du gestaltest, klärst du die Grundlagen.",
      planen: "Du planst den Aufbau der Seite, bevor du Code schreibst.",
      entscheiden: "In der AG gibt es verschiedene Gestaltungsvorschläge – du entscheidest begründet.",
      durchfuehren: "Jetzt baust du die Seite.",
      kontrollieren: "Vor der Freigabe prüfst du die Seite auf Lesbarkeit und Struktur.",
      reflektieren: "Nach einer Woche im Foyer wertest du das Ergebnis aus.",
    },
  },
  {
    id: "bewerbung-web",
    titel: "Die eigene Bewerbungsseite",
    bereich: "Web",
    faecher: ["Informatik", "IuK", "Deutsch"],
    stufe: "HTML / CSS",
    betrieb: "eigene Bewerbung",
    rolle: "Bewerber/in",
    text:
      "Du bewirbst dich im nächsten Halbjahr um einen Ausbildungsplatz. Ein Personaler aus der " +
      "Region hat im Berufsinformationstag erzählt, dass ihn eine kleine, saubere Internetseite mit " +
      "den wichtigsten Angaben mehr überzeugt als eine überladene Bewerbungsmappe.\n\n" +
      "Du willst deshalb eine einseitige Bewerbungsseite bauen: Foto, Kurzvorstellung, schulischer " +
      "Werdegang, Praktika und Kontaktmöglichkeit.\n\n" +
      "Wichtig ist, dass die Seite auch auf dem Handy gut aussieht – dort wird sie zuerst geöffnet.",
    anschluesse: {
      informieren: "Zuerst klärst du die technischen Grundlagen.",
      planen: "Du planst die Struktur deiner Seite.",
      entscheiden: "Du triffst eine begründete Gestaltungsentscheidung.",
      durchfuehren: "Jetzt setzt du deine Bewerbungsseite um.",
      kontrollieren: "Du prüfst die Seite so, wie ein Personaler sie sehen würde.",
      reflektieren: "Du bewertest dein Ergebnis kritisch.",
    },
  },

  /* --------------------------------------------------------------- Wirtschaft */
  {
    id: "techmotive",
    titel: "Wirtschaftliche Beziehungen der TechMotive GmbH",
    bereich: "Wirtschaft",
    faecher: ["Wirtschaft", "VBL", "BWL"],
    stufe: "Wirtschaftskreislauf, Wertschöpfung, BIP",
    betrieb: "TechMotive GmbH, Baden-Württemberg",
    rolle: "Mitarbeiter/in in der Verwaltung",
    text:
      "Du arbeitest als Mitarbeiterin bzw. Mitarbeiter bei der TechMotive GmbH, einem " +
      "mittelständischen Unternehmen aus Baden-Württemberg, das elektronische Komponenten für die " +
      "Automobilindustrie herstellt.\n\n" +
      "Im Rahmen deiner beruflichen Tätigkeit stehst du in vielfältigen wirtschaftlichen Beziehungen " +
      "zu anderen Unternehmen, zu privaten Haushalten, zu Banken und zum Staat. Dein Einkommen " +
      "verwendest du unter anderem für Konsumausgaben, zum Sparen oder zur Vermögensbildung.",
    anschluesse: {
      informieren:
        "Du arbeitest in der Verwaltungs- und Controllingabteilung und unterstützt bei der Analyse " +
        "der wirtschaftlichen Beziehungen des Unternehmens.",
      planen: "Du bereitest die Analyse vor und legst dein Vorgehen fest.",
      entscheiden: "Die Geschäftsleitung erwartet eine begründete Empfehlung von dir.",
      durchfuehren: "In der Controlling-Abteilung führst du die Berechnung durch.",
      kontrollieren: "Du prüfst deine Zahlen, bevor sie in den Bericht gehen.",
      reflektieren: "Du ordnest dein Ergebnis gesamtwirtschaftlich ein.",
    },
  },
  {
    id: "erste-abrechnung",
    titel: "Die erste eigene Gehaltsabrechnung",
    bereich: "Wirtschaft",
    faecher: ["Wirtschaft", "VBL", "Sozialkunde"],
    stufe: "Brutto/Netto, Abgaben, Sozialversicherung",
    betrieb: "eigener Ausbildungsbetrieb",
    rolle: "Auszubildende/r im 1. Ausbildungsjahr",
    text:
      "Im Vertrag stand eine Ausbildungsvergütung von 1.020 € im Monat. Auf deinem Konto sind heute " +
      "aber deutlich weniger angekommen.\n\n" +
      "Auf der Abrechnung stehen Begriffe, die du zum ersten Mal siehst: Lohnsteuer, " +
      "Solidaritätszuschlag, Kranken-, Pflege-, Renten- und Arbeitslosenversicherung.\n\n" +
      "Deine Mutter meint, das sei „ganz normal“. Du willst es genau wissen – auch, weil du " +
      "monatlich etwas für den Führerschein zurücklegen möchtest.",
    anschluesse: {
      informieren: "Du verschaffst dir zuerst Klarheit über die Begriffe auf deiner Abrechnung.",
      planen: "Du planst, wie du deine Abrechnung nachvollziehen kannst.",
      entscheiden: "Du triffst eine begründete Entscheidung für dich selbst.",
      durchfuehren: "Jetzt rechnest du deine Abrechnung nach.",
      kontrollieren: "Du prüfst dein Ergebnis auf Plausibilität.",
      reflektieren: "Du ziehst ein Fazit für deine eigene Finanzplanung.",
    },
  },
  {
    id: "leasing",
    titel: "Firmenwagen: kaufen oder leasen?",
    bereich: "Wirtschaft",
    faecher: ["Wirtschaft", "VBL", "BWL"],
    stufe: "Finanzierung, Investitionsentscheidung",
    betrieb: "TechMotive GmbH",
    rolle: "Mitarbeiter/in im kaufmännischen Bereich",
    text:
      "Für den Außendienst deines Unternehmens soll ein neuer Firmenwagen angeschafft werden. Er " +
      "wird regelmäßig für Kundentermine, Geschäftsreisen und Messebesuche genutzt.\n\n" +
      "Der Wagen kostet in der Anschaffung 38.000 €. Alternativ bietet der Händler ein Leasing über " +
      "36 Monate zu 420 € monatlich bei 3.000 € Sonderzahlung an.\n\n" +
      "Die Geschäftsleitung bittet dich um eine Entscheidungsvorlage.",
    anschluesse: {
      informieren: "Bevor du rechnest, klärst du die Begriffe.",
      planen: "Du planst den Aufbau deiner Entscheidungsvorlage.",
      entscheiden: "Die Geschäftsleitung erwartet von dir eine klare, begründete Empfehlung.",
      durchfuehren: "Du stellst die Zahlen für beide Varianten gegenüber.",
      kontrollieren: "Du prüfst deine Gegenüberstellung auf Vollständigkeit.",
      reflektieren: "Du bewertest, welche Faktoren sich nicht in Zahlen ausdrücken lassen.",
    },
  },
  {
    id: "handyvertrag",
    titel: "Der erste eigene Handyvertrag",
    bereich: "Wirtschaft",
    faecher: ["Wirtschaft", "VBL", "Sozialkunde", "Mathematik"],
    stufe: "Verträge, Verbraucherschutz, Kostenvergleich",
    betrieb: "privater Alltag",
    rolle: "Verbraucher/in",
    text:
      "Dein alter Vertrag läuft in sechs Wochen aus. Im Laden bekommst du zwei Angebote:\n\n" +
      "Tarif A: 19,99 € im Monat, 24 Monate Laufzeit, 20 GB, Handy für 1 € Zuzahlung.\n" +
      "Tarif B: 9,99 € im Monat, monatlich kündbar, 15 GB, kein Handy.\n\n" +
      "Der Verkäufer drängt auf einen sofortigen Abschluss, weil das Angebot „nur heute“ gelte. " +
      "Ein neues Handy würde dich einzeln rund 380 € kosten.",
    anschluesse: {
      informieren: "Bevor du unterschreibst, verschaffst du dir einen Überblick.",
      planen: "Du planst deinen Vergleich der beiden Angebote.",
      entscheiden: "Am Ende musst du dich entscheiden – und deine Entscheidung begründen können.",
      durchfuehren: "Du rechnest die tatsächlichen Gesamtkosten aus.",
      kontrollieren: "Du prüfst, ob du an alle Kostenbestandteile gedacht hast.",
      reflektieren: "Du bewertest die Verkaufssituation im Laden.",
    },
  },

  /* ------------------------------------------------------------------- Frei */
  {
    id: "frei",
    titel: "Eigene Ausgangssituation schreiben",
    bereich: "Frei",
    faecher: [],
    stufe: "",
    betrieb: "",
    rolle: "",
    text: "",
    anschluesse: {
      informieren: "",
      planen: "",
      entscheiden: "",
      durchfuehren: "",
      kontrollieren: "",
      reflektieren: "",
    },
  },
];

export function situationNach(id) {
  return SITUATIONEN.find((s) => s.id === id) ?? null;
}

/** Alle Bereiche für die Filterleiste im Editor. */
export function bereiche() {
  return [...new Set(SITUATIONEN.map((s) => s.bereich))];
}

/**
 * Passenden Anschlusstext zu einer Aufgabe holen.
 * @param {object} situation
 * @param {object} aufgabe
 * @param {string} [schritt]  überschreibt die Vorauswahl nach Aufgabentyp
 */
export function anschlussFuer(situation, aufgabe, schritt = null) {
  if (!situation) return "";
  const s = schritt || aufgabe.handlungsschritt || TYP_ZU_SCHRITT[aufgabe.typ] || "durchfuehren";
  return situation.anschluesse?.[s] ?? "";
}

/**
 * Setzt bei allen Aufgaben einer Arbeit den zur Situation passenden Anschluss.
 * Vorhandene, von Hand geänderte Anschlüsse bleiben erhalten, sofern
 * `ueberschreiben` false ist.
 */
export function anschluesseAnwenden(master, situation, ueberschreiben = true) {
  let gesetzt = 0;
  (master.aufgaben || []).forEach((a) => {
    if (!ueberschreiben && a.situationsAnschluss?.trim()) return;
    const text = anschlussFuer(situation, a);
    if (text) {
      a.situationsAnschluss = text;
      a.handlungsschritt = a.handlungsschritt || TYP_ZU_SCHRITT[a.typ] || "durchfuehren";
      gesetzt++;
    }
  });
  return gesetzt;
}
