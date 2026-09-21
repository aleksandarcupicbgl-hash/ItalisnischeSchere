/* ===========================================================================
   Barber Italienische Schere — Seitenlogik
   Reines JS, keine Bibliothek. Ohne JavaScript bleibt die Seite vollständig
   lesbar: Es gibt dann kein Intro, keine Slideshow-Wechsel und keine Karte,
   aber alle Inhalte stehen im HTML.
   =========================================================================== */
(function () {
  "use strict";

  var wurzel = document.documentElement;
  var wenigerBewegung = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =========================================================================
     ÖFFNUNGSZEITEN
     TODO: Zeiten bestätigen (übernommen vom Preisplakat des Ladens).
     Diese Werte steuern die Live-Anzeige im Hero. Ändern sie sich, müssen sie
     auch im HTML (Hero-Infoblock, Abschnitt „Anfahrt") und in den
     strukturierten Daten im <head> angepasst werden.
     0 = Sonntag … 6 = Samstag. Mehrere Spannen pro Tag sind möglich.
     ========================================================================= */
  var OEFFNUNGSZEITEN = {
    0: [],
    1: [["09:00", "19:00"]],
    2: [["09:00", "19:00"]],
    3: [["09:00", "19:00"]],
    4: [["09:00", "19:00"]],
    5: [["09:00", "19:00"]],
    6: [["09:00", "16:00"]]
  };

  /** TODO: Adresse bestätigen — steuert nur die Karte. */
  var KARTEN_ADRESSE = "Poststraße 12, 83404 Bad Reichenhall";

  var TAGE_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  /* =========================================================================
     Hilfen
     ========================================================================= */
  function inMinuten(uhrzeit) {
    var teile = uhrzeit.split(":");
    return parseInt(teile[0], 10) * 60 + parseInt(teile[1], 10);
  }

  /** Jetzt-Zeit in deutscher Ortszeit — unabhängig davon, wo der Besucher ist. */
  function jetztInDeutschland() {
    var formatierer = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    var teile = {};
    formatierer.formatToParts(new Date()).forEach(function (t) { teile[t.type] = t.value; });
    var wochentage = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      tag: wochentage[teile.weekday],
      minuten: parseInt(teile.hour, 10) * 60 + parseInt(teile.minute, 10)
    };
  }

  var easeOutQuint = function (t) { return 1 - Math.pow(1 - t, 5); };
  var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeInQuad = function (t) { return t * t; };

  /* =========================================================================
     1. Live-Status „JETZT GEÖFFNET" / „GESCHLOSSEN"
     ========================================================================= */
  function statusSetzen() {
    var anzeige = document.getElementById("status");
    if (!anzeige) return;
    var text = anzeige.querySelector(".status-text");
    var jetzt = jetztInDeutschland();
    var heute = OEFFNUNGSZEITEN[jetzt.tag] || [];
    var offen = false;
    var schliesstUm = null;

    for (var i = 0; i < heute.length; i++) {
      var von = inMinuten(heute[i][0]);
      var bis = inMinuten(heute[i][1]);
      if (jetzt.minuten >= von && jetzt.minuten < bis) {
        offen = true;
        schliesstUm = heute[i][1];
        break;
      }
    }

    if (offen) {
      anzeige.setAttribute("data-state", "offen");
      text.textContent = "Jetzt geöffnet · bis " + schliesstUm;
      return;
    }

    /* Nächste Öffnung suchen — heute später oder an einem der nächsten Tage. */
    var naechste = null;
    for (var v = 0; v < heute.length; v++) {
      if (inMinuten(heute[v][0]) > jetzt.minuten) { naechste = { tag: jetzt.tag, zeit: heute[v][0], heute: true }; break; }
    }
    if (!naechste) {
      for (var d = 1; d <= 7 && !naechste; d++) {
        var tag = (jetzt.tag + d) % 7;
        var spannen = OEFFNUNGSZEITEN[tag] || [];
        if (spannen.length) naechste = { tag: tag, zeit: spannen[0][0], heute: false };
      }
    }

    anzeige.setAttribute("data-state", "zu");
    text.textContent = naechste
      ? "Geschlossen · öffnet " + (naechste.heute ? "" : TAGE_KURZ[naechste.tag] + " ") + naechste.zeit
      : "Geschlossen";
  }

  /* =========================================================================
     2. Logo-Auftritt — die Schere fährt schnippend an ihren Platz,
        danach zeichnet sich der Rahmen und der Schriftzug blendet auf.
        Dieselbe Mechanik wie in animation.html: Drehpunkt ist die Schraube
        bei 430/161, gedreht wird über das transform-Attribut.
     ========================================================================= */
  var LOGO = {
    fahrt: [0.00, 0.95],
    rahmen: [0.55, 0.85],
    linie: [0.70, 0.70],
    innen: [0.80, 0.60],
    w0: [0.95, 0.50],
    w1: [1.05, 0.55],
    w2: [1.15, 0.60]
  };
  var LOGO_GESAMT = 1.8;
  var START_X = -560;
  var SCHNIPPE = 2;
  var WINKEL = 10;

  function schnipp(p, n) {
    var phase = (p * n) % 1;
    var auf = 0.58;
    return phase < auf
      ? easeOutCubic(phase / auf)
      : 1 - easeInQuad((phase - auf) / (1 - auf));
  }

  function logoAuftritt() {
    var logo = document.getElementById("hero-logo");
    if (!logo) return;
    var svg = logo.querySelector("svg");
    if (!svg) return;

    var schere = svg.querySelector("#logo-scissors");
    var oben = svg.querySelector("#blade-top");
    var unten = svg.querySelector("#blade-bottom");
    var rahmen = svg.querySelector("#frame-outer");
    var innen = svg.querySelector("#frame-inner");
    var linie = svg.querySelector("#frame-rule");
    var texte = [
      svg.querySelector("#wordmark-eyebrow"),
      svg.querySelector("#wordmark-line-1"),
      svg.querySelector("#wordmark-line-2")
    ];

    function abschnitt(t, spanne, ease) {
      if (t <= spanne[0]) return null;
      return (ease || easeOutCubic)(Math.min(1, (t - spanne[0]) / spanne[1]));
    }
    function strich(el, p) {
      if (el) el.style.strokeDashoffset = (100 * (1 - p)).toFixed(2);
    }
    function klingen(winkel) {
      if (oben) oben.setAttribute("transform", "rotate(" + (-winkel).toFixed(2) + ",430,161)");
      if (unten) unten.setAttribute("transform", "rotate(" + winkel.toFixed(2) + ",430,161)");
    }

    function zeichne(t) {
      var p = abschnitt(t, LOGO.fahrt, easeOutQuint);
      if (p !== null && schere) {
        schere.setAttribute("transform", "translate(" + (START_X * (1 - p)).toFixed(1) + ",0)");
      }
      if (t > LOGO.fahrt[0]) {
        var u = Math.min(1, (t - LOGO.fahrt[0]) / LOGO.fahrt[1]);
        klingen(WINKEL * schnipp(u, SCHNIPPE));
      }
      if ((p = abschnitt(t, LOGO.rahmen)) !== null) strich(rahmen, p);
      if ((p = abschnitt(t, LOGO.innen)) !== null) strich(innen, p);
      if ((p = abschnitt(t, LOGO.linie)) !== null) strich(linie, p);
      [LOGO.w0, LOGO.w1, LOGO.w2].forEach(function (spanne, i) {
        var q = abschnitt(t, spanne);
        if (q !== null && texte[i]) {
          texte[i].style.opacity = q.toFixed(3);
          texte[i].style.transform = "translateY(" + ((1 - q) * 8).toFixed(2) + "px)";
        }
      });
    }

    /* Ausgangszustand */
    [rahmen, innen, linie].forEach(function (el) {
      if (el) { el.style.strokeDasharray = "100"; el.style.strokeDashoffset = "100"; }
    });
    texte.forEach(function (el) { if (el) el.style.opacity = "0"; });

    if (wenigerBewegung) { zeichne(LOGO_GESAMT); return; }

    if (schere) schere.setAttribute("transform", "translate(" + START_X + ",0)");
    klingen(0);

    var start = null;
    function takt(zeit) {
      if (start === null) start = zeit;
      var t = (zeit - start) / 1000;
      if (t >= LOGO_GESAMT) { zeichne(LOGO_GESAMT); return; }
      zeichne(t);
      requestAnimationFrame(takt);
    }
    requestAnimationFrame(takt);
  }

  /* =========================================================================
     3. Intro — einmal pro Sitzung, per Klick überspringbar.
        Ob es überhaupt läuft, entscheidet das Inline-Skript im <head>
        (Klasse „intro-an"), damit der Hero vorher nicht kurz aufblitzt.
     ========================================================================= */
  function intro() {
    var kasten = document.getElementById("intro");
    var laeuft = wurzel.classList.contains("intro-an");

    if (!kasten || !laeuft) {
      if (kasten) kasten.remove();
      logoAuftritt();
      return;
    }

    var beendet = false;
    function beenden() {
      if (beendet) return;
      beendet = true;
      kasten.classList.add("is-going");
      window.setTimeout(function () { kasten.remove(); }, 900);
      logoAuftritt();
    }

    requestAnimationFrame(function () { kasten.classList.add("is-lit"); });
    var uhr = window.setTimeout(beenden, 2300);
    kasten.addEventListener("click", function () { window.clearTimeout(uhr); beenden(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        window.clearTimeout(uhr);
        beenden();
      }
    });
  }

  /* =========================================================================
     4. Slideshow
     ========================================================================= */
  function slideshow() {
    var folien = Array.prototype.slice.call(document.querySelectorAll(".slide"));
    if (folien.length < 2) return;
    var aktuell = 0;

    /* Die Bilder 2–4 liegen im sichtbaren Bereich; „lazy" würde sie trotzdem
       sofort laden und das erste Bild ausbremsen. Deshalb hängen sie an
       data-src und kommen erst, wenn die Seite steht. */
    function nachladen() {
      var offene = document.querySelectorAll(".slide img[data-src]");
      Array.prototype.forEach.call(offene, function (bild) {
        if (bild.dataset.srcset) bild.srcset = bild.dataset.srcset;
        bild.src = bild.dataset.src;
        bild.removeAttribute("data-src");
        bild.removeAttribute("data-srcset");
      });
    }
    if (document.readyState === "complete") {
      window.setTimeout(nachladen, 400);
    } else {
      window.addEventListener("load", function () { window.setTimeout(nachladen, 400); });
    }

    function zoomAnstossen(folie) {
      var bild = folie.querySelector("img");
      if (!bild || wenigerBewegung) return;
      bild.style.transition = "none";
      bild.style.transform = "scale(1.06)";
      void bild.offsetWidth;            // Umbruch erzwingen
      bild.style.transition = "";
      bild.style.transform = "";
    }

    zoomAnstossen(folien[0]);

    if (wenigerBewegung) return;        // Kein automatischer Wechsel

    window.setInterval(function () {
      if (document.hidden) return;
      nachladen();
      folien[aktuell].classList.remove("is-active");
      aktuell = (aktuell + 1) % folien.length;
      zoomAnstossen(folien[aktuell]);
      folien[aktuell].classList.add("is-active");
    }, 5000);
  }

  /* =========================================================================
     5. Preise aus daten/preise.json
        Im HTML steht bereits eine erzeugte Fassung (für Suchmaschinen und
        Besucher ohne JavaScript). Hier wird sie durch den aktuellen Stand der
        JSON ersetzt — so wirkt eine Preisänderung sofort, auch wenn
        tools/preise-sync.js einmal vergessen wurde.
     ========================================================================= */
  function preise() {
    var ziel = document.querySelector(".prices-grid");
    if (!ziel || !window.fetch) return;

    fetch("daten/preise.json", { cache: "no-cache" })
      .then(function (a) { return a.ok ? a.json() : null; })
      .then(function (daten) {
        if (!daten || !daten.leistungen) return;
        ziel.innerHTML = preisHtml(daten);
      })
      .catch(function () { /* HTML-Fassung bleibt stehen */ });
  }

  function preisHtml(daten) {
    var w = daten.waehrung || "€";
    var zeilen = daten.leistungen.map(function (l) {
      return '<li class="price-row">' +
        '<span class="price-name">' + text(l.name) + "</span>" +
        '<span class="price-dots" aria-hidden="true"></span>' +
        '<span class="price-value">' + text(String(l.preis)) + " " + w + "</span>" +
        "</li>";
    }).join("");

    var paket = daten.komplettpaket;
    var enthalten = (paket.enthalten || []).map(function (e) {
      return "<li>" + text(e) + "</li>";
    }).join("");

    return '<ul class="price-list">' + zeilen + "</ul>" +
      '<aside class="package">' +
        '<h3 class="package-title">' + text(paket.titel) + "</h3>" +
        '<strong class="package-price">' + text(String(paket.preis)) + " " + w + "</strong>" +
        '<ul class="package-list">' + enthalten + "</ul>" +
        '<p class="package-hint">Ohne Termin &ndash; einfach vorbeikommen.</p>' +
      "</aside>";
  }

  function text(wert) {
    return String(wert).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* =========================================================================
     6. Einblenden beim Scrollen
     ========================================================================= */
  function einblenden() {
    var teile = document.querySelectorAll(".reveal");
    if (!teile.length) return;
    if (wenigerBewegung || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(teile, function (el) { el.classList.add("is-in"); });
      return;
    }
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          beobachter.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    Array.prototype.forEach.call(teile, function (el) { beobachter.observe(el); });
  }

  /* =========================================================================
     7. Karte erst auf Klick laden (DSGVO)
     ========================================================================= */
  function karte() {
    var knopf = document.getElementById("map-load");
    var kasten = document.getElementById("map-consent");
    var rahmen = document.getElementById("map");
    if (!knopf || !kasten || !rahmen) return;

    knopf.addEventListener("click", function () {
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.google.com/maps?q=" + encodeURIComponent(KARTEN_ADRESSE) + "&output=embed";
      iframe.title = "Karte: Barber Italienische Schere";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.setAttribute("allowfullscreen", "");
      kasten.remove();
      rahmen.appendChild(iframe);
    });
  }

  /* =========================================================================
     Start
     ========================================================================= */
  function los() {
    var jahr = document.getElementById("jahr");
    if (jahr) jahr.textContent = String(new Date().getFullYear());

    statusSetzen();
    window.setInterval(statusSetzen, 60000);

    intro();
    slideshow();
    preise();
    einblenden();
    karte();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", los);
  } else {
    los();
  }
})();
