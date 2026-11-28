/* On The Ground Productions, site behaviour */
/* WebP path for a local raster asset (used to serve <picture> with fallback) */
function otgWebp(src) {
  return /^assets\/.+\.(jpe?g|png)$/i.test(src) ? src.replace(/\.(jpe?g|png)$/i, ".webp") : null;
}
/* Lightweight grid thumbnail (900px) for photography — full-res is kept for the lightbox.
   Only rewrites paths that have generated -sm derivatives, so other galleries are untouched. */
function otgThumb(src) {
  return /^assets\/img\/photography\/.+\.(jpe?g|png)$/i.test(src) ? src.replace(/\.(jpe?g|png)$/i, "-sm.$1") : src;
}
(function () {
  "use strict";
  var SITE = "https://onthegroundproductions.com";

  /* ---- Mobile nav ---- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); });
    });
  }

  /* ---- Reveal on scroll ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    // Trigger as soon as the element's edge is ~8% into the screen. (A percentage-of-element
    // threshold left very tall blocks, e.g. stacked app screens on phones, invisible for a long scroll.)
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) {
      // The closing block is fixed behind the page, so it never "scrolls in": show it straight away.
      if (el.closest(".site-end")) { el.classList.add("in"); return; }
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---- Year in footer ---- */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* ---- Render films (cinematic, poster-first + lightbox) ---- */
  var grid = document.getElementById("film-grid");
  if (grid && window.OTG_FILMS) {
    var films = window.OTG_FILMS.filter(function (f) { return f && f.title; });
    var reel = window.OTG_FILMS_LAYOUT === "reel";
    var esc = function (s) {
      return String(s || "").replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    };

    if (!films.length) {
      grid.innerHTML = '<div class="film-empty"><h3>Films coming soon</h3><p>Our latest work is being added. Check back shortly.</p></div>';
    } else {
      grid.style.display = "block";
      // hqdefault always exists for a public video; maxres often does not.
      // Use hqdefault as the reliable base, then upgrade to maxres only if it loads.
      var poster = function (f) {
        if (f.poster) return f.poster;
        if (f.platform === "youtube") return "https://i.ytimg.com/vi/" + f.id + "/hqdefault.jpg";
        return "";
      };
      var watchURL = function (f) {
        if (f.platform === "youtube") return "https://www.youtube.com/watch?v=" + f.id;
        if (f.platform === "vimeo") return "https://vimeo.com/" + f.id;
        return SITE + "/" + String(f.id).replace(/^\//, "");
      };
      var tile = function (f, i, cls) {
        var meta = [f.category, f.client, f.year].filter(Boolean).join(" · ");
        var ps = poster(f), wp = otgWebp(ps);
        var img = '<img src="' + esc(ps) + '" alt="' + esc(f.title) + '" loading="lazy" decoding="async"' +
            (!f.poster && f.platform === "youtube" ? ' data-yt="' + f.id + '"' : '') + '>';
        var media = wp ? '<picture><source type="image/webp" srcset="' + esc(wp) + '">' + img + '</picture>' : img;
        return '<button class="' + cls + '" data-film="' + i + '" data-tags="' + esc((f.tags || []).join(" ")) + '" aria-label="Play ' + esc(f.title) + '">' +
          media +
          '<span class="play-btn" aria-hidden="true"></span>' +
          '<span class="film-cap">' + (meta ? '<span class="c">' + esc(meta) + '</span>' : '') +
            '<span class="t">' + esc(f.title) + '</span></span>' +
        '</button>';
      };

      var rowTile = function (f, i) {
        var meta = [f.category, f.client, f.year].filter(Boolean).join(" · ");
        var ps = poster(f), wp = otgWebp(ps);
        var img = '<img src="' + esc(ps) + '" alt="' + esc(f.title) + '" loading="lazy" decoding="async"' +
            (!f.poster && f.platform === "youtube" ? ' data-yt="' + f.id + '"' : '') + '>';
        var media = wp ? '<picture><source type="image/webp" srcset="' + esc(wp) + '">' + img + '</picture>' : img;
        return '<div class="film-row reveal" role="button" tabindex="0" data-film="' + i + '" data-tags="' + esc((f.tags || []).join(" ")) + '" aria-label="Play ' + esc(f.title) + '">' +
          media + '<span class="play-btn" aria-hidden="true"></span>' +
          '<span class="film-cap">' + (meta ? '<span class="c">' + esc(meta) + '</span>' : '') +
            '<span class="t">' + esc(f.title) + '</span></span>' +
        '</div>';
      };

      var html;
      if (reel) {
        html = films.map(function (f, i) { return rowTile(f, i); }).join("");
        grid.innerHTML = html;
        grid.classList.add("film-grid--reel");
      } else {
        html = tile(films[0], 0, "film-feature reveal");
        if (films.length > 1) {
          html += '<div class="film-tiles">';
          for (var i = 1; i < films.length; i++) html += tile(films[i], i, "film-card reveal");
          html += '</div>';
        }
        grid.innerHTML = html;
      }

      // Category filters (All + Brand Films / Interviews / Explainers / Promos)
      var filmFilters = (window.OTG_FILM_FILTERS || []).map(function (f) {
        return typeof f === "string" ? { tag: f.toLowerCase(), label: f } : { tag: String(f.tag).toLowerCase(), label: f.label || f.tag };
      });
      if (filmFilters.length) {
        var ffbar = document.createElement("div");
        ffbar.className = "gallery-filters";
        var ffbtns = '<button class="gf-btn active" data-tag="*">All</button>';
        filmFilters.forEach(function (f) { ffbtns += '<button class="gf-btn" data-tag="' + esc(f.tag) + '">' + esc(f.label) + '</button>'; });
        ffbar.innerHTML = ffbtns;
        grid.parentNode.insertBefore(ffbar, grid);
        var filmEls = Array.prototype.slice.call(grid.querySelectorAll(".film-row, .film-feature, .film-card"));
        ffbar.addEventListener("click", function (e) {
          var b = e.target.closest(".gf-btn"); if (!b) return;
          ffbar.querySelectorAll(".gf-btn").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          var tag = b.getAttribute("data-tag");
          filmEls.forEach(function (el) {
            var t = (el.getAttribute("data-tags") || "").split(" ");
            el.style.display = (tag === "*" || t.indexOf(tag) >= 0) ? "" : "none";
          });
        });
      }

      // Upgrade posters to maxres only when that image really exists (>120px)
      grid.querySelectorAll("img[data-yt]").forEach(function (img) {
        var hi = new Image();
        hi.onload = function () { if (hi.naturalWidth > 120) img.src = hi.src; };
        hi.src = "https://i.ytimg.com/vi/" + img.getAttribute("data-yt") + "/maxresdefault.jpg";
      });

      // VideoObject structured data
      var ld = films.map(function (f) {
        var o = { "@context": "https://schema.org", "@type": "VideoObject", "name": f.title,
          "description": f.description || (f.title + (f.client ? " for " + f.client : "")),
          "uploadDate": (f.year ? f.year + "-01-01" : "2025-01-01"),
          "thumbnailUrl": [poster(f)], "contentUrl": watchURL(f), "embedUrl": watchURL(f),
          "publisher": { "@type": "Organization", "name": "On The Ground Productions", "url": SITE } };
        return o;
      });
      var s = document.createElement("script");
      s.type = "application/ld+json";
      s.textContent = JSON.stringify(ld.length === 1 ? ld[0] : ld);
      document.head.appendChild(s);

      // Lightbox
      var lb = document.createElement("div");
      lb.className = "film-lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
      lb.innerHTML = '<button class="fl-close" aria-label="Close">&times;</button><div class="fl-inner"></div>';
      document.body.appendChild(lb);
      var inner = lb.querySelector(".fl-inner");
      // YouTube/Vimeo players require a real http(s) origin; when the page is
      // opened locally (file://) or inside a sandboxed preview frame, the player
      // throws "Error 153". In that case, open the video on its platform instead.
      var canEmbed = (location.protocol === "http:" || location.protocol === "https:");
      var embedSrc = function (f) {
        if (f.platform === "youtube") return "https://www.youtube.com/embed/" + f.id + "?autoplay=1&rel=0&playsinline=1&origin=" + encodeURIComponent(location.origin);
        if (f.platform === "vimeo") return "https://player.vimeo.com/video/" + f.id + "?autoplay=1";
        return "";
      };
      function open(i) {
        var f = films[i];
        if ((f.platform === "youtube" || f.platform === "vimeo") && !canEmbed) {
          window.open(watchURL(f), "_blank", "noopener");
          return;
        }
        if (f.platform === "youtube" || f.platform === "vimeo") {
          inner.innerHTML = '<iframe src="' + embedSrc(f) + '" title="' + esc(f.title) +
            '" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>';
        } else {
          inner.innerHTML = '<video controls autoplay playsinline src="' + esc(f.id) + '"></video>';
        }
        lb.classList.add("open"); document.body.style.overflow = "hidden";
      }
      function close() { lb.classList.remove("open"); inner.innerHTML = ""; document.body.style.overflow = ""; }
      grid.addEventListener("click", function (e) {
        var b = e.target.closest("[data-film]"); if (b) open(+b.getAttribute("data-film"));
      });
      lb.querySelector(".fl-close").addEventListener("click", close);
      lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && lb.classList.contains("open")) close(); });

      // reveal for new elements
      if ("IntersectionObserver" in window) {
        var io2 = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io2.unobserve(e.target); } });
        }, { threshold: 0.1 });
        grid.querySelectorAll(".reveal").forEach(function (el) { io2.observe(el); });
      } else {
        grid.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
      }

      // Reel: play the most-visible film muted as you scroll; only one at a time
      if (reel && "IntersectionObserver" in window) {
        var previewSrc = function (f) {
          if (f.platform === "youtube") return "https://www.youtube.com/embed/" + f.id + "?autoplay=1&mute=1&controls=0&loop=1&playlist=" + f.id + "&rel=0&playsinline=1&modestbranding=1&disablekb=1";
          if (f.platform === "vimeo") return "https://player.vimeo.com/video/" + f.id + "?autoplay=1&muted=1&loop=1&background=1";
          return "";
        };
        var playingRow = null;
        var stopRow = function (row) {
          if (!row) return;
          var live = row.querySelector(".film-live"); if (live) { try { live.pause && live.pause(); } catch (e) {} live.remove(); }
          row.classList.remove("playing");
        };
        var playRow = function (row) {
          if (row === playingRow) return;
          stopRow(playingRow); playingRow = row;
          var f = films[+row.getAttribute("data-film")];
          var cap = row.querySelector(".film-cap");
          if (f.platform === "mp4") {
            var v = document.createElement("video");
            v.className = "film-live"; v.muted = true; v.autoplay = true; v.loop = true; v.playsInline = true;
            v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.src = f.id;
            row.insertBefore(v, cap); v.play().catch(function () {});
            row.classList.add("playing");
          } else if (canEmbed) {
            var src = previewSrc(f); if (!src) return;
            var ifr = document.createElement("iframe");
            ifr.className = "film-live"; ifr.setAttribute("frameborder", "0");
            ifr.allow = "autoplay; encrypted-media; picture-in-picture";
            ifr.src = src;
            row.insertBefore(ifr, cap);
            row.classList.add("playing");
          }
        };
        // Play whichever film's centre is nearest the middle of the screen,
        // so autoplay begins when the film is genuinely centred (not slightly high).
        var rows = Array.prototype.slice.call(grid.querySelectorAll(".film-row"));
        var pickCentral = function () {
          var vh = window.innerHeight || document.documentElement.clientHeight;
          var mid = vh / 2, best = null, bestDist = 1e9;
          rows.forEach(function (r) {
            var b = r.getBoundingClientRect();
            if (b.bottom <= 0 || b.top >= vh) return;
            var dist = Math.abs((b.top + b.height / 2) - mid);
            if (dist < vh * 0.32 && dist < bestDist) { bestDist = dist; best = r; }
          });
          if (best) playRow(best); else { stopRow(playingRow); playingRow = null; }
        };
        var ticking = false;
        var onScrollCentral = function () {
          if (ticking) return; ticking = true;
          requestAnimationFrame(function () { ticking = false; pickCentral(); });
        };
        window.addEventListener("scroll", onScrollCentral, { passive: true });
        window.addEventListener("resize", onScrollCentral, { passive: true });
        var io3 = new IntersectionObserver(onScrollCentral, { threshold: [0, 0.5, 1] });
        rows.forEach(function (r) { io3.observe(r); });
        pickCentral();
        grid.addEventListener("keydown", function (e) {
          if (e.key !== "Enter" && e.key !== " ") return;
          var r = e.target.closest(".film-row[data-film]"); if (!r) return;
          e.preventDefault(); open(+r.getAttribute("data-film"));
        });
      }
    }
  }
})();

