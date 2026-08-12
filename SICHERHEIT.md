# Sicherheit

Zwei Fragen werden hier beantwortet:

1. Was passiert, wenn Schülerinnen und Schüler dieses Repository finden?
2. Wie schützt man das Repository davor, dass jemand etwas verändert?

---

## 1. Ist es schlimm, wenn die Klasse das Repository findet?

**Nein.** Das Verfahren ist so gebaut, dass seine Sicherheit nicht davon
abhängt, dass der Quellcode geheim bleibt. Das ist ein alter Grundsatz der
Kryptographie (Kerckhoffs’ Prinzip): Sicher ist ein Verfahren, wenn allein der
Schlüssel geheim sein muss – nicht der Bauplan.

Konkret: Wer den kompletten Quellcode liest, gewinnt dadurch **keinen einzigen
Punkt**.

### Was im Repository liegt

| Inhalt | Im Repository | Warum unkritisch |
|--------|:-------------:|------------------|
| Programmcode beider Apps | ja | verrät nichts über konkrete Aufgaben |
| Beispiel-Klassenarbeit | ja | erfundene Aufgaben zum Ausprobieren |
| Deine echten Klassenarbeiten (`.jjwsm`) | **nein** | liegen nur in deinem Browser und als Datei bei dir |
| Dein privater Schlüssel (`.jjwskey`) | **nein** | durch `.gitignore` gesperrt |
| Abgaben der SuS (`.jjwsa`) | **nein** | durch `.gitignore` gesperrt |
| Namen, Punkte, Noten | **nein** | werden nie dauerhaft gespeichert |

Die `.gitignore` sperrt `*.jjwsm`, `*.jjwsa` und `*.jjwskey` ausdrücklich, damit
so etwas nicht aus Versehen hochgeladen wird.

### Was die Klasse aus dem Code lernen könnte – und was das bedeutet

**Sie erfährt, wie die automatische Korrektur arbeitet.** Bei den meisten
Aufgabentypen ist das folgenlos: Wer weiß, dass eine Kurzantwort mit einer
Lösungsliste verglichen wird, kennt die Lösung deswegen nicht.

Bei **zwei Typen** lohnt sich ein zweiter Blick:

- **Antwort mit Stichwörtern** (Typ 4). Die Prüfung sucht Schlüsselbegriffe im
  Antworttext. Wer das weiß, könnte statt eines Satzes eine Begriffsliste
  hinschreiben und trotzdem Punkte bekommen.
  *Gegenmittel:* Diesen Typ nur dort einsetzen, wo das in Ordnung ist, oder eine
  Höchstpunktzahl setzen. Für echte Argumentation den Typ **Freitext** nehmen –
  der wird von dir bewertet.
- **Aufzählung** (Typ 5). Gleiche Logik, aber hier ist das Nennen ja gerade die
  Aufgabe. Unkritisch.

Alles andere – Multiple Choice, Zuordnung, Lückentext, Rechnungen, Python- und
Web-Aufgaben – lässt sich durch Kenntnis des Codes nicht austricksen, weil die
Lösung schlicht nirgends in der ausgelieferten Datei steht.

### Was die Klasse **nicht** kann, auch mit dem Quellcode

- Die Lösungen aus der Prüfungsdatei lesen. Sie stehen dort nicht.
- Die eigene Abgabe nachträglich lesen oder ändern. Ohne den privaten Schlüssel
  geht das nicht, und jede Änderung macht die Datei unlesbar.
- Fremde Abgaben aus dem Tauschordner öffnen. Gleicher Grund.
- Sich selbst Punkte geben. In der Abgabedatei stehen keine Punkte, nur
  Antworten. Bewertet wird erst bei dir.

### Wenn du es trotzdem nicht öffentlich willst

Es spricht nichts dagegen, das Repository auf **privat** zu stellen. Die Apps
funktionieren identisch – sie werden ohnehin von einem Netzlaufwerk oder USB-
Stick gestartet, nicht von GitHub. Ein öffentliches Repository hat nur zwei
Vorteile: Du kannst Kolleginnen und Kollegen einfach den Link geben, und dem
schulischen Datenschutzbeauftragten lässt sich zeigen, dass wirklich keine
Daten abfließen.

---

## 2. Repository öffentlich, aber schreibgeschützt

### Was GitHub von sich aus schon macht

