# Italienische Schere – Logo & Hero-Intro

![Logo](preview/logo.png)

Dieses Repository war leer – es gab kein vorab ausgewähltes Konzept. Deshalb ist hier
**ein** Konzept angelegt und konsequent animationsfertig gebaut: eine feine Linien-Schere,
die auf einer waagerechten Schnittlinie schliesst, darunter der Schriftzug, aussen ein
doppelter Rahmen. Text, Farben und Proportionen lassen sich austauschen, ohne die
Animationslogik anzufassen.

| Datei | Inhalt |
| --- | --- |
| `logo.svg` | Statisches Logo, animationsfreundlich aufgebaut |
| `animation.html` | Hero-Intro (max. 3 s) + dezente Hover-Variante für den Header |
| `preview/logo.png` | Vorschaubild |

---

## 1. Aufbau des SVG

Alles liegt im viewBox-Koordinatensystem `0 0 640 400`.

```
#logo-background                Flaeche (kann entfernt werden)
#logo-frame                     Rahmen
  #frame-outer                  aeussere Linie   – Stroke-Pfad, pathLength="100"
  #frame-inner                  innere Linie     – Stroke-Pfad, pathLength="100"
  #frame-rule                   Schnittlinie     – Stroke-Pfad, pathLength="100"
#logo-wordmark                  Schriftzug
  #wordmark-eyebrow             "COIFFEUR"
  #wordmark-line-1              "ITALIENISCHE"
  #wordmark-line-2              "SCHERE"
#logo-scissors                  Schere
  #blade-bottom                 untere Klinge + oberer Griffring (eine starre Haelfte)
  #blade-top                    obere  Klinge + unterer Griffring (eine starre Haelfte)
  #scissors-screw               Schraube = Drehpunkt
```

### Drehpunkt

Die Schraube liegt auf **430 / 161**. Beide Klingengruppen liegen bewusst *ohne*
transformierte Elterngruppe direkt im viewBox-System, damit der Drehpunkt exakt sitzt:

```css
#blade-top, #blade-bottom{
  transform-box: view-box;
  transform-origin: 430px 161px;   /* Schraube */
}
#blade-top    { transform: rotate(-11deg); }  /* oeffnen  */
#blade-bottom { transform: rotate( 11deg); }
```

Sinnvoller Bereich: `0deg` (geschlossen, auf der Schnittlinie) bis ca. `12deg`.
Der Uebergang von Klinge zu Griff liegt unter der Schraubenscheibe – beim Oeffnen
bleibt die Mechanik dadurch sauber verdeckt.

> **Wichtig beim Wiederverwenden:** `transform-origin` ist immer der Drehpunkt in den
> *eigenen* Nutzerkoordinaten des Elements. Wer einen Ausschnitt mit verschobener
> viewBox nutzt (z. B. nur die Schere), verschiebt die Geometrie besser in ein
> 0-basiertes System – so gemacht bei der kleinen Header-Marke in `animation.html`.
> Die Schere als Ganzes bewegt man über das `<svg>`-Element oder eine Huellgruppe;
> der Drehpunkt der Klingen bleibt davon unberuehrt.

### Nachzeichnen

Rahmen und Schnittlinie sind reine Stroke-Pfade mit `pathLength="100"`:

```css
#frame-outer{ stroke-dasharray:100; stroke-dashoffset:100; }  /* -> 0 zeichnet */
```

Die Klingen sind geschlossene Kontur-Pfade (Stroke + 8 % Flaeche) und lassen sich
ebenso mit `stroke-dasharray` nachzeichnen.

### Farben

Drei Custom Properties, dadurch ist die Invers-Variante ein Einzeiler:

```css
svg{ --ink:#1D1814; --paper:#F6EFE3; --accent:#A97E4B; }   /* hell   */
svg{ --ink:#F2E8D8; --paper:#141110; --accent:#C09A5E; }   /* dunkel */
```

`--paper` ist zugleich die Fuellung der Schraubenscheibe und muss dem Untergrund
entsprechen.