/* ===== Nav: active-link highlight + Work dropdown ===== */
(function () {
  "use strict";
  var path = (location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll("#primary-nav a").forEach(function (a) {
    if (a.getAttribute("href") === path) {
      a.setAttribute("aria-current", "page");
      var dd = a.closest(".nav-dropdown");
      if (dd) { var t = dd.querySelector(".nav-drop-toggle"); if (t) t.classList.add("active"); }
    }
  });
  document.querySelectorAll(".nav-drop-toggle").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var dd = btn.closest(".nav-dropdown");
      var open = dd.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
})();

/* ===== Masonry gallery + filters + lightbox (images, PDFs, video) ===== */
(function () {
  "use strict";
  var grid = document.getElementById("gallery-grid");
  if (!grid) return;
  var items = (window.OTG_GALLERY || []).filter(function (x) { return x && (x.src || x.video || (x.pages && x.pages.length)); });
  var esc = function (s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  if (!items.length) {
    grid.outerHTML = '<div class="gallery-empty"><h3>Work coming soon</h3><p>New work is being added to this gallery. Please check back shortly.</p></div>';
    return;
  }
  var SITE = "https://onthegroundproductions.com";
  var filters = (window.OTG_FILTERS || []).map(function (f) {
    return typeof f === "string" ? { tag: f.toLowerCase(), label: f } : { tag: String(f.tag).toLowerCase(), label: f.label || f.tag, heading: f.heading, desc: f.desc };
  });
  var cover = function (it) { return it.video ? (it.poster || "") : (it.pages && it.pages.length ? it.pages[0] : it.src); };
  var editorial = window.OTG_LAYOUT === "editorial";

  var html = "", ld = [];
  items.forEach(function (it, i) {
    var tags = (it.tags || []).map(function (t) { return String(t).toLowerCase(); });
    var cap = it.title || it.caption || "";
    var badge = "";
    if (it.video) badge = '<span class="play-badge" aria-hidden="true">&#9654;</span>';
    else if (it.experience) badge = '<span class="play-badge" aria-hidden="true">&#9654;</span>';
    else if (it.pages && it.pages.length > 1) badge = '<span class="pdf-badge">PDF &middot; ' + it.pages.length + ' pages</span>';
    else if (it.pdf) badge = '<span class="pdf-badge">PDF</span>';
    var isPhoto = !it.video && !it.experience && !(it.pages && it.pages.length);
    var cvFull = cover(it);
    var cv = isPhoto ? otgThumb(cvFull) : cvFull, cwp = otgWebp(cv);
    var dim = (window.OTG_DIMS && window.OTG_DIMS[cvFull]) || null;
    var dimAttr = dim ? ' width="' + dim[0] + '" height="' + dim[1] + '"' : '';
    var cimg = '<img loading="lazy" decoding="async"' + dimAttr + ' src="' + esc(cv) + '" alt="' + esc(it.title || it.caption || "Portfolio item") + '">';
    var cmedia = cwp ? '<picture><source type="image/webp" srcset="' + esc(cwp) + '">' + cimg + '</picture>' : cimg;
    if (editorial) {
      var catLabel = ""; filters.forEach(function (fl) { if (!catLabel && tags.indexOf(fl.tag) >= 0) catLabel = fl.label; });
      var go = it.experience ? "Open experience" : (it.video ? "Watch" : (it.pages && it.pages.length ? "View" : "View"));
      html +=
        '<figure data-index="' + i + '" data-tags="' + esc(tags.join(" ")) + '" class="work-row">' +
          '<div class="wr-media">' + cmedia + badge + '</div>' +
          '<div class="wr-text">' +
            (catLabel ? '<span class="wr-cat">' + esc(catLabel) + '</span>' : '') +
            '<h3>' + esc(cap || "Untitled") + '</h3>' +
            '<span class="wr-go">' + go + ' &#8599;</span>' +
          '</div>' +
        '</figure>';
    } else {
      html +=
        '<figure data-index="' + i + '" data-tags="' + esc(tags.join(" ")) + '">' +
          cmedia +
          badge +
          (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '') +
        '</figure>';
    }
    ld.push({ "@type": it.video ? "VideoObject" : "ImageObject", "position": i + 1,
      "name": it.title || undefined, "caption": it.caption || it.title || undefined,
      "description": it.video ? (it.description || ((it.title || "Motion graphic") + ", a motion graphics piece by On The Ground Productions.")) : undefined,
      "contentUrl": (function (u) { return u.indexOf("http") === 0 ? u : SITE + "/" + u.replace(/^\//, ""); })(it.video || cover(it)),
      "thumbnailUrl": it.video && it.poster ? [SITE + "/" + it.poster.replace(/^\//, "")] : undefined,
      "uploadDate": it.video ? "2026-01-01" : undefined });
  });
  grid.innerHTML = html;
  if (editorial) grid.classList.add("gallery--editorial");

  /* Hover preview: motion graphics autoplay (muted, looping) while the pointer is over the tile */
  if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    Array.prototype.slice.call(grid.querySelectorAll("figure")).forEach(function (fig) {
      var it = items[+fig.getAttribute("data-index")];
      if (!it || !it.video) return;
      fig.classList.add("has-hover-vid"); // magnifier lens skips these tiles
      var v = null;
      fig.addEventListener("mouseenter", function () {
        if (!v) {
          v = document.createElement("video");
          v.className = "hover-vid"; v.muted = true; v.loop = true; v.playsInline = true;
          v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
          v.preload = "auto"; v.src = it.video;
          v.addEventListener("playing", function () { if (fig.matches(":hover")) fig.classList.add("is-previewing"); });
          fig.insertBefore(v, fig.firstChild.nextSibling);
        }
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      });
      fig.addEventListener("mouseleave", function () {
        fig.classList.remove("is-previewing");
        if (v) { v.pause(); try { v.currentTime = 0; } catch (e) {} }
      });
    });
  }

  /* Smooth fade-in as each thumbnail decodes (prevents jittery pop-in, esp. on mobile) */
  Array.prototype.slice.call(grid.querySelectorAll("img")).forEach(function (img) {
    if (img.complete && img.naturalWidth) return; // already cached: leave fully visible
    img.classList.add("img-fade");
    var done = function () { img.classList.add("is-loaded"); };
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });

  var s = document.createElement("script");
  s.type = "application/ld+json";
  s.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "ImageGallery",
    "name": document.title, "url": location.href,
    "associatedMedia": ld.map(function (o) { Object.keys(o).forEach(function (k) { if (o[k] === undefined) delete o[k]; }); return o; }) });
  document.head.appendChild(s);

  var figures = Array.prototype.slice.call(grid.querySelectorAll("figure"));
  function applyFilter(tag) {
    figures.forEach(function (fig) {
      var t = fig.getAttribute("data-tags").split(" ");
      fig.style.display = (tag === "*" || t.indexOf(tag) >= 0) ? "" : "none";
    });
  }
  if (filters.length) {
    var bar = document.createElement("div");
    bar.className = "gallery-filters";
    var hideAll = !!window.OTG_HIDE_ALL;
    var btns = hideAll ? "" : '<button class="gf-btn active" data-tag="*">All</button>';
    filters.forEach(function (f, i) { btns += '<button class="gf-btn' + (hideAll && i === 0 ? ' active' : '') + '" data-tag="' + esc(f.tag) + '">' + esc(f.label) + '</button>'; });
    bar.innerHTML = btns;
    grid.parentNode.insertBefore(bar, grid);

    var intro = document.createElement("div");
    intro.className = "gallery-intro";
    grid.parentNode.insertBefore(intro, grid);
    function setIntro(tag) {
      var f = null;
      filters.forEach(function (x) { if (x.tag === tag) f = x; });
      if (f && f.desc) {
        intro.innerHTML = '<p class="lead">' + esc(f.desc) + '</p>';
        intro.style.display = "";
      } else { intro.innerHTML = ""; intro.style.display = "none"; }
    }

    if (hideAll && filters[0]) { applyFilter(filters[0].tag); setIntro(filters[0].tag); }
    else setIntro("*");
    bar.addEventListener("click", function (e) {
      var b = e.target.closest(".gf-btn"); if (!b) return;
      bar.querySelectorAll(".gf-btn").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active"); var tag = b.getAttribute("data-tag"); applyFilter(tag); setIntro(tag);
    });
  }

  /* lightbox: slides = [{src|video, poster, download, caption}] */
  var lb = document.createElement("div");
  lb.className = "lightbox"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
  lb.innerHTML =
    '<button class="lb-btn lb-close" aria-label="Close">&times;</button>' +
    '<button class="lb-btn lb-prev" aria-label="Previous">&#8249;</button>' +
    '<button class="lb-btn lb-next" aria-label="Next">&#8250;</button>' +
    '<a class="lb-btn lb-download" aria-label="Download" target="_blank" rel="noopener" download><span>&#8681;</span></a>' +
    '<figure><img alt=""><video controls playsinline style="display:none"></video><figcaption></figcaption></figure>';
  document.body.appendChild(lb);
  var lbImg = lb.querySelector("img"), lbVid = lb.querySelector("video"),
      lbCap = lb.querySelector("figcaption"), lbDl = lb.querySelector(".lb-download");
  var slides = [], pos = 0;

  function stopVideo() { try { lbVid.pause(); lbVid.removeAttribute("src"); lbVid.load(); } catch (e) {} }

  function show(p) {
    if (!slides.length) return;
    stopVideo();
    pos = (p + slides.length) % slides.length;
    var sl = slides[pos];
    if (sl.video) {
      lbImg.style.display = "none";
      lbVid.style.display = ""; lbVid.src = sl.video;
      if (sl.poster) lbVid.poster = sl.poster; else lbVid.removeAttribute("poster");
      // Motion graphics on mobile: hide the lingering native controls and loop the clip
      var hideCtl = sl.noCtl && window.matchMedia && window.matchMedia("(max-width: 760px)").matches;
      if (hideCtl) { lbVid.removeAttribute("controls"); lbVid.loop = true; }
      else { lbVid.setAttribute("controls", ""); lbVid.loop = false; }
      // If the browser refuses to autoplay (e.g. iOS Low Power Mode), bring the controls back so it can still be started
      var pr = lbVid.play();
      if (pr && pr.catch) pr.catch(function () { if (lbVid.getAttribute("src")) lbVid.setAttribute("controls", ""); });
    } else {
      lbVid.style.display = "none";
      lbImg.style.display = ""; lbImg.src = sl.src; lbImg.alt = sl.caption || "Portfolio image";
    }
    lbCap.textContent = sl.caption || ""; lbCap.style.display = sl.caption ? "" : "none";
    if (sl.download) { lbDl.href = sl.download; lbDl.style.display = "flex"; } else { lbDl.style.display = "none"; }
  }
  function openSlides(arr, start) {
    slides = arr;
    var multi = slides.length > 1;
    lb.querySelector(".lb-prev").style.display = multi ? "" : "none";
    lb.querySelector(".lb-next").style.display = multi ? "" : "none";
    show(start || 0); lb.classList.add("open"); document.body.style.overflow = "hidden";
  }
  function close() { stopVideo(); lb.classList.remove("open"); document.body.style.overflow = ""; }

  /* immersive experience overlay (full-screen in-site iframe) */
  var immOv = null;
  function openExperience(it) {
    if (!immOv) {
      immOv = document.createElement("div");
      immOv.className = "imm-overlay"; immOv.setAttribute("role", "dialog"); immOv.setAttribute("aria-modal", "true"); immOv.setAttribute("aria-label", "Immersive experience");
      immOv.innerHTML = '<div class="imm-frame-wrap"><button class="imm-close" aria-label="Close">&times;</button><iframe class="imm-frame" title="Immersive experience" allow="autoplay; fullscreen"></iframe></div>';
      document.body.appendChild(immOv);
      immOv.addEventListener("click", function (e) { if (e.target === immOv) closeExperience(); });
      immOv.querySelector(".imm-close").addEventListener("click", closeExperience);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && immOv.classList.contains("open")) closeExperience(); });
    }
    var fr = immOv.querySelector(".imm-frame");
    var sd = window.OTG_IMMERSIVE_SRCDOC && window.OTG_IMMERSIVE_SRCDOC[it.experience];
    fr.addEventListener("load", function () { try { fr.contentWindow.focus(); } catch (e) {} }, { once: true });
    if (sd) { fr.removeAttribute("src"); fr.srcdoc = sd; } else { fr.removeAttribute("srcdoc"); fr.src = it.experience; }
    immOv.classList.add("open"); document.documentElement.style.overflow = "hidden";
    setTimeout(function () { try { fr.focus(); if (fr.contentWindow) fr.contentWindow.focus(); } catch (e) {} }, 90);
  }
  function closeExperience() {
    if (!immOv) return;
    immOv.classList.remove("open"); document.documentElement.style.overflow = "";
    var fr = immOv.querySelector(".imm-frame"); fr.removeAttribute("src"); fr.removeAttribute("srcdoc");
  }

  grid.addEventListener("click", function (e) {
    var fig = e.target.closest("figure"); if (!fig || fig.style.display === "none") return;
    var it = items[+fig.getAttribute("data-index")];
    if (it.experience) { openExperience(it); return; }
    if (it.pages && it.pages.length) {
      openSlides(it.pages.map(function (p, k) {
        return { src: p, download: it.pdf || null, caption: (it.title || "") + " - page " + (k + 1) + "/" + it.pages.length };
      }), 0);
    } else {
      // images + videos in the current filter form one set you can arrow through
      var visMedia = figures.filter(function (f) { var x = items[+f.getAttribute("data-index")]; return f.style.display !== "none" && !x.pages && !x.experience; });
      var arr = visMedia.map(function (f) {
        var x = items[+f.getAttribute("data-index")];
        var xtags = (x.tags || []).map(function (t) { return String(t).toLowerCase(); });
        return x.video
          ? { video: x.video, poster: x.poster || null, download: x.download || null, caption: x.title || x.caption || "", noCtl: xtags.indexOf("motion") >= 0 }
          : { src: x.src, download: x.pdf || null, caption: x.title || x.caption || "" };
      });
      var start = visMedia.indexOf(fig);
      openSlides(arr, start < 0 ? 0 : start);
    }
  });
  /* Touch: tap a control-less (motion) clip to pause / resume it; swipe left / right to move between items */
  lbVid.addEventListener("click", function () {
    if (lbVid.hasAttribute("controls")) return;
    if (lbVid.paused) { var q = lbVid.play(); if (q && q.catch) q.catch(function () {}); } else lbVid.pause();
  });
  var tsX = null, tsY = null;
  lb.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) { tsX = null; return; }
    tsX = e.touches[0].clientX; tsY = e.touches[0].clientY;
  }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (tsX === null || slides.length < 2) { tsX = null; return; }
    var t = e.changedTouches[0], dx = t.clientX - tsX, dy = t.clientY - tsY; tsX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(pos + (dx < 0 ? 1 : -1));
  }, { passive: true });
  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", function () { show(pos - 1); });
  lb.querySelector(".lb-next").addEventListener("click", function () { show(pos + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(pos - 1);
    else if (e.key === "ArrowRight") show(pos + 1);
  });

  /* Scroll reveal: gallery tiles fade + rise (staggered), section intro eases in */
  (function () {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var els = Array.prototype.slice.call(grid.querySelectorAll("figure"));
    var introEl = grid.parentNode.querySelector(".gallery-intro");
    if (introEl) els.unshift(introEl);
    if (!els.length) return;
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("g-reveal", "in"); }); return; }
    els.forEach(function (el, i) { el.classList.add("g-reveal"); el.style.transitionDelay = (Math.min(i % 6, 5) * 0.06) + "s"; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
    // when switching tabs, make sure any freshly shown tile is visible
    grid.parentNode.addEventListener("click", function (e) {
      if (!e.target.closest(".gf-btn")) return;
      requestAnimationFrame(function () {
        grid.querySelectorAll("figure").forEach(function (f) { if (f.style.display !== "none") f.classList.add("in"); });
      });
    });
  })();
})();