Bei einem **öffentlichen** Repository kann jede Person den Code lesen und
kopieren – aber **niemand kann hineinschreiben**, außer dir und Personen, die du
ausdrücklich als Mitarbeitende hinzufügst. Fremde können nur einen Fork anlegen
und einen Pull Request stellen; ob der übernommen wird, entscheidest allein du.

**Der von dir gewünschte Zustand ist also bereits der Normalfall.** Es gibt
nichts, was eine fremde Person tun könnte, ohne dass du zustimmst.

### Zusätzlich absichern – braucht man das?

Ehrlich: **nein, nicht zwingend.** Gegen Fremde schützt bereits die
Standardeinstellung. Ein Schreibschutz hilft nur gegen Unfälle von innen – durch
dich selbst oder durch ein Werkzeug, das in deinem Auftrag pusht.

Wenn du etwas einrichten möchtest, sind zwei Schalter sinnvoll und stören im
Alltag nicht. Unter **Settings → Rules → Rulesets → New branch ruleset**,
Enforcement **Active**, Target branches **Include default branch**:

- ✅ **Restrict deletions** – der Hauptzweig kann nicht gelöscht werden
- ✅ **Block force pushes** – die Historie kann nicht überschrieben werden

Diese beiden kosten nichts und verhindern genau die Fälle, in denen wirklich
Arbeit verloren gehen kann.

Bewusst **nicht** empfohlen für ein Ein-Personen-Projekt:

- ❌ **Require a pull request before merging** – danach kannst auch du keinen
  Tippfehler mehr direkt korrigieren; jede Änderung braucht einen Pull Request.
  Sinnvoll nur, wenn du jede Änderung vorher im Überblick sehen willst, etwa
  weil ein KI-Assistent in deinem Auftrag pusht.

Wichtig, falls du die PR-Pflicht doch setzt: Trage bei „Bypass list“
**niemanden** ein, auch dich selbst nicht – sonst greift die Regel bei deinen
eigenen Pushes nicht.

### Weitere Einstellungen, die sich lohnen

- **Settings → General → Features:** Issues und Wiki abschalten, wenn du keine
  Rückmeldungen von außen möchtest.
- **Settings → General → Pull Requests:** „Allow forking“ abschalten, wenn
  niemand eine Kopie anlegen können soll. (Verhindert nicht das Herunterladen –
  öffentlich ist öffentlich.)
- **Settings → Collaborators:** prüfen, dass dort nur Personen stehen, die
  wirklich schreiben dürfen.
- **Settings → Code security → Secret scanning:** einschalten. Schlägt Alarm,
  falls doch einmal ein Schlüssel im Code landet.

---

## 3. Was du selbst schützen musst

Zwei Dinge liegen außerhalb dessen, was Software absichern kann:

**Der private Schlüssel.** Er ist das Einzige, womit sich Abgaben öffnen lassen.
Geht er verloren, sind bereits geschriebene Arbeiten unwiderruflich unlesbar.
Deshalb: die `.jjwskey`-Datei zusätzlich außerhalb des Unterrichtsrechners
sichern (dienstliches Laufwerk, verschlüsselter USB-Stick) und die Passphrase
nicht danebenlegen.

**Der Tauschordner.** Er sollte so eingerichtet sein, dass die SuS Dateien
hineinlegen, aber keine fremden Dateien lesen oder löschen können (unter Windows:
Schreibrechte ohne Leserechte). Selbst wenn sie es könnten, wäre der Inhalt
verschlüsselt – aber löschen könnten sie fremde Abgaben eben doch. Diese
Einstellung macht die Schul-IT.

---

## 4. Eine Lücke ehrlich benannt

Bei HTML/CSS/**JavaScript**-Aufgaben laufen der Code der SuS und die Prüfung im
selben abgeschotteten Rahmen. Theoretisch könnte jemand JavaScript schreiben,
das sich als bestandener Test ausgibt. Die App durchsucht abgegebenen Code
deshalb nach verdächtigen Aufrufen (`postMessage`, `parent`, …) und warnt dich
bei der Korrektur.

Bei reinen HTML/CSS-Aufgaben besteht diese Lücke nicht: Dort sind Skripte im
Prüfrahmen vollständig abgeschaltet, und die Prüfung liest den fertigen Seiten-
aufbau von außen.

Python-Aufgaben sind ebenfalls nicht betroffen – dort läuft der Code in einer
WebAssembly-Sandbox, und bewertet wird ausschließlich bei dir.
