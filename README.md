# Klassenarbeiten

Zwei kleine Webprogramme für digitale Klassenarbeiten an der
Johann-Jakob-Widmann-Schule Heilbronn – mit automatischer Korrektur, auch von
Python- und Webprogrammieraufgaben.

**Alles bleibt auf dem jeweiligen Rechner.** Kein Server, kein Konto, keine
Cloud, keine einzige Anfrage ins Internet.

```
LEHRKRAFT                                          SCHÜLERIN / SCHÜLER
app/lehrer/                                        app/pruefung/
  Klassenarbeit bauen  ──── arbeit.jjwsp ────▶       schreiben
  korrigieren          ◀─── abgabe.jjwsa ─────       verschlüsselt abgeben
  PDF · Notenliste · CSV
```

---

## Schnellstart

### 1. Einmalig einrichten

```bash
# Python-Laufzeit für die Programmieraufgaben lokal holen (~12 MB)
./scripts/pyodide-holen.sh          # macOS / Linux
scripts\pyodide-holen.cmd           # Windows
```

Ohne diesen Schritt funktioniert alles außer den Python-Aufgaben.

### 2. Starten

```bash
./start.sh                          # macOS / Linux
start.cmd                           # Windows – Doppelklick genügt
```

Dann im Browser öffnen:

| Wer | Adresse |
|-----|---------|
| Schülerinnen und Schüler | <http://localhost:8080/app/pruefung/> |
| Lehrkraft | <http://localhost:8080/app/lehrer/> |

> **Warum ein Server?** Browser sperren aus Sicherheitsgründen die
> Verschlüsselung und das Laden der Python-Laufzeit, wenn eine Seite per
> Doppelklick (`file://`) geöffnet wird. Über `http://localhost` funktioniert
> alles. Der Server ist nur auf dem eigenen Rechner erreichbar.

### 3. Ausprobieren

Im Reiter **Klassenarbeiten** auf *Master-Datei laden* klicken und
`beispiele/klassenarbeit-schulkiosk.jjwsm` öffnen – eine vollständige Arbeit mit
zehn Aufgaben aller Typen.

---

## Der Ablauf in fünf Schritten

1. **Schlüssel anlegen** (einmalig, Reiter *Schlüssel*). Die Schlüsseldatei
   zusätzlich außerhalb des Rechners sichern – ohne sie lassen sich Abgaben nie
   wieder öffnen.
2. **Klassenarbeit bauen**: Kopfdaten, Ausgangssituation wählen, Aufgaben
   anlegen, Notenschlüssel prüfen.
3. **Ausgeben**: *Datei für die Klasse erzeugen* → die `.jjwsp`-Datei in den
   Tauschordner legen. Sie enthält keine Lösungen.
4. **Schreiben lassen**: Die SuS öffnen die Prüfungs-App, laden die Datei,
   bearbeiten die Aufgaben und legen ihre `.jjwsa`-Datei im Tauschordner ab.
5. **Korrigieren**: Reiter *Korrektur*, Arbeit wählen, alle Abgaben
   hereinziehen. Die Bewertung läuft automatisch; Freitexte bewertest du per
   Klick. Danach PDFs, Notenliste und CSV.

Ausführlich: [`docs/anleitung-lehrkraft.md`](docs/anleitung-lehrkraft.md) ·
für die Klasse: [`docs/anleitung-sus.md`](docs/anleitung-sus.md)

---

## Was das Werkzeug kann

**14 Aufgabentypen, 13 davon vollautomatisch korrigierbar**

Multiple Choice · Aussagenraster · Kurzantwort · Antwort mit Stichwörtern ·
Aufzählung · Zuordnung · Reihenfolge · Lückentext · Zahlenwert · Rechnung mit
Teilergebnissen · **Python mit Unit-Tests** · **Code sortieren (Parsons)** ·
**HTML/CSS/JS mit DOM-Prüfungen** · Freitext (von Hand)

**Weiteres**

- **Echte Unit-Tests**: Python läuft über Pyodide in einer WebAssembly-Sandbox,
  mit Zeitlimit gegen Endlosschleifen. Web-Aufgaben werden in einem
  abgeschotteten iframe geprüft (Selektor, Text, Attribut, berechneter Stil).