/* Header shrink on scroll */
(function () {
  var h = document.querySelector(".site-header");
  if (!h) return;
  var onScroll = function () { h.classList.toggle("scrolled", window.scrollY > 40); };
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
})();

/* Hero logo video: play once on load and once per theme toggle.
   No IntersectionObserver: showing the incoming video on toggle used to make the
   observer start it, then the toggle restarted it -> the "double start". */
(function () {
  var light = document.querySelector(".hero-motion");
  var dark  = document.querySelector(".hero-motion-dark");
  if (!light && !dark) return;
  function playActive(){
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var active = isDark ? dark : light;
    var other  = isDark ? light : dark;
    if (other) { try { other.pause(); other.currentTime = 0; } catch (e) {} }
    if (active) { try { active.currentTime = 0; var p = active.play(); if (p && p.catch) p.catch(function(){}); } catch (e) {} }
  }
  window.__otgPlayHero = playActive;
  // Blank the INCOMING video before a theme cross-fade so the transition
  // never snapshots its finished frame (which caused a "complete then replay").
  window.__otgResetHero = function(next){
    var incoming = (next === "dark") ? dark : light;
    if (incoming) { try { incoming.pause(); incoming.currentTime = 0; } catch (e) {} }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", playActive);
  else playActive();
})();

/* Deter image saving: block right-click (except in form fields) and image dragging.
   Note: a deterrent, not true protection, images must reach the browser to display. */
(function () {
  document.addEventListener("contextmenu", function (e) {
    if (e.target && e.target.closest && e.target.closest("input, textarea")) return;
    e.preventDefault();
  });
  document.addEventListener("dragstart", function (e) {
    if (e.target && e.target.closest && e.target.closest("img, picture, video")) e.preventDefault();
  });
})();

/* Glass magnifier lens over interactive work (fine-pointer devices only).
   Magnifies the whole element beneath, image, copy and arrows together. */
(function () {
  if (!window.matchMedia || !window.matchMedia("(pointer:fine)").matches) return;
  var sel = ".work-tile, .film-feature, .film-card, .gallery figure, .service-media, .press-card";
  var ZOOM = 1.7;                 // magnification factor
  var lens = document.createElement("div");
  lens.className = "otg-lens";
  var stage = document.createElement("div");
  stage.className = "otg-lens-stage";
  lens.appendChild(stage);
  document.body.appendChild(lens);
  var cur = null;

  function R() { return lens.offsetWidth || 150; }
  function build(t) {
    var clone = t.cloneNode(true);
    clone.classList.add("otg-clone");
    clone.removeAttribute("id");
    clone.style.cssText = "position:absolute;inset:0;margin:0;width:100%;height:100%;transform:none;opacity:1;";
    stage.innerHTML = "";
    stage.appendChild(clone);
  }
  // Overlay the element 1:1 inside the lens (screen-space), then scale about the
  // cursor. Immune to the element's own hover transforms/scale.
  function place(e) {
    if (!cur) return;
    var rect = cur.getBoundingClientRect();
    var r = R() / 2;
    lens.style.left = e.clientX + "px";
    lens.style.top = e.clientY + "px";
    var sx = rect.left - e.clientX + r;   // element top-left in lens-local coords
    var sy = rect.top - e.clientY + r;
    stage.style.width = rect.width + "px";
    stage.style.height = rect.height + "px";
    stage.style.left = sx + "px";
    stage.style.top = sy + "px";
    stage.style.transformOrigin = (r - sx) + "px " + (r - sy) + "px"; // lens centre, in stage coords
    stage.style.transform = "scale(" + ZOOM + ")";
  }
  document.addEventListener("mouseover", function (e) {
    var t = e.target.closest && e.target.closest(sel);
    if (t && t.classList.contains("has-hover-vid")) { if (cur) { cur = null; lens.classList.remove("show"); } return; }
    if (t && t !== cur) { cur = t; build(t); lens.classList.add("show"); place(e); }
    else if (t) { place(e); }
  });
  document.addEventListener("mouseout", function (e) {
    if (cur) {
      var to = e.relatedTarget;
      if (!(to && to.closest && to.closest(sel))) { cur = null; lens.classList.remove("show"); }
    }
  });
  document.addEventListener("mousemove", function (e) { if (cur) place(e); }, { passive: true });
  // Hide the magnifier while scrolling so it never freezes as a stray disc over the tiles.
  window.addEventListener("scroll", function () { if (cur) { cur = null; lens.classList.remove("show"); } }, { passive: true });
})();

/* FAQ accordion: only one open at a time (fallback for browsers without native <details name>) */
(function () {
  var items = document.querySelectorAll('details.faq-item[name]');
  if (!items.length) return;
  items.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      items.forEach(function (o) { if (o !== d && o.getAttribute('name') === d.getAttribute('name')) o.open = false; });
    });
  });
})();

