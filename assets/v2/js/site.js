/* OTG v2 — shared behaviour: menu, reveals, autoplay video, chameleon colours, enquiry form. */
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* page transitions: a curtain in the next page's colour covers the jump, every page opens at the top */
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
  var curtain = document.createElement('div'); curtain.className = 'pt'; curtain.setAttribute('aria-hidden', 'true');
  curtain.innerHTML = '<span class="o-mark"><i></i><b></b></span>'; document.body.appendChild(curtain);
  var toTop = function () { if (location.hash) return; doc.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); doc.style.scrollBehavior = ''; };
  toTop();

  /* smooth, weighted scroll on mouse and trackpad (Lenis, as on the Jamie Chadwick site); phones keep their native scroll */
  var lenis = null;
  var fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (!reduce && fine && window.Lenis) {
    lenis = new Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 1 });
    window.OTG_LENIS = lenis; /* production pages pause it while the viewer is open */
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    /* same-page section links (/#work, /#studio) glide there too; registered before the curtain so it leaves them alone */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]'); if (!a || e.defaultPrevented) return;
      var url; try { url = new URL(a.href, location.href); } catch (x) { return; }
      if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash.length < 2 || url.hash === '#main') return;
      var t = document.getElementById(decodeURIComponent(url.hash.slice(1))); if (!t) return;
      e.preventDefault(); lenis.scrollTo(t, { duration: 1.4 });
      try { history.replaceState(null, '', url.hash); } catch (x) {}
    });
  }
  if (doc.classList.contains('pt-enter')) {
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      toTop(); if (lenis && !location.hash) lenis.scrollTo(0, { immediate: true }); doc.classList.add('pt-reveal'); doc.classList.remove('pt-enter');
      setTimeout(function () { doc.classList.remove('pt-reveal'); }, 900);
    }); });
  }
  window.addEventListener('pageshow', function (e) { if (e.persisted) { doc.classList.remove('pt-leave', 'pt-enter'); } });
  var fetched = {};
  var prefetch = function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin || u.pathname === location.pathname || fetched[u.pathname]) return;
    fetched[u.pathname] = 1; var l = document.createElement('link'); l.rel = 'prefetch'; l.href = u.pathname; document.head.appendChild(l);
  };
  document.addEventListener('mouseover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });
  if (!reduce) document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    var url; try { url = new URL(a.href, location.href); } catch (x) { return; }
    if (url.origin !== location.origin || /^(mailto|tel):/.test(a.href)) return;
    if (url.pathname === location.pathname && url.hash) return; // same-page section link: smooth scroll instead
    e.preventDefault();
    // curtain takes the colour of the page you're going to (OTG paper for studio pages, the client's colour for case studies)
    var bg = a.getAttribute('data-pt') || '#F2F0EB';
    var fg = a.getAttribute('data-pt-fg') || '#111111';
    doc.style.setProperty('--pt-bg', bg); doc.style.setProperty('--pt-fg', fg);
    try { sessionStorage.setItem('otg-pt', bg + '|' + fg); } catch (x) {}
    doc.classList.add('pt-leave');
    setTimeout(function () { location.href = url.href; }, 400);
  });

  /* images and videos: no right-click menu and no drag-to-desktop (a light deterrent against saving them) */
  var media = function (t) { return t && t.closest && t.closest('img, video, picture, svg image, .o-mark'); };
  document.addEventListener('contextmenu', function (e) { if (media(e.target)) e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { if (media(e.target)) e.preventDefault(); });

  /* mobile menu */
  var hdr = document.querySelector('.hdr');
  var btn = document.querySelector('.menu-btn');
  if (hdr && btn) {
    btn.addEventListener('click', function () {
      var open = hdr.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Close' : 'Menu';
    });
    [].forEach.call(hdr.querySelectorAll('.nav a'), function (a) {
      a.addEventListener('click', function () { hdr.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Menu'; });
    });
  }

  /* muted looping videos: they only download and play when they come near the screen, and pause when
     scrolled away (saves data on phones and keeps scrolling smooth). Markup uses data-autoplay + preload="none". */
  var vids = [].slice.call(document.querySelectorAll('video[data-autoplay], video[autoplay]'));
  var go = function (v) { if (v._userPaused) return; if (v.preload === 'none') v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () {}); };
  vids.forEach(function (v) {
    v.muted = true; v.loop = true;
    if (reduce) { v.removeAttribute('autoplay'); v.pause(); return; }
    v.addEventListener('pause', function () { if (!v._autoPause && v.controls && v._vis) v._userPaused = true; v._autoPause = false; });
    v.addEventListener('play', function () { v._userPaused = false; });
  });
  if (!reduce && vids.length) {
    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { var v = e.target; v._vis = e.isIntersecting;
          if (e.isIntersecting) go(v); else if (!v.paused) { v._autoPause = true; v.pause(); } });
      }, { rootMargin: '300px 0px' });
      vids.forEach(function (v) { vio.observe(v); });
    } else vids.forEach(go);
  }

  /* scroll reveals: threshold 0 with a rootMargin, so tall elements still reveal */
  var els = [].slice.call(document.querySelectorAll('.rv'));
  if (!reduce && 'IntersectionObserver' in window && els.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
    setTimeout(function () { els.forEach(function (e) { if (e.getBoundingClientRect().top < window.innerHeight) e.classList.add('in'); }); }, 1600);
  } else { els.forEach(function (e) { e.classList.add('in'); }); }

  /* chameleon: the page takes on each client's colours as you scroll (homepage only) */
  var pals = window.OTG_PALS;
  var secs = [].slice.call(document.querySelectorAll('[data-pal]'));
  if (pals && secs.length) {
    document.body.classList.add('cham');
    var label = document.querySelector('.hdr-label');
    var segs = [].slice.call(document.querySelectorAll('.strip span'));
    segs.forEach(function (s) { s.style.background = pals[+s.getAttribute('data-i')].bg; });
    var cur = -1;
    var apply = function (i) {
      if (i === cur || !pals[i]) return; cur = i; var p = pals[i];
      doc.style.setProperty('--fg', p.fg);
      doc.style.setProperty('--muted', p.muted || 'color-mix(in srgb, ' + p.fg + ' 70%, transparent)');
      doc.style.setProperty('--line', 'color-mix(in srgb, ' + p.fg + ' 16%, transparent)');
      var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', p.bg);
      if (label) label.textContent = p.label;
      segs.forEach(function (s) { var on = +s.getAttribute('data-i') === i; s.classList.toggle('on', on); s.style.outlineColor = on ? p.fg : 'transparent'; });
    };
    /* colours glide with the scroll: each brand's background blends into the next across a short band,
       and the text colour flips at the midpoint so it always stays readable */
    var hex = function (h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
    var mix = function (a, b, t) { var x = hex(a), y = hex(b); return 'rgb(' + [0, 1, 2].map(function (k) { return Math.round(x[k] + (y[k] - x[k]) * t); }).join(',') + ')'; };
    var ease = function (t) { return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); };
    var order = secs.map(function (s) { return +s.getAttribute('data-pal'); });
    var lastBg = '';
    var pick = function () {
      var vh = window.innerHeight, L = vh * (window.innerWidth <= 900 ? 0.45 : 0.5), W = vh * 0.32;
      var i = 0, from = order[0], to = order[0], t = 0;
      secs.forEach(function (s, k) { if (s.getBoundingClientRect().top <= L) i = k; });
      if (i + 1 < secs.length) { var d = secs[i + 1].getBoundingClientRect().top - L; if (d < W / 2) { from = order[i]; to = order[i + 1]; t = ease(0.5 - d / W); } else { from = to = order[i]; } }
      if (from === to && i > 0) { var u = L - secs[i].getBoundingClientRect().top; if (u < W / 2) { from = order[i - 1]; to = order[i]; t = ease(0.5 + u / W); } }
      var A = pals[from], B = pals[to] || A;
      var bg = mix(A.bg, B.bg, t);
      if (bg !== lastBg) { lastBg = bg; doc.style.setProperty('--bg', bg); doc.style.setProperty('--acc', mix(A.acc, B.acc, t)); }
      apply(t < 0.5 ? from : to);
    };
    var tick = false;
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; pick(); }); } }, { passive: true });
    window.addEventListener('resize', pick); pick();
  }

  /* email links: open the mail app, and copy the address too (some computers have no mail app set up) */
  [].forEach.call(document.querySelectorAll('a[href^="mailto:"]'), function (a) {
    a.addEventListener('click', function () {
      var addr = a.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
      var done = function () {
        var note = a.parentNode.querySelector('.copied');
        if (!note) { note = document.createElement('span'); note.className = 'copied mono'; note.setAttribute('role', 'status'); a.parentNode.appendChild(note); }
        note.textContent = 'Copied to clipboard'; clearTimeout(note._t); note._t = setTimeout(function () { note.textContent = ''; }, 2600);
      };
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(addr).then(done, function () {}); } catch (e) {}
    });
  });

  /* enquiry form: send through Formspree without leaving the page */
  var form = document.querySelector('form[data-formspree]');
  if (form && window.fetch) {
    var status = form.querySelector('.form-status');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var send = form.querySelector('[type="submit"]'); send.disabled = true; send.textContent = 'Sending…';
      status.textContent = '';
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (r) {
          if (r.ok) { form.reset(); form.innerHTML = '<div class="full" role="status"><h2 style="font-size:clamp(32px,3.4vw,52px);margin-bottom:16px">Thanks, that’s with us.</h2><p class="lead">We’ll reply within one working day. If it’s easier to talk, <a href="' + form.getAttribute('data-booking') + '" target="_blank" rel="noopener">book a call</a>.</p></div>'; }
          else { throw new Error('send failed'); }
        })
        .catch(function () { send.disabled = false; send.textContent = 'Send enquiry'; status.textContent = 'Something went wrong sending that. Please email ' + 'hello' + '\u0040' + 'onthegroundproductions.com instead.'; });
    });
  }
})();

/* DesignRush review badge (24 Nov 2026). Their own script only runs at page load, so instead the badge
   is fetched only when the footer gets near the screen. Until then (or if it fails) a plain text link shows. */
(function () {
  var box = document.querySelector('[data-designrush-widget]');
  if (!box || !window.fetch) return;
  function go() {
    if (box.getAttribute('data-loaded')) return;
    box.setAttribute('data-loaded', '1');
    fetch('https://www.designrush.com/api/widgets/agency-reviews?agency_id=' + encodeURIComponent(box.getAttribute('data-agency-id')) + '&style=' + encodeURIComponent(box.getAttribute('data-style')))
      .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
      .then(function (h) {
        if (h.indexOf('dr-agency-reviews-widget') < 0) return;
        box.innerHTML = h.replace(/<link[^>]*>/gi, '');
        var a = box.querySelector('a'); if (a) a.rel = 'noopener';
      })
      .catch(function () {});
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '600px 0px' });
    io.observe(box);
  } else go();
})();