- **10 fertige Lernsituationen** mit Anschlusstexten entlang der vollständigen
  Handlung – die Arbeit trägt einen roten Faden.
- **Notenschlüssel** linear nach Lehrerfreund-Standard (Voreinstellung),
  IHK oder KMK, jede Schwelle frei einstellbar, mit Punkte-Noten-Tabelle.
- **Individuelle Aufgabenreihenfolge** je Person gegen Abschreiben –
  reproduzierbar, sodass ein Absturz nichts durcheinanderbringt.
- **PDF-Ausgabe** im Layout der Papier-Klassenarbeit: leere Angabe,
  Lösungsblatt, korrigierte Arbeit je Person, Notenliste mit Statistik.
- **Responsiv** – Klassenarbeiten lassen sich auch am Handy vorbereiten.
- **Autosave** in der Prüfungs-App: nach einem Absturz geht es weiter.

---

## Dateiformate

| Endung | Was | Wo | Verschlüsselt |
|--------|-----|-----|:---:|
| `.jjwsm` | Master mit Lösungen | bei der Lehrkraft | – |
| `.jjwsp` | Fassung für die Klasse, **ohne Lösungen** | Tauschordner | – |
| `.jjwsa` | Abgabe einer Person | Tauschordner | **ja** |
| `.jjwskey` | privater Schlüssel | sicher verwahren | **ja** |

---

## Datenschutz und Sicherheit

- [`DATENSCHUTZ.md`](DATENSCHUTZ.md) – Rechtsgrundlagen, technische Maßnahmen,
  Löschfristen, Vorlage für das Verzeichnis von Verarbeitungstätigkeiten
- [`SICHERHEIT.md`](SICHERHEIT.md) – warum ein öffentliches Repository
  unproblematisch ist und wie es gegen Änderungen geschützt wird
- [`BAUPLAN.md`](BAUPLAN.md) – alle Anforderungen und Entwurfsentscheidungen

Kurzfassung: Namen und Antworten werden mit ECDH P-256 und AES-256-GCM
verschlüsselt und verlassen den Rechner nie. Rechtsgrundlage ist Art. 6 Abs. 1
lit. e DSGVO in Verbindung mit § 115 SchG BW.

---

## Technik

Reine statische Webseiten: HTML, CSS und JavaScript-Module. Kein Build-Schritt,
kein npm, kein Framework, keine Abhängigkeit außer Pyodide – und das liegt
lokal.

Getestet mit Chrome/Edge und Firefox (jeweils aktuell). Safari ab Version 16.4.

```
app/shared/     gemeinsame Module (Krypto, Modell, Bewertung, Druck …)
app/pruefung/   Prüfungs-App der SuS
app/lehrer/     Erstellen und Korrigieren
beispiele/      Beispielarbeit
scripts/        Pyodide holen
```

Aufbau im Detail: [`BAUPLAN.md`](BAUPLAN.md), Abschnitt 13.

---

## Häufige Fragen

**Die Python-Aufgaben lassen sich nicht ausführen.**
Pyodide fehlt. Einmalig `scripts/pyodide-holen.sh` bzw. `.cmd` ausführen. Der
Reiter *Hilfe & Datenschutz* zeigt an, ob es gefunden wurde.

**„Die Verschlüsselung des Browsers ist nicht verfügbar."**
Die Seite wurde per Doppelklick geöffnet. Stattdessen `start.cmd` bzw.
`start.sh` verwenden und die `localhost`-Adresse aufrufen.

**Eine Abgabe lässt sich nicht öffnen.**
Entweder gehört sie zu einem anderen Schlüssel, oder die Datei wurde verändert.
Beides meldet die App im Klartext.

**Ich habe meine Passphrase vergessen.**
Dann sind die betroffenen Abgaben nicht mehr lesbar. Es gibt bewusst keine
Hintertür. Die Klasse muss die Arbeit wiederholen – deshalb: Passphrase sicher
notieren.

**Kann ich eine bestehende Arbeit wiederverwenden?**
Ja – in der Übersicht auf *Kopie* klicken, anpassen, neu ausgeben.

---

## Lizenz

Noch nicht festgelegt. Bis dahin gilt: Nutzung an der JJWS und im schulischen
Kontext ausdrücklich erwünscht, Rückfragen an den Autor.
