/* OTG v2 — production pages: filters, image lightbox, film player, full-screen immersive pieces.
   The pages are rendered in full by build.py from the data files in /assets/js/*-data.js; this only adds behaviour. */
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var esc = function (s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var canEmbed = location.protocol === 'http:' || location.protocol === 'https:';

  /* ---- one overlay for everything: images, PDF pages, motion clips, films and immersive pieces ---- */
  var lb = document.createElement('div');
  lb.className = 'pf-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Viewer');
  lb.setAttribute('data-lenis-prevent', '');
  lb.innerHTML = '<span class="pf-lb-n" aria-live="polite"></span>' +
    '<a class="pf-lb-btn pf-lb-dl" target="_blank" rel="noopener" download hidden>PDF &darr;</a>' +
    '<button class="pf-lb-btn pf-lb-close" type="button" aria-label="Close">Close &times;</button>' +
    '<button class="pf-lb-btn pf-lb-prev" type="button" aria-label="Previous">&larr;</button>' +
    '<button class="pf-lb-btn pf-lb-next" type="button" aria-label="Next">&rarr;</button>' +
    '<div class="pf-lb-stage"></div>';
  document.body.appendChild(lb);
  var stage = lb.querySelector('.pf-lb-stage'), num = lb.querySelector('.pf-lb-n'), dl = lb.querySelector('.pf-lb-dl');
  var prev = lb.querySelector('.pf-lb-prev'), next = lb.querySelector('.pf-lb-next'), closeBtn = lb.querySelector('.pf-lb-close');
  var slides = [], pos = 0, opener = null;

  var lock = function (on) {
    var l = window.OTG_LENIS;
    if (on) { if (l) l.stop(); doc.style.overflow = 'hidden'; }
    else { if (l) l.start(); doc.style.overflow = ''; }
  };
  var render = function () {
    var s = slides[pos];
    lb.classList.toggle('xp', !!s.xp);
    if (s.xp) {
      stage.innerHTML = '<div class="pf-xp"><iframe src="' + esc(s.xp) + '" title="' + esc(s.cap || 'Immersive piece') + '" allow="autoplay; fullscreen"></iframe></div>';
      setTimeout(function () { try { stage.querySelector('iframe').focus(); } catch (e) {} }, 120);
    } else if (s.film) {
      var f = s.film, src = f.platform === 'youtube' ? 'https://www.youtube.com/embed/' + f.id + '?autoplay=1&rel=0&playsinline=1&origin=' + encodeURIComponent(location.origin)
        : f.platform === 'vimeo' ? 'https://player.vimeo.com/video/' + f.id + '?autoplay=1' : '';
      stage.innerHTML = '<div class="pf-frame">' + (src ? '<iframe src="' + esc(src) + '" title="' + esc(f.title) + '" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>'
        : '<video src="' + esc(f.id) + '" controls autoplay playsinline></video>') + '</div>';
    } else if (s.video) {
      var loop = s.motion && !fine;
      stage.innerHTML = '<figure><video src="' + esc(s.video) + '"' + (s.poster ? ' poster="' + esc(s.poster) + '"' : '') + ' autoplay playsinline' + (loop ? ' loop muted' : ' controls') + '></video>' + (s.cap ? '<figcaption>' + esc(s.cap) + '</figcaption>' : '') + '</figure>';
      var v = stage.querySelector('video'), p = v.play();
      if (p && p.catch) p.catch(function () { v.setAttribute('controls', ''); });
      if (loop) v.addEventListener('click', function () { if (v.paused) v.play(); else v.pause(); });
    } else {
      stage.innerHTML = '<figure><img src="' + esc(s.src) + '" alt="' + esc(s.cap || 'Portfolio image') + '">' + (s.cap ? '<figcaption>' + esc(s.cap) + '</figcaption>' : '') + '</figure>';
    }
    var multi = slides.length > 1;
    prev.hidden = next.hidden = !multi;
    num.textContent = multi ? (pos + 1) + ' / ' + slides.length : '';
    if (s.pdf) { dl.href = s.pdf; dl.hidden = false; } else { dl.hidden = true; dl.removeAttribute('href'); }
  };
  var show = function (p) { if (!slides.length) return; pos = (p + slides.length) % slides.length; render(); };
  var open = function (arr, start, from) {
    slides = arr; opener = from || null; pos = start || 0; render();
    lb.classList.add('open'); lock(true); closeBtn.focus({ preventScroll: true });
  };
  var close = function () {
    if (!lb.classList.contains('open')) return;
    lb.classList.remove('open'); lock(false);
    setTimeout(function () { if (!lb.classList.contains('open')) stage.innerHTML = ''; }, 420);
    stage.querySelectorAll('video').forEach(function (v) { try { v.pause(); } catch (e) {} });
    var ifr = stage.querySelector('iframe'); if (ifr) ifr.remove();
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  };
  closeBtn.addEventListener('click', close);
  prev.addEventListener('click', function () { show(pos - 1); });
  next.addEventListener('click', function () { show(pos + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target === stage) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && slides.length > 1) show(pos - 1);
    else if (e.key === 'ArrowRight' && slides.length > 1) show(pos + 1);
  });
  var tx = null, ty = null;
  lb.addEventListener('touchstart', function (e) { if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } else tx = null; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (tx === null || slides.length < 2 || slides[pos].xp) { tx = null; return; }
    var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(pos + (dx < 0 ? 1 : -1));
  }, { passive: true });

  var filmOf = function (el) { return { platform: el.getAttribute('data-platform'), id: el.getAttribute('data-id'), title: el.getAttribute('data-title') }; };
  var visible = function (el) { return !el.classList.contains('pf-out'); };

  /* clicks are caught before the page curtain sees them, so these open in place instead of leaving the page */
  document.addEventListener('click', function (e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target.closest && e.target.closest('[data-film], [data-xp], .pf-item');
    if (!t) return;
    var item = t.closest('.pf-item');
    if (t.hasAttribute('data-film')) {
      if (!canEmbed && filmOf(t).platform !== 'mp4') return; // local preview: open on YouTube instead
      e.preventDefault(); e.stopPropagation();
      open([{ film: filmOf(t) }], 0, t); return;
    }
    if (item && !item.hasAttribute('data-xp')) {
      if (!e.target.closest('.pf-hit')) return;
      e.preventDefault(); e.stopPropagation();
      if (item.hasAttribute('data-pages')) {
        var pages = JSON.parse(item.getAttribute('data-pages')), cap = item.getAttribute('data-cap') || '';
        open(pages.map(function (p, k) { return { src: p, cap: cap + ' · page ' + (k + 1) + ' of ' + pages.length, pdf: item.getAttribute('data-pdf') }; }), 0, item.querySelector('.pf-hit'));
        return;
      }
      /* images and motion clips in the current filter form one set you can arrow through */
      var set = [].slice.call(item.parentNode.querySelectorAll('.pf-item')).filter(function (x) { return visible(x) && !x.hasAttribute('data-pages') && !x.hasAttribute('data-xp'); });
      open(set.map(function (x) {
        return x.hasAttribute('data-video')
          ? { video: x.getAttribute('data-video'), poster: x.getAttribute('data-poster'), cap: x.getAttribute('data-cap'), motion: x.hasAttribute('data-motion') }
          : { src: x.getAttribute('data-src'), cap: x.getAttribute('data-cap'), pdf: x.getAttribute('data-pdf') };
      }), Math.max(0, set.indexOf(item)), item.querySelector('.pf-hit'));
      return;
    }
    var xp = (item || t).getAttribute('data-xp');
    if (xp) { e.preventDefault(); e.stopPropagation(); open([{ xp: xp, cap: (item && item.getAttribute('data-cap')) || t.textContent.trim() }], 0, t); }
  }, true);

  /* ---- filters ---- */
  [].forEach.call(document.querySelectorAll('.pf-filters'), function (bar) {
    var grid = bar.parentNode.querySelector('[data-pf]');
    var intro = bar.parentNode.querySelector('.pf-intro');
    if (!grid) return;
    var els = [].slice.call(grid.children);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('.pf-f'); if (!b) return;
      [].forEach.call(bar.querySelectorAll('.pf-f'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var tag = b.getAttribute('data-tag');
      els.forEach(function (el) {
        var on = tag === '*' || (' ' + (el.getAttribute('data-tags') || '') + ' ').indexOf(' ' + tag + ' ') >= 0;
        el.classList.toggle('pf-out', !on);
        if (on) el.classList.add('in');
      });
      if (intro) { var d = b.getAttribute('data-desc'); intro.textContent = d || ''; intro.hidden = !d; }
      if (window.OTG_LENIS) window.OTG_LENIS.resize();
      if (pick) pick();
    });
  });

  /* ---- gallery tiles ease in as they arrive ---- */
  var tiles = [].slice.call(document.querySelectorAll('.pf-item'));
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -6% 0px' });
    tiles.forEach(function (t, i) { t.style.transitionDelay = (i % 3) * 0.07 + 's'; io.observe(t); });
  } else tiles.forEach(function (t) { t.classList.add('in'); });

  /* ---- motion clips preview on hover (mouse and trackpad) ---- */
  if (fine && !reduce) [].forEach.call(document.querySelectorAll('.pf-grid .pf-item[data-video]'), function (fig) {
    var v = null;
    fig.addEventListener('mouseenter', function () {
      if (!v) {
        v = document.createElement('video'); v.className = 'pf-hover'; v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true'); v.preload = 'auto';
        v.src = fig.getAttribute('data-video');
        v.addEventListener('playing', function () { if (fig.matches(':hover')) fig.classList.add('previewing'); });
        fig.appendChild(v);
      }
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    });
    fig.addEventListener('mouseleave', function () { fig.classList.remove('previewing'); if (v) { v.pause(); try { v.currentTime = 0; } catch (e) {} } });
  });

  /* ---- YouTube posters: swap in the sharper still when YouTube has one ---- */
  [].forEach.call(document.querySelectorAll('img[data-yt]'), function (img) {
    var hi = new Image();
    hi.onload = function () { if (hi.naturalWidth > 120) img.src = hi.src; };
    hi.src = 'https://i.ytimg.com/vi/' + img.getAttribute('data-yt') + '/maxresdefault.jpg';
  });

  /* ---- films: the film nearest the middle of the screen plays silently, one at a time ---- */
  var rows = [].slice.call(document.querySelectorAll('.pf-reel .pf-film'));
  var pick = null;
  if (rows.length && canEmbed && !reduce) {
    var playing = null;
    var stop = function (row) { if (!row) return; var l = row.querySelector('.pf-live'); if (l) l.remove(); row.classList.remove('playing'); };
    var play = function (row) {
      if (row === playing) return; stop(playing); playing = row;
      var m = row.querySelector('.pf-film-media'), f = filmOf(m), el;
      if (f.platform === 'mp4') {
        el = document.createElement('video'); el.muted = true; el.loop = true; el.playsInline = true; el.autoplay = true;
        el.setAttribute('muted', ''); el.setAttribute('playsinline', ''); el.src = f.id;
        el.addEventListener('playing', function () { row.classList.add('playing'); });
      } else {
        el = document.createElement('iframe'); el.setAttribute('tabindex', '-1'); el.setAttribute('aria-hidden', 'true');
        el.allow = 'autoplay; encrypted-media; picture-in-picture';
        el.src = f.platform === 'youtube'
          ? 'https://www.youtube.com/embed/' + f.id + '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + f.id + '&rel=0&playsinline=1&modestbranding=1&disablekb=1'
          : 'https://player.vimeo.com/video/' + f.id + '?autoplay=1&muted=1&loop=1&background=1';
        el.addEventListener('load', function () { setTimeout(function () { if (playing === row) row.classList.add('playing'); }, 900); });
      }
      el.className = 'pf-live'; m.insertBefore(el, m.querySelector('.pf-play'));
      if (el.play) { var p = el.play(); if (p && p.catch) p.catch(function () {}); }
    };
    pick = function () {
      if (lb.classList.contains('open')) return;
      var vh = window.innerHeight, best = null, bd = 1e9;
      rows.forEach(function (r) {
        if (r.classList.contains('pf-out')) return;
        var b = r.querySelector('.pf-film-media').getBoundingClientRect();
        if (b.bottom <= 0 || b.top >= vh) return;
        var d = Math.abs(b.top + b.height / 2 - vh / 2);
        if (d < vh * 0.3 && d < bd) { bd = d; best = r; }
      });
      if (best) play(best); else { stop(playing); playing = null; }
    };
    var tick = false;
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; pick(); }); } }, { passive: true });
    window.addEventListener('resize', pick);
    setTimeout(pick, 600);
  }
})();
