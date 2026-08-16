# Bauplan

Dieses Dokument hält fest, **was gefordert wurde** und **wie es umgesetzt ist**.
Es ist die Referenz für alle weiteren Änderungen an diesem Projekt.

---

## 1. Die Anforderungen

Gesammelt aus den Vorgaben der Lehrkraft, in der Reihenfolge, in der sie kamen.

| Nr. | Anforderung | Status |
|-----|-------------|--------|
| A1 | Webseite, auf der Klassenarbeiten geschrieben werden | ✅ `app/pruefung/` |
| A2 | Mehrere Klassenarbeiten anlegen und auswählen können | ✅ Übersicht in `app/lehrer/` |
| A3 | Unterschiedliche Klassen, unterschiedliche Aufgaben | ✅ Kopfdaten je Arbeit |
| A4 | Schwerpunkt Programmieren: Python, später HTML/CSS/JS | ✅ Aufgabentypen 11–13 |
| A5 | Antworten hinterlegen → automatische Korrektur | ✅ 13 von 14 Typen vollautomatisch |
| A6 | Programmieraufgaben mit Unit-Tests automatisch prüfen | ✅ Pyodide im Web Worker |
| A7 | Punkte vergeben, Note berechnen | ✅ `noten.js` |
| A8 | Am Ende Datei abschicken/herunterladen | ✅ `.jjwsa` per Download |
| A9 | Datei so verschlüsselt, dass SuS sie nicht lesen können | ✅ ECDH P-256 + AES-256-GCM |
| A10 | Datei in den Tauschordner legen | ✅ Anleitung in der App |
| A11 | Zweites, getrenntes Programm zum Korrigieren | ✅ `app/lehrer/`, Reiter „Korrektur“ |
| A12 | Datenschutzkonform, alles bleibt lokal im Browser | ✅ kein einziger Netzwerkaufruf nach außen |
| A13 | Design | ✅ JJWS Corporate Design |
| A14 | Prüfen, ob Name + Klasse verschlüsselt DSGVO-konform ist | ✅ ja – Begründung in `DATENSCHUTZ.md` |
| A15 | Notenschlüssel nach Lehrerfreund-Standard | ✅ Formel verifiziert, siehe unten |
| A16 | So viele Aufgabentypen wie möglich, möglichst automatisch | ✅ 14 Typen, 13 automatisch |
| A17 | Klassenarbeits-Design wie die vorgelegte PDF | ✅ `druck.css` / `druck.js` |
| A18 | Am Ende ein PDF zum Ausdrucken | ✅ drei Druckausgaben |
| A19 | Und zwar die **korrigierte** Klassenarbeit | ✅ Modus „korrektur“ |
| A20 | Vorgefertigte Ausgangssituationen | ✅ `situationen.js`, 10 Lernsituationen |
| A21 | Bei gewählter Situation: passende Erweiterung vor jeder Aufgabe | ✅ Anschlüsse je Handlungsschritt |
| A22 | Situationen SuS-nah und sinnvoll | ✅ nach `unterrichtsplanung-bw` |
| A23 | Aufgaben in unterschiedlicher Reihenfolge gegen Abschreiben | ✅ `mischen.js`, pro Person |
| A24 | Stabil, wenn 30 SuS gleichzeitig schreiben | ✅ siehe Abschnitt 6 |
| A25 | Responsive | ✅ bis ~340 px Breite |
| A26 | Klassenarbeiten auch am Handy erstellen können | ✅ Editor ist mobil bedienbar |
| A27 | SuS laden nur die Datei und exportieren sie wieder – alles andere in der Lehrer-App | ✅ Grundprinzip der Architektur |
| A28 | Repository öffentlich, aber niemand darf ohne Erlaubnis ändern | ⚙️ Anleitung in `SICHERHEIT.md` |
| A29 | Modernes Design | ✅ überarbeitete Design-Schicht |
| A30 | Einfache Handhabung | ✅ Typ-Dialog, Schrittanzeige, feste Aktionsleiste |
| A31 | Syntax-Highlighting bei Python-Aufgaben | ✅ eigener Editor, auch HTML/CSS/JS |
| A32 | GitHub-Website | ✅ Pages-Veröffentlichung über `.github/workflows/pages.yml` |
| A33 | Zwei getrennte Auslieferungen: SuS-App öffentlich auf GitHub Pages, Lehrkraft-Werkzeug **nur lokal** und über die öffentliche Adresse nicht erreichbar | ✅ Workflow packt nur `app/pruefung/` + `app/shared/` + `assets/` in `_site/`; `app/lehrer/` wird nie hochgeladen |
| A34 | Keine Demo | ✅ Demo-Modus, Demo-Schlüssel und Beispiel-`.jjwsp` entfernt |
| A35 | Python fest in die SuS-Website eingebaut | ✅ Workflow lädt Pyodide 0.26.4 beim Veröffentlichen nach `_site/app/vendor/pyodide/`; kein CDN, kein Nachladen von fremden Servern |

