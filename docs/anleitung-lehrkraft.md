# Anleitung für die Lehrkraft

---

## Einmalig: Schlüssel anlegen

Reiter **Schlüssel → Schlüsselpaar erzeugen**. Bezeichnung und Passphrase
eintragen, die Schlüsseldatei wird heruntergeladen.

> **Das Wichtigste zuerst:** Sichere die `.jjwskey`-Datei zusätzlich außerhalb
> dieses Rechners – dienstliches Laufwerk oder verschlüsselter USB-Stick. Und
> notiere die Passphrase an einem sicheren Ort, aber **nicht daneben**.
> Ohne beides sind bereits geschriebene Arbeiten unwiderruflich unlesbar. Es
> gibt keine Hintertür.

Der Schlüssel bleibt in diesem Browser gespeichert, aber nach jedem Neuladen
gesperrt. Zum Korrigieren einmal die Passphrase eingeben.

---

## Eine Klassenarbeit bauen

### Kopfdaten

Titel, Fach, Klasse, Thema, Datum, Bearbeitungszeit. Zwei Einstellungen lohnen
einen zweiten Blick:

- **Die SuS geben an:** *Name, Vorname und Klasse* oder nur eine
  *Prüfungsnummer*. Die Nummernvariante ist datensparsamer – dann steht in den
  Dateien kein Klarname und du ordnest über deine Sitzplatzliste zu.
- **Aufgabenreihenfolge je Person mischen** (voreingestellt an): Jede Person
  bekommt eine andere Reihenfolge, auch bei den Antwortmöglichkeiten. Abschnitte
  bleiben zusammen.

### Ausgangssituation

Klappe **Ausgangssituation** auf und wähle eine der zehn Vorlagen. Damit
passiert dreierlei:

1. Der Text der Situation wird übernommen.
2. Jede Aufgabe bekommt automatisch einen **Anschlusssatz**, der sie an die
   Situation zurückbindet.
3. Der Anschluss richtet sich nach dem **Handlungsschritt** der Aufgabe
   (informieren, planen, entscheiden, durchführen, kontrollieren, reflektieren).

Pro Aufgabe kannst du den Handlungsschritt umstellen oder den Anschlusstext frei
überschreiben. Für eine eigene Situation die Karte **Eigene Ausgangssituation
schreiben** wählen.

### Aufgaben anlegen

Unten stehen die Aufgabentypen nach Gruppen sortiert. Ein Klick legt die Aufgabe
an; sie erscheint aufklappbar in der Liste. Pfeile verschieben, ⧉ dupliziert,
✕ löscht.

**Kurztitel** erscheint in der Aufgabenübersicht auf dem Deckblatt.
**Abschnittsüberschrift** fasst mehrere Aufgaben zusammen (blaue Überschrift im
Ausdruck) – gleiche Überschrift = gleicher Abschnitt.

In der Aufgabenstellung sind vier Auszeichnungen möglich:
`**fett**`, `*kursiv*`, `` `code` ``, Aufzählung mit `- ` am Zeilenanfang.

#### Hinweise zu einzelnen Typen

| Typ | Worauf achten |
|-----|---------------|
| **Multiple Choice** | Haken = richtige Antwort. Bei Mehrfachauswahl mit Teilpunkten zieht jede falsche Marke ab. |
| **Aussagenraster** | Erst die Spalten festlegen (z. B. „Geldstrom“ / „Güterstrom“), dann die Aussagen mit ihrer Lösung. |
| **Kurzantwort** | Mehrere zulässige Lösungen anlegen. „Einen Tippfehler verzeihen“ hilft bei Fachbegriffen. |
| **Antwort mit Stichwörtern** | Varianten mit `\|` trennen. Sparsam einsetzen: Wer weiß, wie es funktioniert, kann eine Begriffsliste schreiben statt eines Satzes. Für echte Argumentation lieber *Freitext*. |
| **Aufzählung** | Mehr Lösungsgruppen hinterlegen als es Felder gibt – dann zählt jede sinnvolle Nennung. |
| **Zuordnung** | Links Begriff, rechts das Passende. Die App mischt beide Spalten. |
| **Reihenfolge** | Elemente in der **richtigen** Reihenfolge eintragen; den SuS werden sie gemischt gezeigt. |
| **Lückentext** | `[[Lösung]]`, Alternativen mit `\|`: `[[for\|for-Schleife]]`. |
| **Zahlenwert / Rechnung** | Toleranz nicht vergessen. Komma und Punkt sind gleichwertig, Einheiten werden ignoriert. |
| **Python** | Startcode vorgeben, Musterlösung fürs Lösungsblatt, Testfälle für die Punkte. Ein bis zwei **Selbsttests** helfen den SuS beim Einstieg. |
| **Parsons** | Zeilen in richtiger Reihenfolge mit Einrückungstiefe. Ablenkerzeilen machen es anspruchsvoller. |
| **HTML/CSS/JS** | Prüfungen auf Selektor, Text, Attribut, berechneten Stil. Farben als `rgb(0, 52, 77)` angeben – so liefert sie der Browser. |
| **Freitext** | Kriterienraster anlegen: bei der Korrektur setzt du dann nur noch Haken. |

### Notenschlüssel

Voreingestellt ist der lineare Schlüssel (Lehrerfreund-Standard):
`Note = 6 − 5 · Punkteanteil`, Zehntelnoten, Note 4 bei 40 %.

