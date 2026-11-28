/* On The Ground Productions — copy motion layer. Does nothing unless <html class="mo">. */
(function () {
  "use strict";
  var root = document.documentElement;
  if (!root.classList.contains("mo")) return;
  function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
  function plain(el) { return el.textContent.replace(/\s+/g, " ").trim(); }
  var MEDIA = "img, video, picture, iframe, canvas, form";

  /* ---------- split text into words (keeps inline tags such as the accent span) ---------- */
  function splitWords(el, cls) {
    var i = 0;
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (tok) {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(" ")); return; }
            var o = document.createElement("span");
            if (cls === "mo-q") { o.className = "mo-q"; o.textContent = tok; }
            else { o.className = "mo-w"; o.style.setProperty("--i", i); var inner = document.createElement("span"); inner.textContent = tok; o.appendChild(inner); }
            i++; frag.appendChild(o);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") { walk(n); }
      });
    })(el);
  }

  /* ---------- 1. page headline: find the real line breaks, wrap each line in a mask ---------- */
  var h1s = $$("main h1");
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function splitLines(h) {
    if (h._txt == null) { h._txt = plain(h); h.setAttribute("aria-label", h._txt); }
    h.innerHTML = h._txt.split(" ").map(function (w) { return '<span style="display:inline-block">' + esc(w) + "</span>"; }).join(" ");
    var lines = [], top = null;
    [].slice.call(h.children).forEach(function (s) {
      if (top === null || Math.abs(s.offsetTop - top) > 4) { lines.push([]); top = s.offsetTop; }
      lines[lines.length - 1].push(s.textContent);
    });
    h.innerHTML = lines.map(function (l, i) {
      return '<span class="mo-ln" style="--i:' + i + '"><span>' + esc(l.join(" ")) + "</span></span>";
    }).join("");
    h.classList.add("mo-ready");
  }
  function splitAllLines() { h1s.forEach(splitLines); }

  /* the short pieces of copy right around the headline (eyebrow, intro, buttons) follow it in */
  var intros = [];
  h1s.forEach(function (h) {
    var box = h.parentNode; if (!box || box._mo) return; box._mo = 1;
    box.classList.add("mo-intro"); intros.push(box);
    function ok(el) { return el && el.nodeType === 1 && !el.matches(MEDIA) && !el.querySelector(MEDIA) && el.textContent.length < 700 && el.offsetHeight < 420; }
    var before = [], after = [], el;
    for (el = h.previousElementSibling; ok(el); el = el.previousElementSibling) before.unshift(el);
    for (el = h.nextElementSibling; ok(el) && after.length < 4; el = el.nextElementSibling) after.push(el);
    before.forEach(function (k, i) { k.classList.add("mo-ik"); k.style.setProperty("--mo-d", (0.1 + i * 0.1) + "s"); });
    after.forEach(function (k, i) { k.classList.add("mo-ik"); k.style.setProperty("--mo-d", (0.7 + i * 0.2) + "s"); });
  });

  /* ---------- 2. section headings and quotes (long-read article bodies are left alone) ---------- */
  $$("main h2, .site-end h2").forEach(function (h) {
    if (h.closest(".blog-post, .gallery, #gallery-grid")) return;
    h.setAttribute("aria-label", plain(h)); splitWords(h, "mo-w"); h.classList.add("mo-split");
  });
  $$("main blockquote").forEach(function (q) {
    if (q.closest(".blog-post")) return;
    q.setAttribute("aria-label", plain(q)); splitWords(q, "mo-q"); q.classList.add("mo-quote");
  });
  /* text blocks (not image tiles or cards) replay their fade; the paragraph under a heading starts a beat later */
  var textReveals = $$("main .reveal").filter(function (el) {
    return !/^H[12]$/.test(el.tagName) && !el.classList.contains("mo-ik") && !el.matches("a, figure, video, button, article") &&
           !el.querySelector(MEDIA) && !el.closest(".blog-post");
  });
  textReveals.forEach(function (el) {
    el.classList.add("mo-txt");
    var prev = el.previousElementSibling;
    if (prev && prev.tagName === "H2") el.style.setProperty("--mo-d", ".25s");
  });

  /* ---------- 3. reveal by position, replaying each time it scrolls back into view ---------- */
  var watch = $$(".mo-split").map(function (el) { return { el: el, cls: "mo-in" }; })
    .concat(textReveals.map(function (el) { return { el: el, cls: "in" }; }));
  var quotes = $$(".mo-quote");
  function pass() {
    var vh = window.innerHeight, i, w, r, add = [], rem = [];
    /* read everything first, then write: one layout per frame */
    for (i = 0; i < watch.length; i++) {
      w = watch[i]; r = w.el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      var on = w.el.classList.contains(w.cls);
      if (!on && r.top < vh * 0.88 && r.bottom > vh * 0.04) add.push(w);
      else if (on && (r.top > vh * 1.2 || r.bottom < vh * -0.2)) rem.push(w);
    }
    var goAdd = [], goRem = [];
    intros.forEach(function (h) {
      var hr = h.getBoundingClientRect(), go = h.classList.contains("mo-go");
      if (!go && hr.bottom > 40 && hr.top < vh) goAdd.push(h);
      else if (go && (hr.bottom < -20 || hr.top > vh * 1.2)) goRem.push(h);
    });
    var qr = quotes.map(function (q) { return q.getBoundingClientRect(); });
    for (i = 0; i < add.length; i++) add[i].el.classList.add(add[i].cls);
    for (i = 0; i < rem.length; i++) rem[i].el.classList.remove(rem[i].cls);
    for (i = 0; i < goAdd.length; i++) goAdd[i].classList.add("mo-go");
    for (i = 0; i < goRem.length; i++) goRem[i].classList.remove("mo-go");
    /* quotes light up word by word with the scroll */
    quotes.forEach(function (q, qi) {
      var r = qr[qi]; if (r.bottom < 0 || r.top > vh) return;
      var words = q._w || (q._w = $$(".mo-q", q));
      var p = (vh * 0.86 - r.top) / (r.height + vh * 0.42);
      var n = Math.round(Math.max(0, Math.min(1, p)) * words.length);
      if (n === q._n) return;
      var from = Math.min(n, q._n || 0), to = Math.max(n, q._n || 0);
      for (var k = from; k < to; k++) words[k].classList.toggle("on", k < n);
      q._n = n;
    });
  }
  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; pass(); }); } }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* start once the web fonts are in (so the line breaks are the real ones), or after 1.2s at the latest */
  var started = false, lastW = window.innerWidth;
  function start() { if (started) return; started = true; splitAllLines(); pass(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  setTimeout(start, 1200);
  window.addEventListener("resize", function () {
    if (window.innerWidth !== lastW && started) { lastW = window.innerWidth; splitAllLines(); }
    onScroll();
  }, { passive: true });
  window.addEventListener("load", onScroll);
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    watch.forEach(function (w) { w.el.classList.remove(w.cls); });
    intros.forEach(function (h) { h.classList.remove("mo-go"); });
    requestAnimationFrame(function () { requestAnimationFrame(pass); });
  });
})();