### Schrift

Der Schriftzug ist `<text>` in einem Serifen-Stack (Cormorant Garamond → Didot →
Georgia). **Für die Produktion in Pfade konvertieren**, damit die Marke unabhängig von
installierten Schriften ist. `COIFFEUR` ist ein Platzhalter und frei ersetzbar.

---

## 2. Hero-Intro (`animation.html`)

Einfach im Browser oeffnen – die Datei ist eigenstaendig, ohne Build und ohne
Framework. Nur ein optionaler Google-Fonts-Link; faellt er aus, greift der
Serifen-Fallback.

### Ablauf (gesamt 2,8 s)

| ab | Dauer | Was passiert |
| --- | --- | --- |
| 0,06 s | 1,34 s | Die Schere faehrt von links ins Bild und schnippt dabei 4× (Klingen auf/zu). Hinter der Schraube waechst die Schnittspur ueber das cremefarbene Papier. |
| 1,30 s | 0,95 s | Die Haelften gleiten entlang der Schnittlinie auseinander und blenden aus – das Logo wird frei. |
| 1,42 s | 0,98 s | Rahmen und Schnittlinie zeichnen sich nach (`stroke-dashoffset`). |
| 1,50 s | 1,08 s | Die Schere kommt von rechts zurueck und setzt sich an ihre Position im Logo (leichte Restrotation). |
| 1,84 s | 0,82 s | Schriftzug blendet zeilenweise auf. |
| 2,34 s | 0,44 s | Ein letztes, leises Schnippen beim Absetzen. |

Weiche Kurven durchgehend: `easeInOutSine` fuer die Fahrt, `easeOutQuint` fuer das
Absetzen, `easeOutCubic` fuer Papier, Rahmen und Schrift. Ein Schnipp oeffnet ruhig
und schliesst beschleunigt.

Solange die Schere ueber dem Papier liegt, zeichnet sie in Papier-Tinte; mit dem
Freigeben des Logos wechselt sie weich auf die Logo-Farbe.

### Technik

* Reines CSS/JS, keine Bibliothek. Eine kleine rAF-Timeline (`render(t)`) setzt alle
  Werte pro Frame – dadurch laufen Fahrt, Schnippen und Schnittspur garantiert synchron.
* Die Schere liegt als eigene SVG-Ebene deckungsgleich ueber dem Logo und wird als
  HTML-Element bewegt; innerhalb des SVG rotieren nur die Klingen.
* Das Papier ist ein fixes Overlay aus zwei Haelften; die Schnitthoehe (`--cut`) wird
  aus der Position der Klingenebene (viewBox-y = 161) berechnet und bei `resize`
  aktualisiert.

### Verhalten

* **Einmal pro Besuch** – gemerkt in `sessionStorage` (`is-intro`).
* **Ueberspringen** – Button, Klick aufs Papier oder `Esc`; springt nicht hart, sondern
  spult die Timeline in 0,36 s ans Ende.
* **`prefers-reduced-motion: reduce`** – das Logo erscheint sofort statisch, das Papier
  wird gar nicht erst angezeigt, das Hover-Schnippen ist deaktiviert.
* **Ohne JavaScript** – `<noscript>` zeigt das fertige Logo.
* **Hover im Header** – die kleine Marke schnippt einmal kurz (reines CSS, auch bei
  Tastaturfokus).
* Fuer Integration und QA: `window.HeroIntro.play() / .skip() / .finish() / .render(t)`.

Der Hinweis „Hover ueber das Logo“ rechts im Header ist reine Demo-Beschriftung
(`.hint`) und fliegt beim Einbau raus.

### Einbau in eine Seite

1. `#logo-frame` und `#logo-wordmark` als `.logo-art`, `#logo-scissors` als
   `.scissors-art` uebernehmen – beide mit derselben viewBox, deckungsgleich positioniert.
2. Papier-Overlay, Styles und das Script uebernehmen.
3. Farben ueber `--ink` / `--paper` / `--accent` an die Seite anpassen.