Verschiebbar sind die beiden Ankerpunkte („Note 1,0 ab … %“ und „Note 6,0
bei … %“). Alternativ IHK- oder KMK-Stufenschlüssel mit frei änderbaren
Schwellen. Die **Punkte-Noten-Tabelle** darunter rechnet live mit.

### Prüfen und ausgeben

Ganz unten steht, was noch fehlt. Vier Knöpfe:

- **Vorschau wie bei den SuS** – zum Durchklicken
- **Angabe drucken (PDF)** – die leere Arbeit auf Papier
- **Lösungsblatt drucken (PDF)** – mit Lösungen und Erwartungshorizont
- **Datei für die Klasse erzeugen** – die `.jjwsp` für den Tauschordner

Der Master mit den Lösungen bleibt im Browser; **Master sichern** legt ihn
zusätzlich als Datei ab (empfehlenswert vor jedem Schuljahreswechsel).

---

## Am Tag der Klassenarbeit

**Vorbereitung**

1. Die `.jjwsp`-Datei in den Tauschordner legen. Sie enthält keine Lösungen.
2. Prüfen, ob die Prüfungs-App auf einem Schülerrechner startet.
3. Die Datei zusätzlich auf einen USB-Stick – falls das Laufwerk klemmt.

**Tipp zum Verteilen:** Legt man die Datei als `klassenarbeit.jjwsp` direkt
neben `app/pruefung/index.html`, findet die App sie beim Öffnen von selbst.

**Während der Arbeit**

- Die SuS können jederzeit zwischen Aufgaben springen; alles wird laufend
  gespeichert.
- Nach einem Absturz: Seite neu laden, Datei erneut öffnen, „Ja, ich bin …“
  bestätigen.
- Bei Programmieraufgaben darf ausgeführt und getestet werden – die Selbsttests
  zählen nicht.

**Abgabe**

Jede Person lädt eine `.jjwsa`-Datei herunter und legt sie im Tauschordner ab.
Kontrolliere, dass alle Dateien angekommen sind, bevor jemand geht.

---

## Korrigieren

1. Reiter **Korrektur**, Klassenarbeit auswählen.
2. Passphrase eingeben, wenn danach gefragt wird.
3. Alle Abgaben aus dem Tauschordner markieren und in das Feld ziehen.

Die Bewertung läuft sofort – auch Python- und Web-Testfälle. Danach:

- Links die Liste aller Abgaben mit Note; „2 offen“ heißt: da wartet noch etwas
  auf dich.
- Rechts jede Aufgabe einzeln mit Antwort, Prüfliste und Punkten. Jeden
  Punktwert kannst du überschreiben, jede Aufgabe kommentieren.
- Bei **Freitext** setzt du Haken im Kriterienraster – die Punkte rechnen sich
  von selbst.
- Das Feld **Rückmeldung** erscheint am Ende der korrigierten Arbeit.

### Ausgeben

| Knopf | Ergebnis |
|-------|----------|
| Korrigierte Arbeit als PDF | die vollständige Arbeit dieser Person mit Antworten, Punkten und Note |
| Notenliste anzeigen | Übersicht aller Abgaben mit Punkten je Aufgabe |
| Notenliste drucken (PDF) | dieselbe Liste mit Statistik und Notenschlüssel |
| CSV für Excel | Semikolon-getrennt, direkt für die Notenverwaltung |
| Alle Arbeiten als PDF | öffnet nacheinander alle korrigierten Arbeiten zum Drucken |

Im Druckdialog **„Als PDF speichern"** wählen, Ränder auf Standard, Skalierung
100 %. Nichts wird hochgeladen.

> **Zum Schließen:** Die entschlüsselten Abgaben liegen nur im Arbeitsspeicher
> dieses Tabs. Schließt du ihn, sind Namen, Antworten und Noten weg. Exportiere
> also vorher, was du behalten willst.

---

## Wenn etwas klemmt

| Problem | Ursache und Abhilfe |
|---------|---------------------|
| „Die Verschlüsselung des Browsers ist nicht verfügbar" | Seite per Doppelklick geöffnet. `start.cmd` bzw. `start.sh` benutzen. |
| Python-Aufgaben lassen sich nicht prüfen | Pyodide fehlt. Einmalig `scripts/pyodide-holen.sh` bzw. `.cmd`. Der Reiter *Hilfe* zeigt den Zustand. |
| „gehört zu einer anderen Arbeit" | Die Abgabe stammt aus einer anderen Klassenarbeit. Richtige Arbeit auswählen. |
| „Abgabe konnte nicht entschlüsselt werden" | Falscher Schlüssel oder die Datei wurde verändert. Bei Verdacht: Rücksprache mit der Person. |
| Eine Person taucht doppelt auf | Es wurde zweimal abgegeben. Die App lädt nur die erste Datei; die zweite von Hand prüfen. |
| Der Browser meldet, der Speicher sei voll | Alte Klassenarbeiten als Master sichern und im Browser löschen. |

---

## Klassenarbeiten am Handy vorbereiten

Beide Apps sind bis zu sehr schmalen Bildschirmen bedienbar. Am Handy gut
machbar: Kopfdaten, Ausgangssituation, Multiple Choice, Kurzantworten,
Aufzählungen, Notenschlüssel.

Weniger komfortabel: längere Python-Testfälle und HTML-Aufgaben – dafür lohnt
sich die Tastatur. Der Zwischenstand liegt im Browser des jeweiligen Geräts;
zum Wechseln des Geräts den Master als Datei sichern und dort wieder laden.
