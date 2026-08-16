# Datenschutz

Diese Datei ist die Grundlage für das Gespräch mit dem schulischen
Datenschutzbeauftragten und für den Eintrag im Verzeichnis von
Verarbeitungstätigkeiten.

> **Kein Rechtsrat.** Die folgende Einordnung ist sorgfältig recherchiert,
> ersetzt aber keine rechtliche Beratung. Vor dem ersten Einsatz kurz mit der
> Schulleitung und dem Datenschutzbeauftragten abstimmen.

---

## 1. Kurzfassung

Es werden **Name, Vorname und Klasse** sowie die **Antworten** einer
Klassenarbeit verarbeitet – wahlweise auch nur eine **Prüfungsnummer** ohne
Namen.

Die Verarbeitung findet **ausschließlich lokal im Browser** statt. Es gibt
keinen Server, keinen Cloud-Dienst, keinen Auftragsverarbeiter und keine
Übermittlung in ein Drittland. Personenbezogene Daten werden **verschlüsselt**
in Dateien abgelegt, die nur die Lehrkraft öffnen kann.

Das ist zulässig.

---

## 2. Rechtsgrundlage

**Art. 6 Abs. 1 lit. e DSGVO** – Verarbeitung zur Wahrnehmung einer Aufgabe im
öffentlichen Interesse, in Verbindung mit:

- **§ 115 Schulgesetz Baden-Württemberg** – Schulen dürfen personenbezogene
  Daten verarbeiten, soweit dies zur Erfüllung ihres Bildungs- und
  Erziehungsauftrags erforderlich ist.
- **Verordnung des Kultusministeriums über die Verarbeitung
  personenbezogener Daten an Schulen** – konkretisiert Umfang und Grenzen.

Die Feststellung und Bewertung von Schülerleistungen ist Kernaufgabe der
Schule. Der Name auf einer Klassenarbeit ist dafür erforderlich und seit jeher
üblich; die digitale Form ändert daran nichts.

**Eine Einwilligung ist weder erforderlich noch geeignet.** Bei einer
Pflichtveranstaltung fehlt es an der Freiwilligkeit (Art. 7 Abs. 4 DSGVO), und
eine widerrufliche Einwilligung würde die Leistungsfeststellung unmöglich
machen.

---

## 3. Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO)

Verarbeitet wird nur, was zur Zuordnung und Bewertung nötig ist:

| Datum | Zweck | Pflicht |
|-------|-------|---------|
| Nachname, Vorname | Zuordnung der Arbeit zur Person | wahlweise |
| Klasse | Zuordnung zur Lerngruppe | ja |
| Prüfungsnummer | Zuordnung ohne Klarnamen | Alternative zum Namen |
| Antworten | Gegenstand der Bewertung | ja |
| Beginn, Abgabe, Dauer | Nachweis der Bearbeitungszeit, Nachteilsausgleich | ja |
| Erreichte Punkte, Note | Ergebnis der Bewertung | ja |

**Nicht erhoben** werden: Geburtsdatum, Adresse, Anschrift, E-Mail,
IP-Adressen, Gerätekennungen, Verhaltensdaten, Tastatureingabeprotokolle,
Bildschirmaufnahmen.

Pro Klassenarbeit lässt sich einstellen, ob **Name und Klasse** oder nur eine
**Prüfungsnummer** abgefragt wird. Die Nummernvariante ist die datensparsamste
Form: In den Dateien steht dann kein Klarname; die Zuordnung erfolgt über eine
Sitzplatzliste, die die Lehrkraft getrennt führt.

---

## 4. Technische und organisatorische Maßnahmen (Art. 32 DSGVO)

### Verschlüsselung

| Zweck | Verfahren |
|-------|-----------|
| Abgabe der SuS | ECDH auf Kurve P-256, HKDF-SHA256, **AES-256-GCM** |
| Privater Schlüssel der Lehrkraft | PBKDF2-HMAC-SHA256, **310 000 Runden**, AES-256-GCM |
| Integrität | AES-GCM authentifiziert Inhalt **und** Kopfdaten |

Für jede einzelne Abgabe wird ein flüchtiges Schlüsselpaar erzeugt; der
Sitzungsschlüssel existiert nur für diese eine Datei und wird nirgends
gespeichert. Verwendet wird ausschließlich die Web Crypto API des Browsers –
keine fremde Bibliothek.