/* Footer reveal: on pages using <main class="stack">, the footer is fixed
   behind the page. Reserve exactly its height so the page lifts to reveal it. */
(function () {
  var m = document.querySelector("main.stack");
  var end = document.querySelector(".site-end");
  if (!m || !end) return;
  // Smallest visible screen height (iOS toolbars showing), so the decision doesn't flip while scrolling.
  var probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none;";
  document.body.appendChild(probe);
  function setH() {
    document.body.classList.add("reveal-on");
    var h = end.offsetHeight, vh = probe.offsetHeight || window.innerHeight;
    // If the closing block is taller than the screen its top would be cut off and unreachable
    // (it is fixed to the bottom). In that case fall back to a normal, scrollable footer.
    // (Empty padding above the first heading may be cut; real content may not.)
    var first = end.querySelector("h1, h2, h3, p, a, img"), pad = 0;
    if (first) pad = Math.max(0, first.getBoundingClientRect().top - end.getBoundingClientRect().top - 20);
    if (h - pad > vh) { document.body.classList.remove("reveal-on"); document.documentElement.style.removeProperty("--otg-end-h"); return; }
    document.documentElement.style.setProperty("--otg-end-h", h + "px");
  }
  setH();
  window.addEventListener("resize", setH);
  window.addEventListener("load", setH);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(setH); }
})();

