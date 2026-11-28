/* The JOSEPHINE "J": a field of dots holds the letter and parts around the pointer or finger.
   Same behaviour as on wearejosephine.com (ported 18 Nov 2026). Works on every .jstage > canvas on the page.
   The letter is Noto Serif Display, extra-condensed (self-hosted J-only subset, family "JOSEPHINE J"). */
(function () {
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FONT = '"JOSEPHINE J", "Noto Serif Display", Didot, Georgia, serif';
  function jdots(st) {
    var cv = st.querySelector('canvas'); if (!cv) return; var cx = cv.getContext('2d');
    var col = st.getAttribute('data-color') || 'rgba(226,42,82,.95)';
    var W = 0, H = 0, D = 1, SZ = 2, P = [], run = false, raf = 0, m = { x: -1e4, y: -1e4 };
    function size() { D = Math.min(2, devicePixelRatio || 1); var r = cv.getBoundingClientRect(); W = Math.round(r.width * D); H = Math.round(r.height * D); cv.width = W; cv.height = H; }
    function targets() {
      var o = document.createElement('canvas'); o.width = W; o.height = H; var g = o.getContext('2d');
      var fs = H * .98 / 1.3; g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.font = '400 ' + fs + 'px ' + FONT;
      var mt = g.measureText('J'), asc = mt.actualBoundingBoxAscent || fs * .7, desc = mt.actualBoundingBoxDescent || fs * .2;
      g.fillText('J', W / 2, (H - (asc + desc)) / 2 + asc);
      var d = g.getImageData(0, 0, W, H).data, pts = [], step = Math.max(2, Math.round(2.4 * D)); SZ = step * .62;
      for (var y = 0; y < H; y += step) for (var x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 128) pts.push([x, y]);
      for (var i = pts.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
      return pts;
    }
    function build() {
      size(); if (!W || !H) return; var t = targets(); if (!t.length) return;
      P = t.map(function (q) { return { tx: q[0], ty: q[1], x: RM ? q[0] : Math.random() * W, y: RM ? q[1] : Math.random() * H, vx: 0, vy: 0 }; }); draw();
    }
    function step() {
      var R = 90 * D, R2 = R * R;
      for (var k = 0; k < P.length; k++) {
        var p = P[k], ax = (p.tx - p.x) * .04, ay = (p.ty - p.y) * .04, dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) { var f = (1 - d2 / R2) * 8 * D / Math.sqrt(d2 + 1); ax += dx * f * .6; ay += dy * f * .6; }
        p.vx = (p.vx + ax) * .82; p.vy = (p.vy + ay) * .82; p.x += p.vx; p.y += p.vy;
      }
    }
    function draw() { cx.clearRect(0, 0, W, H); cx.fillStyle = col; for (var k = 0; k < P.length; k++) cx.fillRect(P[k].x, P[k].y, SZ, SZ); }
    function loop() { if (!run) return; step(); draw(); raf = requestAnimationFrame(loop); }
    function pos(x, y) { var b = cv.getBoundingClientRect(); m.x = (x - b.left) * D; m.y = (y - b.top) * D; }
    st.addEventListener('pointermove', function (e) { pos(e.clientX, e.clientY); });
    st.addEventListener('pointerleave', function () { m.x = m.y = -1e4; });
    /* phones: hold still or move sideways = play with the dots and the page stays put; a quick up/down flick still scrolls */
    var tS = null;
    st.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (!t) return; pos(t.clientX, t.clientY); tS = { x: t.clientX, y: t.clientY, t: performance.now(), lock: null }; }, { passive: true });
    st.addEventListener('touchmove', function (e) {
      var t = e.touches[0]; if (!t) return; pos(t.clientX, t.clientY); if (!tS || e.touches.length > 1) return;
      if (tS.lock === null) { var dx = t.clientX - tS.x, dy = t.clientY - tS.y, dt = performance.now() - tS.t; tS.lock = !(Math.abs(dy) > Math.abs(dx) * 1.3 && dt < 160); }
      if (tS.lock && e.cancelable) e.preventDefault();
    }, { passive: false });
    st.addEventListener('touchend', function () { m.x = m.y = -1e4; tS = null; }, { passive: true });
    var lw = 0; addEventListener('resize', function () { if (innerWidth === lw) return; lw = innerWidth; build(); });
    function go() {
      lw = innerWidth; build();
      new IntersectionObserver(function (es) { es.forEach(function (e) { run = e.isIntersecting && !RM; cancelAnimationFrame(raf); if (run) loop(); }); }).observe(st);
    }
    /* wait for the letter's own face, then draw */
    if (document.fonts && document.fonts.load) {
      var done = false; var once = function () { if (!done) { done = true; go(); } };
      document.fonts.load('400 200px "JOSEPHINE J"', 'J').then(once, once); setTimeout(once, 2500);
    } else go();
  }
  [].forEach.call(document.querySelectorAll('.jstage'), jdots);
})();