### Vertraulichkeit

- SuS können weder die eigene noch fremde Abgaben entschlüsseln.
- Jede nachträgliche Änderung an einer Abgabedatei macht sie unlesbar; eine
  unbemerkte Manipulation ist ausgeschlossen.
- In der ausgelieferten Prüfungsdatei stehen keine Lösungen.
- Punkte und Noten stehen nicht in der Abgabedatei – sie entstehen erst bei der
  Lehrkraft.

### Keine Übermittlung von Inhalten

Beide Programme laden **keine externen Ressourcen**: keine Schriftarten von
Google, kein CDN, keine Analysewerkzeuge, keine Fehlerberichte. Die
Python-Laufzeit liegt jeweils direkt neben der App – beim Lehrkraft-Werkzeug
im lokalen Projektordner, bei der öffentlichen SuS-Website fest im
Veröffentlichungspaket. Das lässt sich in den Entwicklerwerkzeugen des
Browsers (Reiter „Netzwerk") jederzeit überprüfen – ein guter Nachweis
gegenüber dem Datenschutzbeauftragten.

Zur Einordnung der öffentlichen SuS-Website (GitHub Pages): Beim **Aufruf**
der Seite überträgt der Browser – wie bei jeder Website – technisch bedingt
die IP-Adresse des Schulrechners an den Seitenbetreiber (GitHub). Danach
arbeitet die App vollständig lokal: Namen, Antworten und die Abgabedatei
verlassen den Rechner nie in Richtung Internet, es gibt keine Formulare, die
irgendwohin senden. Wer auch den Seitenaufruf vermeiden möchte, nutzt die
lokale Reserve-Fassung der Prüfungs-App aus dem Projektordner.

### Speicherorte

| Daten | Wo | Wie lange |
|-------|-----|-----------|
| Klassenarbeiten mit Lösungen | Browser der Lehrkraft (`localStorage`) | bis zum Löschen |
| Privater Schlüssel | Browser der Lehrkraft, passphrasengeschützt | bis zum Löschen |
| Zwischenstand der SuS während der Arbeit | Browser des Schülerrechners (`localStorage`) | siehe Löschkonzept |
| Abgaben (verschlüsselt) | Tauschordner, danach beim Lehrergerät | siehe Löschkonzept |
| Entschlüsselte Abgaben, Punkte, Noten | **nur im Arbeitsspeicher** des Korrektur-Tabs | bis zum Schließen des Tabs |

Das Korrekturwerkzeug legt bewusst **keine** Schülerdaten dauerhaft ab. Wird
der Tab geschlossen, sind Namen, Antworten und Noten aus dem Rechner
verschwunden. Was aufbewahrt werden soll, wird ausdrücklich als PDF oder CSV
exportiert.

### Zugriffsschutz

- Der private Schlüssel ist durch eine Passphrase geschützt; nach dem Neuladen
  der Seite ist er wieder gesperrt.
- Der Tauschordner sollte so eingerichtet sein, dass SuS Dateien hineinlegen,
  aber keine fremden Dateien lesen oder löschen können (Schreibrecht ohne
  Leserecht). Diese Einstellung nimmt die Schul-IT vor.
- Das Lehrergerät ist ein dienstliches Gerät mit Bildschirmsperre und
  Festplattenverschlüsselung.

---

## 5. Löschkonzept

| Was | Wann löschen | Wie |
|-----|--------------|-----|
| Zwischenstand auf den Schülerrechnern | direkt nach der Arbeit | Browserdaten der Prüfungs-App löschen oder Benutzerprofil zurücksetzen |
| Abgabedateien im Tauschordner | nach dem Einlesen in die Korrektur | Ordner leeren |
| Abgabedateien beim Lehrergerät | nach Bekanntgabe der Noten und Ablauf der Einspruchsfrist | Dateien löschen |
| Korrigierte PDFs | nach Ablauf der schulischen Aufbewahrungsfrist für Klassenarbeiten | löschen bzw. vernichten |
| Punkte und Noten | Übertrag ins Notenverwaltungsprogramm, dort gelten dessen Fristen | – |
| Klassenarbeiten mit Lösungen | wenn nicht mehr gebraucht | im Reiter *Klassenarbeiten* löschen |

Die App bietet unter *Hilfe & Datenschutz* einen Knopf, der alle lokal
abgelegten Daten dieser Anwendung restlos entfernt.

**Wichtig zu den Schülerrechnern:** Der Zwischenstand liegt im `localStorage`
des dort verwendeten Browserprofils. Wenn die Rechner mit wiederherstellbaren
Profilen oder einem Gastmodus arbeiten, erledigt sich das automatisch. Sonst
gehört „Browserdaten löschen" zum Abschluss der Klassenarbeit dazu.

---

## 6. Betroffenenrechte

- **Auskunft (Art. 15):** Die korrigierte Arbeit als PDF enthält alle
  verarbeiteten Daten und kann ausgehändigt werden.
- **Berichtigung (Art. 16):** Punkte und Anmerkungen lassen sich im
  Korrekturwerkzeug jederzeit ändern und neu ausgeben.
- **Löschung (Art. 17):** eingeschränkt, solange die schulische
  Aufbewahrungspflicht besteht.
- **Widerspruch (Art. 21):** bei einer Pflichtaufgabe grundsätzlich nicht
  einschlägig.

Da keine Daten das Gerät verlassen, gibt es keinen Empfänger, über den Auskunft
zu erteilen wäre.

---

## 7. Keine automatisierte Entscheidung im Sinne des Art. 22

Die Software schlägt Punkte vor. Die **Note setzt die Lehrkraft**: Sie sieht
jede Einzelbewertung, kann jeden Punktwert überschreiben, bewertet Freitexte
selbst und gibt die Arbeit erst danach frei. Eine ausschließlich automatisierte
Entscheidung mit rechtlicher Wirkung liegt damit nicht vor.

Es kommt **keine KI** zum Einsatz. Die automatische Bewertung ist ein Abgleich
mit hinterlegten Lösungen und das Ausführen hinterlegter Testfälle – beides
nachvollziehbar und im PDF Schritt für Schritt dokumentiert.

---

## 8. Vorlage für das Verzeichnis von Verarbeitungstätigkeiten

```
Bezeichnung der Verarbeitung
  Durchführung und Bewertung digitaler Klassenarbeiten

Verantwortlicher
  Johann-Jakob-Widmann-Schule Heilbronn, vertreten durch die Schulleitung

Zweck
  Feststellung und Bewertung von Schülerleistungen (§ 115 SchG BW)

Rechtsgrundlage
  Art. 6 Abs. 1 lit. e DSGVO i. V. m. § 115 SchG BW und der
  Datenschutzverordnung Schulen des Kultusministeriums BW

Kategorien betroffener Personen
  Schülerinnen und Schüler der unterrichteten Lerngruppen

Kategorien personenbezogener Daten
  Name, Vorname, Klasse (wahlweise nur Prüfungsnummer);
  Antworten der Klassenarbeit; Bearbeitungszeit; erreichte Punkte; Note

Empfänger
  keine. Die Verarbeitung erfolgt ausschließlich lokal auf schulischen
  Endgeräten. Keine Auftragsverarbeitung, keine Übermittlung an Dritte.

Übermittlung an Drittländer
  findet nicht statt

Löschfristen
  siehe Löschkonzept, Abschnitt 5 der Datei DATENSCHUTZ.md

Technische und organisatorische Maßnahmen
  Verschlüsselung der Abgaben (ECDH P-256, AES-256-GCM);
  passphrasengeschützter privater Schlüssel (PBKDF2, 310 000 Runden);
  keine Netzwerkverbindung der Anwendung;
  keine dauerhafte Speicherung von Schülerdaten im Korrekturwerkzeug;
  Zugriffsschutz auf Lehrergerät und Tauschordner
```

---

## 9. Vor dem ersten Einsatz

- [ ] Kurze Abstimmung mit Schulleitung und Datenschutzbeauftragtem
- [ ] Eintrag im Verzeichnis von Verarbeitungstätigkeiten (Vorlage oben)
- [ ] Tauschordner einrichten: Schreibrecht ohne Leserecht für die SuS
- [ ] Löschroutine für die Schülerrechner festlegen
- [ ] Privaten Schlüssel sichern, Passphrase getrennt verwahren
- [ ] Klasse informieren: was gespeichert wird und dass nichts das Gerät
      verlässt (gehört zur Transparenzpflicht nach Art. 13 DSGVO)