---

## 2. Grundentscheidung: Wo wird bewertet?

**Bewertet wird ausschließlich im Lehrer-Werkzeug.**

Das ist die wichtigste Entscheidung des ganzen Projekts, und alles andere folgt
daraus:

- Die Datei, die die Klasse bekommt (`.jjwsp`), enthält **keine einzige Lösung**
  und **keinen Testfall**. Auch wer sie im Texteditor öffnet, findet nichts.
- Die Abgabe (`.jjwsa`) enthält **nur Antworten** – keine Punkte, keine Noten.
  Eine Manipulation der eigenen Punktzahl ist damit unmöglich, nicht bloß
  erschwert.
- Die Bewertung läuft erst bei der Lehrkraft, wo Master und privater Schlüssel
  liegen.

Der Preis dafür: Die SuS sehen während der Arbeit nicht, wie viele Punkte sie
haben. Das ist bei einer Klassenarbeit ohnehin richtig so.

Als Lernhilfe gibt es bei Python-Aufgaben optionale **Selbsttests**, die sichtbar
sind und nichts zählen – die Lehrkraft legt fest, welche das sind.

---

## 3. Die beiden Programme

```
                LEHRKRAFT                                     SCHÜLERIN / SCHÜLER
   ┌──────────────────────────────────┐
   │  app/lehrer/                     │
   │  ────────────────────────────    │
   │  Schlüssel   Klassenarbeiten     │
   │  Korrektur   Hilfe               │
   └───────────┬──────────────────────┘
               │  Export: arbeit.jjwsp                ┌──────────────────────────┐
               │  (ohne Lösungen, mit öffentl.  ───▶  │  app/pruefung/           │
               │   Schlüssel)                         │  ──────────────────────  │
               │                                      │  laden · schreiben ·     │
               │                                      │  verschlüsselt abgeben   │
               │  ◀─── abgabe_Name.jjwsa ─────────────┤                          │
               │       (verschlüsselt)                └──────────────────────────┘
               ▼
      entschlüsseln · automatisch bewerten
      Freitext von Hand · PDF · Notenliste · CSV
```

Beide Programme sind reine statische Webseiten. Kein Build-Schritt, kein npm,
kein Framework, kein Server-Backend.

---

## 4. Die vier Dateiformate

| Endung | Inhalt | Wer hat sie | Verschlüsselt |
|--------|--------|-------------|---------------|
| `.jjwsm` | Master mit allen Lösungen und Testfällen | nur Lehrkraft | nein (bleibt lokal) |
| `.jjwsp` | Fassung für die Klasse, ohne Lösungen | Tauschordner | nein (enthält nichts Geheimes) |
| `.jjwsa` | Abgabe einer Person | Tauschordner | **ja** |
| `.jjwskey` | privater Schlüssel der Lehrkraft | nur Lehrkraft | **ja**, mit Passphrase |

---

## 5. Verschlüsselung

Hybridverfahren, wie bei verschlüsselter E-Mail:

1. Die Lehrkraft erzeugt einmalig ein **ECDH-Schlüsselpaar (Kurve P-256)**.
   Der private Teil wird mit **PBKDF2-SHA256 (310 000 Runden)** aus einer
   Passphrase abgeleitet und mit **AES-256-GCM** verschlüsselt abgelegt.
2. Der **öffentliche** Teil wandert in jede `.jjwsp`-Datei.
3. Die Prüfungs-App erzeugt für jede Abgabe ein **flüchtiges Schlüsselpaar**,
   leitet über ECDH + **HKDF-SHA256** einen einmaligen AES-Schlüssel ab und
   verschlüsselt damit die Antworten. Der flüchtige private Schlüssel wird nie
   gespeichert.