/* Open film cards (a.cs-film) in an in-page video overlay instead of a new tab. */
(function () {
  var links = document.querySelectorAll("a.cs-film");
  if (!links.length) return;
  function ytId(url) {
    var m = String(url || "").match(/(?:v=|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : null;
  }
  var ov = document.createElement("div");
  ov.className = "vid-overlay";
  ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Video player");
  ov.innerHTML = '<button class="vid-close" type="button" aria-label="Close video">&times;</button>' +
                 '<div class="vid-frame"><iframe title="Video player" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div>';
  document.body.appendChild(ov);
  var frame = ov.querySelector("iframe");
  function open(id) { frame.src = "https://www.youtube.com/embed/" + id + "?autoplay=1&rel=0"; ov.classList.add("open"); document.documentElement.style.overflow = "hidden"; }
  function close() { ov.classList.remove("open"); frame.src = ""; document.documentElement.style.overflow = ""; }
  links.forEach(function (a) {
    a.removeAttribute("target"); a.removeAttribute("rel");
    a.addEventListener("click", function (e) {
      var id = ytId(a.getAttribute("href"));
      if (!id) return;              // non-YouTube: allow normal navigation
      e.preventDefault(); open(id);
    });
  });
  ov.querySelector(".vid-close").addEventListener("click", close);
  ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov.classList.contains("open")) close(); });
})();

