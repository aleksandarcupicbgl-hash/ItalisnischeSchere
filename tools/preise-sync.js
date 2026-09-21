#!/usr/bin/env node
/* ===========================================================================
   Schreibt die Preise aus daten/preise.json in index.html.

       node tools/preise-sync.js

   Warum: Die Seite liest die JSON zur Laufzeit, damit eine Änderung sofort
   wirkt. Suchmaschinen und Besucher ohne JavaScript sehen aber nur das, was
   im HTML steht — deshalb liegt dort dieselbe Liste als erzeugte Fassung.
   Dieses Skript hält beide Seiten gleich.
   =========================================================================== */
const fs = require("fs");
const path = require("path");

const wurzel = path.resolve(__dirname, "..");
const daten = JSON.parse(fs.readFileSync(path.join(wurzel, "daten/preise.json"), "utf8"));
const htmlPfad = path.join(wurzel, "index.html");

const START = "<!-- PREISE:START";
const ENDE = "<!-- PREISE:END -->";

const schuetzen = (wert) =>
  String(wert).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const w = daten.waehrung || "€";

const zeilen = daten.leistungen
  .map(
    (l) =>
      `        <li class="price-row">\n` +
      `          <span class="price-name">${schuetzen(l.name)}</span>\n` +
      `          <span class="price-dots" aria-hidden="true"></span>\n` +
      `          <span class="price-value">${schuetzen(l.preis)} ${w}</span>\n` +
      `        </li>`,
  )
  .join("\n");

const enthalten = (daten.komplettpaket.enthalten || [])
  .map((e) => `          <li>${schuetzen(e)}</li>`)
  .join("\n");

const block =
  `${START} — erzeugt aus daten/preise.json (node tools/preise-sync.js). Nicht von Hand ändern. -->\n` +
  `      <ul class="price-list">\n${zeilen}\n      </ul>\n\n` +
  `      <aside class="package">\n` +
  `        <h3 class="package-title">${schuetzen(daten.komplettpaket.titel)}</h3>\n` +
  `        <strong class="package-price">${schuetzen(daten.komplettpaket.preis)} ${w}</strong>\n` +
  `        <ul class="package-list">\n${enthalten}\n        </ul>\n` +
  `        <p class="package-hint">Ohne Termin &ndash; einfach vorbeikommen.</p>\n` +
  `      </aside>\n` +
  `      ${ENDE}`;

const html = fs.readFileSync(htmlPfad, "utf8");
const von = html.indexOf(START);
const bis = html.indexOf(ENDE);
if (von === -1 || bis === -1) {
  console.error("Markierungen PREISE:START / PREISE:END fehlen in index.html.");
  process.exit(1);
}

const neu = html.slice(0, von) + block + html.slice(bis + ENDE.length);
if (neu === html) {
  console.log("index.html war bereits aktuell.");
} else {
  fs.writeFileSync(htmlPfad, neu);
  console.log(`index.html aktualisiert: ${daten.leistungen.length} Leistungen, Komplettpaket ${daten.komplettpaket.preis} ${w}.`);
}