4. Nur mit dem privaten Schlüssel der Lehrkraft lässt sich die Abgabe öffnen.

Eigenschaften, die daraus folgen:

- SuS können **ihre eigene** Abgabe nach dem Absenden nicht mehr lesen.
- SuS können **fremde** Abgaben aus dem Tauschordner nicht lesen.
- Jede nachträgliche Änderung an der Datei macht sie unlesbar (AES-GCM ist
  authentifizierend); auch die unverschlüsselten Kopfdaten sind mitgesichert.
- Alles läuft über die **Web Crypto API des Browsers** – keine fremde
  Bibliothek, kein Netzwerk.

Grenze, die ehrlich benannt sein muss: Wer den öffentlichen Schlüssel hat, kann
eine *neue* Abgabe erzeugen. Absender-Echtheit ist damit nicht bewiesen. Das ist
im Klassenzimmer unkritisch, weil die Aufsicht die Zuordnung Person↔Platz
sicherstellt.

---

## 6. 30 SuS gleichzeitig

Die Prüfungs-App ist eine **statische Seite**. Es gibt keine Datenbank, keine
Sitzungen, keinen Server, der rechnen müsste. Jeder Rechner arbeitet für sich.

- **Verteilung:** Die Dateien einmal auf ein Netzlaufwerk oder einen kleinen
  Webserver legen. Pro SuS werden beim Öffnen etwa 12 MB übertragen (davon
  ca. 11 MB Pyodide), danach liegt alles im Browser-Cache. 30 × 12 MB verteilt
  sich über die Einstiegsminuten; ein normales Schulnetz trägt das ohne
  Weiteres. Wenn Programmieraufgaben nicht vorkommen, sind es ~200 KB.
- **Rechenlast:** Python läuft in einem **Web Worker** auf dem jeweiligen
  Schülerrechner. Eine Endlosschleife blockiert nur diesen einen Worker und
  wird nach 10 Sekunden abgebrochen und neu gestartet – der Rest der App
  bleibt bedienbar.
- **Datenverlust:** Jede Eingabe wird laufend in `localStorage` gesichert. Nach
  Absturz, Neustart oder versehentlichem Schließen fragt die App beim erneuten
  Öffnen, ob weitergearbeitet werden soll.
- **Ausfall des Netzlaufwerks während der Arbeit:** unkritisch. Nach dem Laden
  braucht die App keine Verbindung mehr.
- **Empfehlung für die Aufsicht:** die `.jjwsp`-Datei zusätzlich auf einen
  USB-Stick legen, falls das Laufwerk beim Start klemmt.

---

## 7. Aufgabentypen

14 Typen, 13 davon vollautomatisch korrigierbar.

| # | Typ | Automatisch | Prüfverfahren |
|---|-----|:-----------:|---------------|
| 1 | Multiple Choice | ✅ | Einfach-/Mehrfachauswahl, Teilpunkte, Abzug für falsche Marken |
| 2 | Aussagenraster | ✅ | Tabelle mit frei definierbaren Spalten |
| 3 | Kurzantwort | ✅ | Lösungsliste, Groß-/Kleinschreibung, Leerzeichen, Regex, Tippfehlertoleranz |
| 4 | Antwort mit Stichwörtern | ✅ | Fließtext auf Schlüsselbegriffe prüfen, Punkte je Begriff |
| 5 | Aufzählung | ✅ | n Felder gegen Lösungsgruppen, keine Doppelzählung |
| 6 | Zuordnung | ✅ | Paare, Punkte je Paar |
| 7 | Reihenfolge | ✅ | Teilpunkte je richtiger Abfolge oder alles/nichts |
| 8 | Lückentext | ✅ | `[[Lösung\|Alternative]]`, optional als Code |
| 9 | Zahlenwert | ✅ | Toleranz, Einheit, Komma und Punkt gleichwertig |
| 10 | Rechnung mit Teilergebnissen | ✅ | mehrere benannte Zwischenschritte |
| 11 | Python programmieren | ✅ | Unit-Tests in Pyodide: Funktionsaufruf, stdin→stdout, freie Asserts, Codeprüfung |
| 12 | Code sortieren (Parsons) | ✅ | Reihenfolge **und** Einrückung, mit Ablenkerzeilen |
| 13 | HTML/CSS/JS | ✅ | Sandbox-iframe: Selektor, Text, Attribut, berechneter Stil, JS-Ausdruck |
| 14 | Freitext | ➖ | Erwartungshorizont + Kriterienraster, Punkte per Klick |