/* Lazy-play deferred videos (e.g. the home "Selected work" tile) only when
   they scroll near the viewport, so they don't compete with LCP on load. */
(function () {
  var vids = document.querySelectorAll("video[data-lazyplay]");
  if (!vids.length) return;
  if (!("IntersectionObserver" in window)) {
    vids.forEach(function (v) { try { v.play(); } catch (e) {} });
    return;
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) { try { var p = v.play(); if (p && p.catch) p.catch(function(){}); } catch (e2) {} }
      else { try { v.pause(); } catch (e3) {} }
    });
  }, { rootMargin: "200px 0px", threshold: 0.1 });
  vids.forEach(function (v) { io.observe(v); });
})();

/* ===== Scroll-tilt for the homepage "Selected work" grid ===== */
(function () {
  var grid = document.querySelector(".work-grid");
  if (!grid) return;
  var MAX = 22; // max lean in degrees
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var target = 0, current = 0, ticking = false;
  function read() {
    if (window.innerWidth < 760 || reduced) { target = 0; return; }
    var r = grid.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var centre = r.top + r.height / 2;
    var below = centre - vh / 2;
    target = Math.min(1, Math.max(0, below / (vh * 0.55)));
  }
  function apply(p) { grid.style.setProperty("--wtilt", (p * MAX).toFixed(2) + "deg"); }
  function frame() {
    current += (target - current) * 0.16;
    if (Math.abs(target - current) < 0.001) current = target;
    apply(current);
    if (current !== target) { requestAnimationFrame(frame); } else { ticking = false; }
  }
  function schedule() { read(); if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  schedule();
})();

/* ===== Case studies: ltr (left->right) scroll swing per row ===== */
(function () {
  var rows = [].slice.call(document.querySelectorAll(".cs-tilt"));
  if (!rows.length) return;
  var MAX = 30;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var raf = false;
  function paint() {
    raf = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var small = window.innerWidth < 760 || reduced;
    rows.forEach(function (row) {
      if (small) { row.style.setProperty("--csy", "0deg"); row.style.setProperty("--csz", "1"); return; }
      var r = row.getBoundingClientRect();
      var centre = r.top + r.height / 2;
      var p = Math.max(0, Math.min(1, (centre - vh / 2) / (vh * 0.6)));
      row.style.setProperty("--csy", (-(p * MAX)).toFixed(2) + "deg");
      row.style.setProperty("--csz", (1 + p * 0.04).toFixed(3));
    });
  }
  function schedule() { if (!raf) { raf = true; requestAnimationFrame(paint); } }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  schedule();
})();

/* ---- Light / dark theme toggle ---- */
(function(){
  var root=document.documentElement, btn=document.querySelector('.theme-toggle');
  function sync(t){ var d=(t==='dark'); var lbl=document.querySelector('.theme-label'); if(lbl){ lbl.textContent = d?'Dark':'Light'; } if(!btn) return; btn.setAttribute('aria-pressed', d?'true':'false'); btn.setAttribute('aria-label', d?'Switch to light mode':'Switch to dark mode'); }
  sync(root.getAttribute('data-theme'));
  if(btn){ btn.addEventListener('click', function(){ var t=(root.getAttribute('data-theme')==='dark')?'light':'dark'; if(window.__otgResetHero) window.__otgResetHero(t); function apply(){ root.setAttribute('data-theme',t); try{sessionStorage.setItem('otg-theme',t);}catch(e){} sync(t); } var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches; function afterPlay(){ if(window.__otgPlayHero) window.__otgPlayHero(); } if(document.startViewTransition && !reduce){ var vt=document.startViewTransition(apply); if(vt&&vt.finished&&vt.finished.then){ vt.finished.then(afterPlay); } else { setTimeout(afterPlay,120); } } else { apply(); setTimeout(afterPlay,60); } }); }
})();

/* Disciplines: reveal media on hover (desktop) / when centred (touch); one clip at a time. */
(function () {
  var cards = document.querySelectorAll(".disc");
  if (!cards.length) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine   = window.matchMedia && matchMedia("(pointer:fine)").matches;
  function setActive(card, on) {
    card.classList.toggle("is-active", on);
    var v = card.querySelector(".disc-vid");
    if (!v) return;
    if (on && !reduce) { try { var p = v.play(); if (p && p.catch) p.catch(function(){}); } catch (e) {} }
    else { try { v.pause(); } catch (e) {} }
  }
  if (fine) {
    cards.forEach(function (c) {
      c.addEventListener("pointerenter", function () { setActive(c, true); });
      c.addEventListener("pointerleave", function () { setActive(c, false); });
    });
  } else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { setActive(e.target, e.isIntersecting && e.intersectionRatio >= 0.6); });
    }, { threshold: [0, 0.6, 1] });
    cards.forEach(function (c) { io.observe(c); });
  }
})();
