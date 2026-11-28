/* OTG free AI search check (/tools/ai-search-check).
   The site's server only fetches public pages (/api/tools/fetch); every check runs here, in the visitor's browser. */
(function () {
  "use strict";
  var form = document.getElementById("ck-form");
  if (!form) return;
  var input = document.getElementById("ck-url");
  var btn = document.getElementById("ck-go");
  var out = document.getElementById("ck-out");
  var prog = document.getElementById("ck-progress");
  var MAX_PAGES = 9; // homepage + 8 more

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function path(u) { try { var x = new URL(u); return (x.pathname + x.search) || "/"; } catch (e) { return u; } }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } }
  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }

  function normalise(v) {
    v = String(v || "").trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = "https://" + v.replace(/^\/+/, "");
    try {
      var u = new URL(v);
      if (!/\./.test(u.hostname)) return null;
      u.hash = "";
      return u.href;
    } catch (e) { return null; }
  }

  function grab(u) {
    return fetch("/api/tools/fetch?url=" + encodeURIComponent(u), { credentials: "same-origin" }).then(function (r) {
      var h = r.headers;
      if (r.status === 429) { var e = new Error("busy"); e.code = "busy"; throw e; }
      return r.text().then(function (body) {
        return {
          req: u, status: +(h.get("X-Status") || 0), error: h.get("X-Error") || "", url: h.get("X-Final-Url") || u,
          ms: +(h.get("X-Ms") || 0), type: (h.get("X-Type") || "").toLowerCase(), xrobots: (h.get("X-Upstream-Robots") || "").toLowerCase(),
          skipped: h.get("X-Skipped") || "", body: body, bytes: new Blob([body]).size
        };
      });
    });
  }

  /* Google PageSpeed Insights, mobile (through our server, which holds the API key) */
  function phoneSpeed(u) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 80000);
    return fetch("/api/tools/speed?url=" + encodeURIComponent(u), { credentials: "same-origin", signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        clearTimeout(timer);
        var lr = j && j.lighthouseResult;
        if (!lr || !lr.categories || !lr.categories.performance || lr.categories.performance.score == null) return null;
        var A = lr.audits || {};
        var m = function (id, label) { var a = A[id]; return a ? { label: label, value: a.displayValue || "", score: a.score } : null; };
        var metrics = [m("first-contentful-paint", "First text or image shows"), m("largest-contentful-paint", "Main content shows (LCP)"),
          m("total-blocking-time", "Time the page is frozen (TBT)"), m("cumulative-layout-shift", "How much the page jumps (CLS)"), m("speed-index", "Speed Index")].filter(Boolean);
        var opps = Object.keys(A).map(function (id) { var a = A[id]; a._id = id; return a; }).filter(function (a) {
          var mode = a.scoreDisplayMode || "";
          return a.score != null && a.score < 0.9 && mode !== "informative" && mode !== "notApplicable" && mode !== "manual" &&
            ((a.details && a.details.type === "opportunity") || /-insight$/.test(a._id)) && a.title;
        }).sort(function (a, b) { return a.score - b.score; }).slice(0, 6).map(function (a) { return { title: a.title.replace(/`/g, ""), value: a.displayValue || "", score: a.score }; });
        var le = j.loadingExperience || {};
        return { score: Math.round(lr.categories.performance.score * 100), metrics: metrics, opps: opps, field: le.overall_category || "" };
      })
      .catch(function () { clearTimeout(timer); return null; });
  }

  function pool(items, n, fn) {
    var i = 0, res = new Array(items.length);
    function next() { if (i >= items.length) return Promise.resolve(); var k = i++; return fn(items[k], k).then(function (v) { res[k] = v; }, function () { res[k] = null; }).then(next); }
    var runners = []; for (var j = 0; j < Math.min(n, items.length); j++) runners.push(next());
    return Promise.all(runners).then(function () { return res; });
  }

  /* ---------- reading pages ---------- */
  function flatSchema(doc) {
    var out = [], bad = 0;
    doc.querySelectorAll('script[type="application/ld+json" i]').forEach(function (s) {
      var data;
      try { data = JSON.parse(s.textContent.trim()); } catch (e) { bad++; return; }
      (function walk(n) {
        if (Array.isArray(n)) return n.forEach(walk);
        if (n && typeof n === "object") {
          if (n["@type"]) out.push(n);
          if (n["@graph"]) walk(n["@graph"]);
          Object.keys(n).forEach(function (k) { if (k !== "@graph" && n[k] && typeof n[k] === "object") walk(n[k]); });
        }
      })(data);
    });
    return { items: out, bad: bad };
  }
  function types(n) { return [].concat(n["@type"] || []).map(String); }

  var ORG_RE = /Organization|Business|Service$|Corporation|Store|Restaurant|Agency|Practice|Office|Clinic|Hotel|Shop|Dentist|Attorney|Physician|Contractor|Club|School|College|University|NGO|Brand$/i;
  // Anything else with business-like facts counts too (schema.org has hundreds of LocalBusiness types: Plumber, Bakery...)
  var NOT_ORG = /^(WebSite|WebPage|AboutPage|ContactPage|CollectionPage|ItemPage|FAQPage|QAPage|BreadcrumbList|ListItem|ItemList|Article|BlogPosting|NewsArticle|Blog|Person|Product|Offer|AggregateOffer|ImageObject|VideoObject|Question|Answer|Review|AggregateRating|Rating|PostalAddress|GeoCoordinates|ContactPoint|OpeningHoursSpecification|SearchAction|EntryPoint|Event|Place|Country|City|AdministrativeArea|Thing|CreativeWork|HowTo|Recipe|PropertyValue|SiteNavigationElement|WPHeader|WPFooter)$/;
  function isOrg(n) {
    var t = types(n);
    if (!(n.name || n.url)) return false;
    if (t.some(function (x) { return ORG_RE.test(x); })) return true;
    return !t.some(function (x) { return NOT_ORG.test(x); }) && !!(n.address || n.telephone || n.logo || n.geo || n.openingHours || n.openingHoursSpecification || n.priceRange);
  }

  function readPage(r) {
    var doc = new DOMParser().parseFromString(r.body, "text/html");
    var meta = function (k) { var m = doc.querySelector('meta[name="' + k + '" i], meta[property="' + k + '" i]'); return m ? (m.getAttribute("content") || "") : null; };
    var schema = flatSchema(doc);
    var head = doc.head || doc.documentElement;
    var blocking = Array.prototype.filter.call(head.querySelectorAll("script[src]"), function (s) {
      var t = (s.getAttribute("type") || "").toLowerCase();
      return !s.hasAttribute("async") && !s.hasAttribute("defer") && t !== "module";
    }).length;
    var scriptHosts = {};
    doc.querySelectorAll("script[src]").forEach(function (s) { try { var h = new URL(s.getAttribute("src"), r.url).hostname; if (h !== new URL(r.url).hostname) scriptHosts[h] = 1; } catch (e) {} });
    var imgs = Array.prototype.map.call(doc.querySelectorAll("img"), function (i) {
      return { alt: i.hasAttribute("alt"), sized: (i.hasAttribute("width") && i.hasAttribute("height")) || /aspect-ratio|width\s*:|height\s*:/i.test(i.getAttribute("style") || ""), lazy: (i.getAttribute("loading") || "").toLowerCase() === "lazy" || i.hasAttribute("data-src") };
    });
    var questions = Array.prototype.filter.call(doc.querySelectorAll("h2,h3,h4,summary,dt"), function (h) { return /\?\s*$/.test(h.textContent.trim()); }).length;
    var linksInternal = [];
    var base = new URL(r.url);
    doc.querySelectorAll("a[href]").forEach(function (a) {
      try { var u = new URL(a.getAttribute("href"), r.url); if (u.hostname === base.hostname && /^https?:$/.test(u.protocol)) { u.hash = ""; linksInternal.push(u.href); } } catch (e) {}
    });
    var appShell = !!doc.querySelector("#root, #app, #__next, #__nuxt, #___gatsby, [data-reactroot], [ng-version], app-root") || doc.querySelectorAll("script[src]").length >= 3;
    ["script", "style", "noscript", "template", "svg"].forEach(function (t) { doc.querySelectorAll(t).forEach(function (n) { n.remove(); }); });
    var text = (doc.body ? doc.body.textContent : "").replace(/\s+/g, " ").trim();
    var canon = doc.querySelector('link[rel~="canonical" i]');
    return {
      url: r.url, status: r.status, ms: r.ms, bytes: r.bytes,
      title: (doc.querySelector("title") || { textContent: "" }).textContent.replace(/\s+/g, " ").trim(),
      description: (meta("description") || "").trim(),
      robots: ((meta("robots") || "") + " " + r.xrobots).toLowerCase(),
      viewport: meta("viewport") != null,
      lang: (doc.documentElement.getAttribute("lang") || "").trim(),
      canonical: canon ? canon.getAttribute("href") : "",
      ogImage: meta("og:image"),
      h1: doc.querySelectorAll("h1").length,
      words: text ? text.split(" ").length : 0,
      images: imgs, blocking: blocking, appShell: appShell, scriptHosts: Object.keys(scriptHosts).length,
      styles: doc.querySelectorAll('link[rel~="stylesheet" i]').length,
      schema: schema.items, badSchema: schema.bad, questions: questions,
      dated: !!(doc.querySelector("time[datetime]") || meta("article:modified_time") || meta("article:published_time") || schema.items.some(function (n) { return n.datePublished || n.dateModified; })),
      links: linksInternal
    };
  }

  /* ---------- robots.txt ---------- */
  function parseRobots(txt) {
    var groups = [], cur = null, lastWasUA = false;
    String(txt || "").split(/\r?\n/).forEach(function (line) {
      line = line.replace(/#.*/, "").trim();
      var m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
      if (!m) return;
      var k = m[1].toLowerCase(), v = m[2].trim();
      if (k === "user-agent") {
        if (!cur || !lastWasUA) { cur = { agents: [], rules: [] }; groups.push(cur); }
        cur.agents.push(v.toLowerCase()); lastWasUA = true;
      } else {
        lastWasUA = false;
        if (cur && (k === "allow" || k === "disallow")) cur.rules.push({ allow: k === "allow", path: v });
      }
    });
    return groups;
  }
  function robotsBlocksHome(groups, bot) {
    var b = bot.toLowerCase();
    var g = groups.filter(function (x) { return x.agents.some(function (a) { return a !== "*" && b.indexOf(a) === 0 || a === b; }); });
    if (!g.length) g = groups.filter(function (x) { return x.agents.indexOf("*") > -1; });
    var rules = [].concat.apply([], g.map(function (x) { return x.rules; }));
    var best = null;
    rules.forEach(function (r) {
      var p = r.path.replace(/\*$/, "").replace(/\$$/, "");
      if (r.path === "") return; // empty Disallow = allow everything
      if ("/".indexOf(p) === 0 || p === "") {
        if (!best || p.length > best.p.length || (p.length === best.p.length && r.allow)) best = { p: p, allow: r.allow };
      }
    });
    return !!(best && !best.allow);
  }

  var ANSWER_BOTS = [
    { ua: "OAI-SearchBot", who: "ChatGPT search" },
    { ua: "ChatGPT-User", who: "ChatGPT opening a link" },
    { ua: "PerplexityBot", who: "Perplexity" },
    { ua: "Perplexity-User", who: "Perplexity opening a link" },
    { ua: "Claude-SearchBot", who: "Claude search" },
    { ua: "Claude-User", who: "Claude opening a link" },
    { ua: "Googlebot", who: "Google, AI Overviews and AI Mode" },
    { ua: "Bingbot", who: "Bing and Copilot (ChatGPT also draws on Bing)" },
    { ua: "Applebot", who: "Siri and Apple Intelligence" }
  ];
  var TRAINING_BOTS = [
    { ua: "GPTBot", who: "OpenAI model training" },
    { ua: "ClaudeBot", who: "Anthropic model training" },
    { ua: "Google-Extended", who: "Gemini model training" },
    { ua: "CCBot", who: "Common Crawl (used by many AI models)" }
  ];

  /* ---------- the check ---------- */
  function step(msg, done) {
    var li = document.createElement("li");
    li.textContent = msg;
    if (done) li.className = "done";
    prog.appendChild(li);
    return li;
  }

  function run(start) {
    out.innerHTML = "";
    prog.innerHTML = "";
    prog.hidden = false;
    btn.disabled = true; btn.setAttribute("aria-busy", "true");
    var speedP = Promise.resolve(null);
    var origin, home, robotsTxt = "", robotsOk = false, llms = null, sitemapUrls = [], sitemapFound = false, pages = [], broken = [];
    var s1 = step("Reading " + host(start) + "…");

    return grab(start).then(function (r) {
      if (!r.status && /^https:/.test(start)) return grab(start.replace(/^https:/, "http:"));
      return r;
    }).then(function (r) {
      s1.className = "done";
      if (!r.status) throw Object.assign(new Error("unreachable"), { code: r.error === "bad-url" ? "bad-url" : "unreachable" });
      if (r.status >= 400) throw Object.assign(new Error("status"), { code: "status", status: r.status });
      if (r.type && !/html/.test(r.type)) throw Object.assign(new Error("nothtml"), { code: "nothtml" });
      home = readPage(r);
      origin = new URL(r.url).origin;
      speedP = phoneSpeed(r.url);
      var s2 = step("Checking robots.txt, sitemap and llms.txt…");
      return Promise.all([grab(origin + "/robots.txt"), grab(origin + "/llms.txt")]).then(function (rs) {
        var rb = rs[0], ll = rs[1];
        if (rb.status === 200 && !/html/.test(rb.type) && !/<html/i.test(rb.body.slice(0, 500))) { robotsTxt = rb.body; robotsOk = true; }
        if (ll.status === 200 && !/html/.test(ll.type) && !/<html/i.test(ll.body.slice(0, 500)) && ll.body.trim().length > 40) llms = ll.body;
        var maps = (robotsTxt.match(/^\s*sitemap\s*:\s*(\S+)/gim) || []).map(function (l) { return l.replace(/^\s*sitemap\s*:\s*/i, ""); });
        if (!maps.length) maps = [origin + "/sitemap.xml", origin + "/sitemap_index.xml"];
        return readSitemaps(maps.slice(0, 3)).then(function () { s2.className = "done"; });
      });
    }).then(function () {
      var cand = sitemapUrls.length ? sitemapUrls : home.links;
      var seen = {}; seen[home.url.replace(/\/$/, "")] = 1;
      var list = [];
      cand.forEach(function (u) {
        try {
          var x = new URL(u);
          if (x.hostname.replace(/^www\./, "") !== host(origin)) return;
          if (/\.(pdf|jpe?g|png|gif|webp|svg|mp4|mov|zip|xml|txt|docx?)$/i.test(x.pathname)) return;
          var k = x.href.replace(/\/$/, "");
          if (seen[k]) return; seen[k] = 1; list.push(x.href);
        } catch (e) {}
      });
      // a spread of pages: shortest paths first (main sections), then the rest
      list.sort(function (a, b) { return path(a).split("/").length - path(b).split("/").length || path(a).length - path(b).length; });
      list = list.slice(0, MAX_PAGES - 1);
      var s3 = step("Reading " + plural(list.length, "more page") + "…");
      var n = 0;
      return pool(list, 4, function (u) {
        return grab(u).then(function (r) {
          n++; s3.textContent = "Reading pages… " + n + " of " + list.length;
          if (!r.status || r.status >= 400) { broken.push({ url: u, status: r.status || "no answer" }); return null; }
          if (r.type && !/html/.test(r.type)) return null;
          return readPage(r);
        });
      }).then(function (res) { pages = [home].concat(res.filter(Boolean)); s3.className = "done"; });
    }).then(function () {
      var s4 = step("Running Google's phone speed test (this part takes up to a minute)…");
      return speedP.then(function (ps) { s4.className = "done"; return ps; });
    }).then(function (psi) {
      step("Scoring…", true);
      var result = score({ psi: psi, origin: origin, home: home, pages: pages, broken: broken, robotsTxt: robotsTxt, robotsOk: robotsOk, llms: llms, sitemapFound: sitemapFound, sitemapCount: sitemapUrls.length });
      render(result);
      prog.hidden = true;
      logCheck(result);
    }).catch(function (e) {
      prog.hidden = true;
      renderError(e, start);
    }).then(function () {
      btn.disabled = false; btn.removeAttribute("aria-busy");
    });

    function readSitemaps(list) {
      return pool(list, 3, function (u) { return grab(u); }).then(function (rs) {
        var children = [];
        rs.forEach(function (r) {
          if (!r || r.status !== 200 || !/<(urlset|sitemapindex)/i.test(r.body.slice(0, 3000))) return;
          sitemapFound = true;
          var doc = new DOMParser().parseFromString(r.body, "application/xml");
          var locs = Array.prototype.map.call(doc.getElementsByTagName("loc"), function (l) { return l.textContent.trim(); });
          if (doc.getElementsByTagName("sitemapindex").length) children = children.concat(locs);
          else sitemapUrls = sitemapUrls.concat(locs);
        });
        if (children.length && !sitemapUrls.length) {
          // prefer page sitemaps over post/product/image ones
          children.sort(function (a, b) { return (/page/i.test(b) ? 1 : 0) - (/page/i.test(a) ? 1 : 0); });
          return pool(children.slice(0, 2), 2, function (u) { return grab(u); }).then(function (rs2) {
            rs2.forEach(function (r) {
              if (!r || r.status !== 200) return;
              var doc = new DOMParser().parseFromString(r.body, "application/xml");
              sitemapUrls = sitemapUrls.concat(Array.prototype.map.call(doc.getElementsByTagName("loc"), function (l) { return l.textContent.trim(); }));
            });
          });
        }
      });
    }
  }

  /* ---------- scoring ---------- */
  function score(d) {
    var home = d.home, pages = d.pages, total = pages.length;
    var robots = parseRobots(d.robotsTxt);
    var bots = ANSWER_BOTS.map(function (b) { return { ua: b.ua, who: b.who, blocked: robotsBlocksHome(robots, b.ua) }; });
    var trainers = TRAINING_BOTS.map(function (b) { return { ua: b.ua, who: b.who, blocked: robotsBlocksHome(robots, b.ua) }; });
    var allSchema = [].concat.apply([], pages.map(function (p) { return p.schema; }));
    var org = null;
    allSchema.forEach(function (n) { if (isOrg(n)) { if (!org || Object.keys(n).length > Object.keys(org).length) org = n; } });
    var noindexHome = /noindex/.test(home.robots);
    var fixes = [], good = [];
    function fix(tier, title, why, where) { fixes.push({ tier: tier, title: title, why: why, where: where || [] }); }

    /* AI search readiness, out of 100 */
    var ai = [];
    var blockedCore = bots.filter(function (b) { return b.blocked; });
    ai.push({ label: "AI answer engines can read the site", max: 25, pts: 25 * (bots.length - blockedCore.length) / bots.length });
    if (blockedCore.length) fix(blockedCore.some(function (b) { return /Googlebot|Bingbot/.test(b.ua); }) ? 0 : 0, "Let AI search crawlers in", "robots.txt blocks " + blockedCore.map(function (b) { return b.who; }).join(", ") + ". Blocked crawlers can't read the site, so those assistants can't recommend it. Allow them in robots.txt and check your firewall or CDN's bot settings too.");
    else good.push("Every major AI search crawler is allowed in");

    ai.push({ label: "Home page can appear in search", max: 10, pts: noindexHome ? 0 : 10 });
    if (noindexHome) fix(0, "Remove noindex from the home page", "The home page tells search engines not to list it, so Google, Bing and every AI assistant that relies on them will leave it out.");

    var w = home.words;
    ai.push({ label: "Words are in the page itself, not only drawn by JavaScript", max: 10, pts: w >= 150 ? 10 : w >= 50 ? 5 : 0 });
    if (w < 50 && home.appShell) fix(0, "Put the words in the page, not only in JavaScript", "The home page arrives with almost no text (" + w + " words). Most AI crawlers don't run JavaScript, so to them the page is nearly empty. Server-render or pre-render the content.");
    else if (w < 150) fix(w < 50 ? 0 : 1, "Say more on the home page", "The home page has " + w + " words of text. AI assistants need plain sentences about who you are, what you do and where, to describe you accurately.");

    var facts = 0, factList = [];
    if (org) {
      [["name", org.name], ["web address", org.url], ["logo", org.logo], ["description", org.description], ["address", org.address || org.location],
       ["phone or contact", org.telephone || org.contactPoint || org.email], ["social profiles (sameAs)", org.sameAs], ["image", org.image],
       ["area served", org.areaServed || org.serviceArea], ["founder, founding date or expertise", org.founder || org.foundingDate || org.knowsAbout]
      ].forEach(function (f) { if (f[1]) facts++; else factList.push(f[0]); });
    }
    ai.push({ label: "Business facts in structured data", max: 15, pts: 15 * facts / 10, note: org ? facts + " of 10 facts" : "none found" });
    if (!org) fix(0, "Add your business details as structured data", "No Organization or LocalBusiness schema was found. This is the machine-readable card AI assistants and Google read to learn your name, what you do, where you are and how to contact you.");
    else if (facts < 8) fix(1, "Fill in your business schema", "Your structured data is missing: " + factList.join(", ") + ".");
    else good.push("Business facts are clear in structured data");

    var same = org ? [].concat(org.sameAs || []).length : 0;
    ai.push({ label: "Linked to your other profiles (sameAs)", max: 10, pts: same >= 2 ? 10 : same === 1 ? 5 : 0 });
    if (same < 2) fix(1, "Link your profiles together", "Add sameAs links to your LinkedIn, Instagram, Google Business Profile and similar. It helps AI assistants confirm they've found the right business and not one with a similar name.");

    var faq = allSchema.some(function (n) { return types(n).indexOf("FAQPage") > -1; });
    var qs = pages.reduce(function (a, p) { return a + p.questions; }, 0);
    ai.push({ label: "Answers real questions", max: 10, pts: (faq ? 5 : 0) + (qs >= 3 ? 5 : qs > 0 ? 2 : 0), note: qs + " question headings" + (faq ? ", FAQ schema" : "") });
    if (!faq || qs < 3) fix(1, "Answer the questions people ask", "People ask AI assistants full questions. Add an FAQ with the real questions clients ask (price, timings, area, process), written as headings, and mark it up as FAQPage.");
    else good.push("Answers real questions with FAQ markup");

    ai.push({ label: "llms.txt (a plain summary for AI)", max: 5, pts: d.llms ? 5 : 0 });
    if (!d.llms) fix(2, "Add an llms.txt file", "A short plain-text file at /llms.txt that says who you are, what you do and which pages matter most. It's new and optional, but it's cheap to add and some AI tools read it.");
    else good.push("Has an llms.txt summary for AI");

    var reviews = allSchema.some(function (n) { return n.aggregateRating || n.review || types(n).indexOf("Review") > -1; });
    ai.push({ label: "Reviews visible to machines", max: 5, pts: reviews ? 5 : 0 });
    if (!reviews) fix(2, "Show your reviews on the site", "Show your Google rating or client reviews on the site and mark them up (aggregateRating or Review). Assistants lean towards businesses with visible proof.");

    var dated = pages.some(function (p) { return p.dated; });
    ai.push({ label: "Pages show when they were written or updated", max: 5, pts: dated ? 5 : 0 });
    if (!dated) fix(2, "Date your content", "No published or updated dates found. AI search favours fresh, dated content, especially for articles and news.");

    ai.push({ label: "Sitemap found", max: 5, pts: d.sitemapFound ? 5 : 0 });

    /* Google search, out of 100 */
    var pen = [];
    function share(fn) { return pages.filter(fn); }
    function penal(weight, list, tier, title, why) {
      if (!list.length) return;
      pen.push(weight * list.length / total);
      fix(tier, title, why, list.map(function (p) { return path(p.url); }));
    }
    var https = /^https:/.test(home.url);
    if (!https) { pen.push(15); fix(0, "Move the site to HTTPS", "The site loads without a secure connection. Browsers mark it 'Not secure' and Google ranks secure sites first."); }
    if (noindexHome) pen.push(30);
    if (!home.viewport) { pen.push(8); fix(0, "Make the site mobile-friendly", "There's no viewport tag, so phones show a shrunken desktop page. Google ranks the phone version of your site."); }
    if (d.broken.length) { pen.push(Math.min(12, 3 * d.broken.length)); fix(0, "Fix pages that don't load", plural(d.broken.length, "page") + " in your sitemap or links returned an error.", d.broken.map(function (b) { return path(b.url) + " (" + b.status + ")"; })); }
    penal(10, share(function (p) { return !p.title; }), 0, "Give every page a title", "Pages with no title tag. The title is the blue headline in Google.");
    penal(3, share(function (p) { return p.title.length > 65; }), 2, "Shorten long page titles", "Titles over about 60 characters get cut off in Google.");
    var titles = {}; pages.forEach(function (p) { if (p.title) (titles[p.title] = titles[p.title] || []).push(p); });
    var dup = [].concat.apply([], Object.keys(titles).filter(function (t) { return titles[t].length > 1; }).map(function (t) { return titles[t]; }));
    penal(4, dup, 1, "Make page titles unique", "Several pages share the same title, so Google can't tell them apart.");
    penal(6, share(function (p) { return !p.description; }), 1, "Write meta descriptions", "No meta description, so Google makes one up from whatever text it finds.");
    penal(2, share(function (p) { return p.description.length > 160; }), 2, "Trim long meta descriptions", "Descriptions over 160 characters get cut off.");
    penal(6, share(function (p) { return p.h1 === 0; }), 1, "Add a main heading (H1)", "Pages with no H1 heading. It tells Google and AI what the page is about.");
    penal(2, share(function (p) { return p.h1 > 1; }), 2, "Use one main heading per page", "Pages with more than one H1.");
    penal(3, share(function (p) { return !p.canonical; }), 2, "Add canonical tags", "No canonical tag, so copies of a page (with tracking codes, www and non-www) can compete with each other.");
    penal(5, share(function (p) { return !/noindex/.test(p.robots) && p.words < 250 && p !== home; }), 2, "Add more to thin pages", "Pages under 250 words are hard to rank for anything.");
    penal(3, share(function (p) { return !p.ogImage; }), 2, "Add share images", "No og:image, so links shared on WhatsApp, LinkedIn and iMessage show no picture.");
    penal(3, share(function (p) { return p.badSchema; }), 1, "Fix broken structured data", "Structured data that isn't valid JSON is ignored by Google and AI.");
    var imgs = [].concat.apply([], pages.map(function (p) { return p.images; }));
    var noAlt = imgs.filter(function (i) { return !i.alt; }).length;
    if (imgs.length && noAlt) { pen.push(5 * noAlt / imgs.length); fix(2, "Describe your images (alt text)", plural(noAlt, "image") + " of " + imgs.length + " have no alt text. Search engines and screen readers can't see them."); }
    if (!home.lang) { pen.push(2); fix(2, "Set the page language", "The page doesn't say what language it's in (lang attribute)."); }
    if (!d.sitemapFound) { pen.push(5); fix(1, "Add a sitemap", "No sitemap.xml found. A sitemap lists every page so Google and Bing find them all."); }
    if (!d.robotsOk) { pen.push(2); fix(2, "Add a robots.txt file", "No robots.txt found. It's where you tell crawlers what to read and where your sitemap is."); }
    var google = clamp(100 - pen.reduce(function (a, b) { return a + b; }, 0));
    if (google >= 90) good.push("Google search setup is in good shape");

    /* Speed, out of 100: Google's mobile Lighthouse score when available, otherwise our own estimate */
    var psi = d.psi;
    if (psi) {
      // A fast site (90+) only gets its top few speed tweaks, as polish rather than problems.
      var fast = psi.score >= 90;
      (fast ? psi.opps.slice(0, 3) : psi.opps).forEach(function (o) {
        fix(fast ? 2 : o.score < 0.5 ? 1 : 2, o.title, "Found by Google's phone speed test" + (o.value ? " (" + o.value + ")" : "") + ". Fixing it makes the site faster on phones, which Google takes into account.");
      });
      if (psi.score >= 90) good.push("Fast on phones (Google speed test " + psi.score + "/100)");
    }
    var sp = 0;
    if (home.ms > 2500) { sp += 40; fix(0, "Speed up the server", "The home page took " + (home.ms / 1000).toFixed(1) + "s to arrive before anything could show. Better hosting or caching usually fixes this."); }
    else if (home.ms > 1200) { sp += 20; fix(1, "Speed up the server", "The home page took " + (home.ms / 1000).toFixed(1) + "s to arrive. Under 0.6s is good."); }
    else if (home.ms > 600) sp += 8;
    var kb = Math.max(1, Math.round(home.bytes / 1024));
    if (kb > 400) { sp += 20; fix(1, "Slim down the home page", "The home page HTML is " + kb + " KB. Over 400 KB slows phones down; inline images or page-builder code are the usual cause."); }
    else if (kb > 150) sp += 6;
    if (home.blocking >= 5) { sp += 20; fix(1, "Stop scripts blocking the page", plural(home.blocking, "script") + " in the page head load before anything shows. Add defer or async."); }
    else if (home.blocking >= 2) { sp += 8; fix(2, "Stop scripts blocking the page", plural(home.blocking, "script") + " in the page head load before anything shows. Add defer or async."); }
    var unsized = imgs.filter(function (i) { return !i.sized; }).length;
    if (imgs.length && unsized / imgs.length > 0.3) { sp += 10; fix(2, "Give images a width and height", plural(unsized, "image") + " have no size set, so the page jumps as they load (layout shift)."); }
    var eager = home.images.filter(function (i) { return !i.lazy; }).length;
    if (eager > 6) { sp += 10; fix(2, "Lazy-load images further down", plural(eager, "image") + " on the home page load straight away. Add loading=\"lazy\" to images below the first screen."); }
    if (home.scriptHosts > 8) { sp += 10; fix(1, "Cut down third-party scripts", "The home page loads scripts from " + home.scriptHosts + " other services (trackers, chat, widgets). Each one costs speed."); }
    if (home.styles > 8) sp += 5;
    var speed = clamp(100 - sp);
    if (psi) {
      // keep only the server-time fix from our own estimate; Google's test covers the rest
      fixes = fixes.filter(function (f) { return !/^(Slim down the home page|Stop scripts blocking the page|Give images a width and height|Lazy-load images further down|Cut down third-party scripts)$/.test(f.title); });
      speed = psi.score;
    } else if (speed >= 90) good.push("Fast server and a lean home page");

    var aiScore = clamp(ai.reduce(function (a, x) { return a + x.pts; }, 0));
    var order = { 0: 0, 1: 1, 2: 2 };
    fixes.sort(function (a, b) { return order[a.tier] - order[b.tier]; });
    return {
      site: host(d.origin), url: home.url, origin: d.origin, pages: pages.length, ai: aiScore, google: google, speed: speed, psi: psi || null,
      aiItems: ai, bots: bots, trainers: trainers, fixes: fixes, good: good, ms: home.ms, kb: kb, org: org ? (org.name || "") : ""
    };
  }

  /* ---------- rendering ---------- */
  function verdict(n) { return n >= 85 ? "Ready" : n >= 65 ? "Nearly there" : n >= 40 ? "Needs work" : "Not ready"; }
  function dial(n, label, sub) {
    var c = 2 * Math.PI * 52, off = c * (1 - n / 100);
    return '<div class="ck-dial ' + (n >= 85 ? "is-good" : n >= 65 ? "is-ok" : "is-bad") + '"><div class="ck-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="tr"/><circle cx="60" cy="60" r="52" class="fg" style="stroke-dasharray:' + c.toFixed(1) + ";stroke-dashoffset:" + off.toFixed(1) + '"/></svg>' +
      '<div class="ck-dial-n"><b>' + n + '</b><span class="mono">out of 100</span></div></div><div class="ck-dial-t"><h3>' + esc(label) + '</h3><p class="mono">' + esc(sub) + '</p></div></div>';
  }
  var TIERS = ["Do first", "Next", "When there's time"];

  function render(r) {
    var share = location.origin + location.pathname + "?site=" + encodeURIComponent(r.site);
    var msg = "I ran the OTG AI search check on " + r.site + ". AI search " + r.ai + "/100, Google search " + r.google + "/100, " + (r.psi ? "phone" : "page") + " speed " + r.speed + "/100. I'd like help getting found.";
    var contact = "/contact?check=" + encodeURIComponent(r.site) + "&ai=" + r.ai + "&google=" + r.google + "&speed=" + r.speed;
    var html = '<section class="ck-res" aria-live="polite">' +
      '<div class="ck-head"><span class="eyebrow">Results for</span><h2>' + esc(r.site) + '</h2><p class="muted">' + plural(r.pages, "page") + ' checked · ' + esc(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })) + '</p></div>' +
      '<div class="ck-dials">' + dial(r.ai, "AI search", verdict(r.ai)) + dial(r.google, "Google search", verdict(r.google)) + dial(r.speed, r.psi ? "Phone speed" : "Page speed", verdict(r.speed)) + '</div>';

    if (r.fixes.length) {
      html += '<div class="ck-block"><span class="stage mono">What to fix</span><h3 class="ck-h">' + plural(r.fixes.length, "thing") + ' to fix, most useful first.</h3><ol class="ck-fixes">';
      r.fixes.forEach(function (f) {
        html += '<li class="t' + f.tier + '"><span class="ck-tier mono">' + TIERS[f.tier] + '</span><div><h4>' + esc(f.title) + '</h4><p>' + esc(f.why) + '</p>' +
          (f.where.length ? '<p class="ck-where mono">' + f.where.slice(0, 5).map(esc).join(" · ") + (f.where.length > 5 ? " · +" + (f.where.length - 5) + " more" : "") + "</p>" : "") + "</div></li>";
      });
      html += "</ol></div>";
    }
    if (r.good.length) html += '<div class="ck-block"><span class="stage mono">Going well</span><ul class="ck-good">' + r.good.map(function (g) { return "<li>" + esc(g) + "</li>"; }).join("") + "</ul></div>";

    html += '<section class="ck-cta"><h2>Be seen. Be found. Be present.</h2><p>OTG takes care of everything on this list, or designs and builds you a new site that&rsquo;s ready from day one: hand-coded, fast, with SEO and AI search built in.</p>' +
      '<div class="actions"><a class="btn btn--solid" href="' + esc(contact) + '">Send us your results <span class="arrow">&rarr;</span></a>' +
      '<a class="btn" href="https://wa.me/447812524138?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">WhatsApp us</a>' +
      '<a class="btn" href="https://calendar.google.com/calendar/appointments/schedules/AcZssZ1wsjRj1qhmjwHgqLBt9IwcmJsexKkUIQpf1GtDj5OUyO6FDhUYUJvcAz66QCq6FDHuIi8N1L1O" target="_blank" rel="noopener">Book a call</a></div></section>';

    html += '<div class="ck-block"><span class="stage mono">AI search, point by point</span><table class="ck-table"><thead><tr><th>Check</th><th>Points</th></tr></thead><tbody>' +
      r.aiItems.map(function (x) { var ok = x.pts >= x.max; return '<tr><td><span class="ck-mark ' + (ok ? "ok" : x.pts > 0 ? "part" : "no") + '" aria-hidden="true">' + (ok ? "✓" : x.pts > 0 ? "◐" : "✗") + "</span>" + esc(x.label) + (x.note ? ' <span class="muted">(' + esc(x.note) + ")</span>" : "") + '</td><td class="mono">' + Math.round(x.pts) + " / " + x.max + "</td></tr>"; }).join("") +
      "</tbody></table></div>";

    html += '<div class="ck-block"><span class="stage mono">Which AI crawlers can read the site</span><table class="ck-table"><thead><tr><th>Crawler</th><th>Used for</th><th>Status</th></tr></thead><tbody>' +
      r.bots.map(function (b) { return '<tr><td class="mono">' + esc(b.ua) + "</td><td>" + esc(b.who) + '</td><td class="' + (b.blocked ? "no" : "ok") + '">' + (b.blocked ? "blocked" : "allowed") + "</td></tr>"; }).join("") +
      r.trainers.map(function (b) { return '<tr class="muted"><td class="mono">' + esc(b.ua) + "</td><td>" + esc(b.who) + " <em>(training, your choice)</em></td><td>" + (b.blocked ? "blocked" : "allowed") + "</td></tr>"; }).join("") +
      '</tbody></table><p class="ck-note muted">Read from robots.txt. A firewall or CDN bot setting can still block crawlers that robots.txt allows, so check those too.</p></div>';

    if (r.psi) {
      html += '<div class="ck-block"><span class="stage mono">Phone speed, from Google</span><table class="ck-table"><thead><tr><th>Measure</th><th>Result</th></tr></thead><tbody>' +
        r.psi.metrics.map(function (x) { return '<tr><td>' + esc(x.label) + '</td><td class="' + (x.score >= 0.9 ? "ok" : x.score < 0.5 ? "no" : "") + '">' + esc(x.value) + "</td></tr>"; }).join("") +
        '</tbody></table><p class="ck-note muted">Google Lighthouse on a simulated mid-range phone over mobile data, the same test as PageSpeed Insights. Scores move a few points between runs.' +
        (r.psi.field ? " Real Chrome visitors over the last 28 days: " + esc(({ FAST: "fast", AVERAGE: "average", SLOW: "slow" })[r.psi.field] || r.psi.field.toLowerCase()) + "." : "") + "</p></div>";
      html += '<div class="ck-block ck-more"><p>Full details: <a href="https://pagespeed.web.dev/analysis?url=' + encodeURIComponent(r.url) + '&form_factor=mobile" target="_blank" rel="noopener">Google PageSpeed Insights</a>.</p>';
    } else {
      html += '<div class="ck-block ck-more"><p>Page speed here is measured from our server: response ' + (r.ms / 1000).toFixed(2) + 's, home page HTML ' + r.kb + ' KB. For a full phone speed test, run <a href="https://pagespeed.web.dev/analysis?url=' + encodeURIComponent(r.url) + '&form_factor=mobile" target="_blank" rel="noopener">Google PageSpeed Insights</a>.</p>';
    }
    html += '<p>Share these results: <button type="button" class="ck-copy" data-copy="' + esc(share) + '">Copy link</button></p></div>';
    html += "</section>";
    out.innerHTML = html;
    var copy = out.querySelector(".ck-copy");
    if (copy) copy.addEventListener("click", function () {
      var t = copy.getAttribute("data-copy");
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { copy.textContent = "Link copied"; }, function () { prompt("Copy this link", t); });
    });
    var top = out.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  function renderError(e, start) {
    var site = host(start), m;
    if (e.code === "busy") m = "Lots of checks are running right now. Please try again in a minute.";
    else if (e.code === "bad-url") m = "That doesn't look like a public web address. Try something like yourbusiness.com.";
    else if (e.code === "status" && (e.status === 403 || e.status === 503 || e.status === 429)) m = site + " turned our checker away (error " + e.status + "). Firewalls that block automated visitors often block AI search crawlers too, which is worth looking into.";
    else if (e.code === "status") m = site + " answered with error " + e.status + ", so there was nothing to check. Check the address and try again.";
    else if (e.code === "nothtml") m = "That address isn't a web page. Try the site's home page.";
    else m = "We couldn't reach " + site + ". Check the address and try again.";
    out.innerHTML = '<section class="ck-res ck-err" aria-live="polite"><p>' + esc(m) + '</p><p class="muted">Stuck? <a href="/contact">Ask us</a> and we&rsquo;ll check it by hand.</p></section>';
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var u = normalise(input.value);
    if (!u) { input.setCustomValidity("Enter a web address, like yourbusiness.com"); input.reportValidity(); return; }
    input.setCustomValidity("");
    try { history.replaceState(null, "", location.pathname + "?site=" + encodeURIComponent(host(u) + (path(u) !== "/" ? path(u) : ""))); } catch (e) {}
    run(u);
  });
  input.addEventListener("input", function () { input.setCustomValidity(""); });

  document.querySelectorAll("[data-copy-from]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = document.getElementById(b.getAttribute("data-copy-from")).textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = "Copied"; }, function () { prompt("Copy this", t); });
    });
  });

  // Private log for OTG: website and scores only (no personal details). Never blocks the result.
  var fromShare = false;
  function logCheck(r) {
    try {
      fetch("/api/tools/log", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
        body: JSON.stringify({ site: r.site, ai: r.ai, google: r.google, speed: r.speed, phone: !!r.psi, pages: r.pages, shared: fromShare }) })
        .catch(function () {});
    } catch (e) {}
    fromShare = false;
  }

  var q = new URLSearchParams(location.search).get("site");
  if (q) {
    var robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.setAttribute("content", "noindex, follow");
    input.value = q;
    var u = normalise(q);
    if (u) { fromShare = true; run(u); }
  }
})();