---

## 8. Notenschlüssel

Standard ist der lineare Schlüssel des Notenschlüsselrechners von
lehrerfreund.de:

```
Note = 6 − 5 · (erreichte Punkte / mögliche Punkte)
```

auf eine Nachkommastelle gerundet, wobei die exakte Hälfte **abgerundet** wird
(1,25 → 1,2 und 5,75 → 5,7).

Gegen die Tabelle für 40 Punkte geprüft, 34 Stichproben, alle identisch:

| Punkte | 40 | 39,0–39,5 | 37,5 | 32 | 24 | 16 | 12 | 8 | 2 | 0 |
|--------|----|-----------|------|----|----|----|----|----|----|----|
| Note   | 1,0 | 1,1 | 1,3 | 2,0 | 3,0 | 4,0 | 4,5 | 5,0 | 5,7 | 6,0 |

Anpassbar sind beide Ankerpunkte (bei wie viel Prozent die 1,0 beginnt und wo
die 6,0 liegt). Zusätzlich stehen der **IHK-Schlüssel** (4 ab 50 %) und der
**KMK-Schlüssel** (strenger) als Stufenschlüssel bereit, jede Schwelle frei
editierbar. Die Punkte-Noten-Tabelle wird live berechnet und liegt jedem
Lösungsblatt und jeder Notenliste bei.

---

## 9. Ausgangssituationen

Nach den Vorgaben für berufliche Schulen in BW trägt eine Klassenarbeit ein
**authentisches Problem als roten Faden**. Deshalb:

- 10 fertige Lernsituationen in `app/shared/situationen.js`
  (Schulkiosk, Fahrgemeinschaft, Lagerbestand, Sensordaten, Vertretungsplan,
  Bewerbungsseite, TechMotive GmbH, erste Gehaltsabrechnung, Leasing,
  Handyvertrag) – jeweils mit betrieblicher oder lebensweltlicher Rolle.
- Zu jeder Situation gibt es **sechs Anschlusstexte** entlang der vollständigen
  Handlung: informieren, planen, entscheiden, durchführen, kontrollieren,
  reflektieren.
- Wird eine Situation gewählt, bekommt jede Aufgabe automatisch den zu ihrem
  Typ passenden Anschluss vorangestellt. Der Handlungsschritt ist pro Aufgabe
  umstellbar, der Text frei überschreibbar.

So zerfällt die Arbeit nicht in zusammenhanglose Einzelfragen.

---

## 10. Schutz vor Abschreiben

Zwei Ebenen:

1. **Beim Export** werden Antwortoptionen, Zuordnungsspalten, Reihenfolge-
   Elemente und Parsons-Bausteine gemischt. Damit verrät die ausgelieferte
   Datei nichts über die Lösung – auch dann nicht, wenn jemand den Quellcode
   dieses Projekts kennt. Bei Zuordnungsaufgaben trägt die rechte Spalte
   zusätzlich neutrale Kennungen, damit die Paarung nicht aus der Datei
   ablesbar ist.
2. **Pro Person** wird beim Start noch einmal gemischt: Aufgabenreihenfolge
   (Abschnitte bleiben zusammen), Antwortoptionen, Zuordnung, Reihenfolge,
   Parsons-Bausteine. Der Nachbarbildschirm zeigt eine andere Aufgabe.

Die Reihenfolge ist **reproduzierbar**: Sie wird aus Prüfungs-ID und Identität
berechnet, nicht gewürfelt. Nach einem Absturz entsteht dieselbe Reihenfolge
wieder. Die Bewertung ist davon unberührt, weil Antworten über die Aufgaben-ID
zugeordnet werden, nie über die Position.

Abschaltbar pro Arbeit, falls eine feste Reihenfolge gewünscht ist.

---

## 11. Druckausgabe

Nachgebaut nach der vorgelegten Klassenarbeit:

- **Deckblatt** mit großem Titel und Bildmarke, Kopftabelle (Name / Vorname /
  Klasse / Fach / Thema / Zeit), Aufgabenübersicht mit erreichten und möglichen
  Punkten, blau überschriebener Bewertungskasten
- **Inhaltsseiten** mit Kopfzeile (Arbeit · Fach · Klasse + Logo), blauen
  Abschnittsüberschriften mit Trennlinie, Ausgangssituation im Rahmen,
  umrahmten Aufgabenkästen mit grauer Kreisnummer, Schreiblinien
- **Fußzeile** mit Schule, Lehrkraft und „Seite 3/6“

Die Seiten werden als feste A4-Blätter aufgebaut, damit Umbrüche und
Seitenzählung auch im PDF stimmen. Ausgabe über die Druckfunktion des Browsers
(„Als PDF speichern“) – keine externe Bibliothek, kein Upload.

Drei Ausgaben: **Angabe** (leer, zum Austeilen), **Lösungsblatt**
(Erwartungshorizont), **korrigierte Arbeit** (Antworten, Häkchen je Prüfschritt,
Punkte, Note, Rückmeldung) sowie die **Notenliste** mit Statistik.

---

## 12. Datenschutz in einem Absatz

Rechtsgrundlage ist Art. 6 Abs. 1 lit. e DSGVO in Verbindung mit § 115 SchG BW –
Leistungsfeststellung ist Kernaufgabe der Schule, eine Einwilligung ist nicht
erforderlich. Verschlüsselung und rein lokale Verarbeitung sind genau die
technischen Maßnahmen, die Art. 32 DSGVO verlangt. Es gibt keinen Cloud-Dienst,
keinen Auftragsverarbeiter, keinen Drittlandtransfer. Ausführlich in
`DATENSCHUTZ.md`, inklusive Löschfristen und einer Vorlage für das Verzeichnis
von Verarbeitungstätigkeiten.

---

## 13. Aufbau des Projekts

```
app/
  shared/            von beiden Programmen genutzt
    theme.css        JJWS-Design, responsiv
    druck.css        A4-Layout der Klassenarbeit
    crypto.js        ECDH + AES-GCM + PBKDF2
    model.js         Datenmodell, 14 Aufgabentypen, Master → SuS-Fassung
    noten.js         Notenschlüssel und Notenberechnung
    bewertung.js     automatische Bewertung
    mischen.js       persönliche Aufgabenreihenfolge
    situationen.js   10 Lernsituationen mit Anschlüssen
    python-runner.js Steuerung des Pyodide-Workers (Zeitlimit)
    py-worker.js     der Worker selbst
    web-runner.js    Prüfung von HTML/CSS/JS im Sandbox-iframe
    aufgaben-ui.js   interaktive Aufgabenfelder
    code-editor.js   Editor mit Syntaxhervorhebung (Python, HTML, CSS, JS)
    druck.js         Seitenaufbau und PDF-Ansichten
    speicher.js      lokale Ablage
    dom.js           kleine Oberflächenhelfer
  pruefung/          Programm 1 – die SuS
  lehrer/            Programm 2 – Erstellen und Korrigieren
    schluessel.js  editor.js  korrektur.js
  vendor/pyodide/    wird einmalig lokal geholt (nicht im Repository)
index.html           Projektseite für GitHub Pages
assets/logo/         JJWS-Bildmarke
beispiele/           Beispielarbeit zum Ausprobieren
scripts/             Pyodide holen
start.sh / start.cmd lokaler Webserver
```

---

## 14. Bewusst nicht gebaut

- **Kein Login, keine Benutzerverwaltung.** Es gibt keinen Server, auf dem so
  etwas sinnvoll wäre.
- **Keine Cloud-Synchronisation.** Widerspricht der Grundanforderung.
- **Keine automatische Bewertung von Freitext durch KI.** Das wäre eine
  Übermittlung an einen Dritten und bei einer Leistungsfeststellung auch
  fachlich fragwürdig.
- **Keine Sperrung des Browsers („Kiosk-Modus“).** Das leistet der Browser
  bzw. die Schul-IT besser als eine Webseite; die Aufsicht bleibt Aufgabe der
  Lehrkraft.
