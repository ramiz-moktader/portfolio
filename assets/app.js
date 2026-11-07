/* Renders the site from content.yml. You normally never need to edit this file. */
(function () {
  "use strict";

  var STATUS = { published: "Published", preprint: "Preprint", under_review: "Under review", in_preparation: "In preparation" };
  var MY_NAME = /(Moula,\s*M\.\s*M\.)/g;

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function ext(href, label) {
    if (!href) return "";
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + " ↗</a>";
  }
  function H(d, key, fallback) { return (d.headings && d.headings[key]) || fallback; }
  function section(id, eyebrow, title, inner, note, wide) {
    return '<section id="' + id + '"><div class="wrap' + (wide ? " wide" : "") + '"><div class="sec-head"><p class="eyebrow"><span>' + esc(eyebrow) + "</span>" +
      (note ? '<span class="note">' + esc(note) + "</span>" : "") + "</p><h2>" + esc(title) + "</h2></div>" + inner + "</div></section>";
  }

  /* =========================================================
     Synthetic 4-band scene (blue, green, red, near-infrared)
     ========================================================= */
  var N = 112;               // scene is N x N pixels, ~3 m each
  var CLASSES = ["Water", "Built-up", "Bare soil", "Cropland", "Forest"];
  var CLASS_RGB = [[44, 111, 176], [201, 79, 61], [216, 183, 121], [168, 207, 106], [47, 125, 58]];
  var REFL = [ // B, G, R, NIR surface reflectance
    [0.060, 0.082, 0.052, 0.020],
    [0.140, 0.150, 0.170, 0.220],
    [0.120, 0.165, 0.225, 0.290],
    [0.050, 0.095, 0.070, 0.360],
    [0.030, 0.058, 0.038, 0.440]
  ];
  var VIEWS = [
    { id: "rgb", label: "True colour", hud: "True colour · bands 3-2-1" },
    { id: "fcc", label: "False colour", hud: "False colour · NIR-R-G" },
    { id: "ndwi", label: "NDWI", hud: "NDWI = (G − NIR) / (G + NIR)" },
    { id: "mask", label: "Water mask", hud: "Model output · water" }
  ];

  function makeScene() {
    function hash(i, j, s) {
      var h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 2147483647);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    }
    function noise(x, y, s) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function fbm(x, y, s) { var t = 0, amp = .5, f = 1; for (var o = 0; o < 5; o++) { t += amp * noise(x * f, y * f, s + o); amp *= .5; f *= 2; } return t; }

    var n = N * N, B = new Float32Array(n), G = new Float32Array(n), R = new Float32Array(n), NIR = new Float32Array(n), C = new Uint8Array(n);
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var u = x / N, v = y / N, i = y * N + x;
      var h = fbm(u * 3, v * 3, 7);
      var cy = .56 + .17 * Math.sin(u * 5.2 + .6) + .05 * Math.sin(u * 13 + 1);
      var rw = .02 + .014 * fbm(u * 7, 3, 11);
      var cls;
      if (Math.abs(v - cy) < rw || h < .3) cls = 0;
      else if (fbm(u * 4 + 10, v * 4 + 10, 21) + (.45 - u) * .5 > .6) cls = 1;
      else if (h > .57) cls = 4;
      else if (fbm(u * 9 + 5, v * 9 + 5, 31) > .47) cls = 3;
      else cls = 2;
      var r = REFL[cls], j = (hash(x, y, 41) - .5) * .022, k = (fbm(u * 14, v * 14, 51) - .5) * .05;
      C[i] = cls; B[i] = r[0] + j * .5; G[i] = r[1] + j * .6; R[i] = r[2] + j + k * .4; NIR[i] = Math.max(.005, r[3] + j * 1.5 + k);
    }
    return { B: B, G: G, R: R, NIR: NIR, C: C };
  }

  function drawView(sc, view, canvas, crop) {
    var x0 = crop ? crop[0] : 0, y0 = crop ? crop[1] : 0, w = crop ? crop[2] : N, h = crop ? crop[2] : N;
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext("2d"), img = ctx.createImageData(w, h), d = img.data;
    function c8(v) { return Math.max(0, Math.min(255, Math.round(Math.pow(Math.max(0, v), 1 / 1.25) * 255))); }
    for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) {
      var i = (yy + y0) * N + (xx + x0), o = (yy * w + xx) * 4, r, g, b;
      var Bv = sc.B[i], Gv = sc.G[i], Rv = sc.R[i], Nv = sc.NIR[i];
      if (view === "rgb") { r = c8(Rv * 3.3); g = c8(Gv * 3.3); b = c8(Bv * 3.3); }
      else if (view === "fcc") { r = c8(Nv * 2.0); g = c8(Rv * 3.3); b = c8(Gv * 3.3); }
      else if (view === "ndwi") {
        var t = (Gv - Nv) / (Gv + Nv);
        if (t < 0) { var a = Math.min(1, -t / .8); r = 238 - 80 * a; g = 232 - 120 * a; b = 214 - 150 * a; }
        else { var e = Math.min(1, t / .65); r = 238 - 210 * e; g = 232 - 140 * e; b = 214 - 30 * e; }
      } else if (view === "class") { var cc = CLASS_RGB[sc.C[i]]; r = cc[0]; g = cc[1]; b = cc[2]; }
      else { // mask: NDWI > 0, edges outlined, background desaturated
        var water = (Gv - Nv) / (Gv + Nv) > 0;
        if (water) {
          var gx = (xx + x0), gy = (yy + y0), edge = false;
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (q) {
            var nx = gx + q[0], ny = gy + q[1];
            if (nx >= 0 && ny >= 0 && nx < N && ny < N) { var k = ny * N + nx; if ((sc.G[k] - sc.NIR[k]) / (sc.G[k] + sc.NIR[k]) <= 0) edge = true; }
          });
          if (edge) { r = 255; g = 255; b = 255; } else { r = 105; g = 195; b = 224; }
        } else { var l = c8((Rv + Gv + Bv) * 1.1) * .45; r = l + 6; g = l + 12; b = l + 8; }
      }
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  function sceneHTML(d) {
    var btns = VIEWS.map(function (v, i) { return '<button type="button" data-view="' + v.id + '" aria-pressed="' + (i === 0) + '">' + esc(v.label) + "</button>"; }).join("");
    return '<div class="scene">' +
      '<div class="scene-frame"><canvas id="scene" width="' + N + '" height="' + N + '" aria-label="Synthetic satellite scene of a river, city, cropland and forest"></canvas>' +
      '<div class="scene-hud" id="hud">' + esc(VIEWS[0].hud) + '</div><div class="cross" id="cross"></div>' +
      '<div class="scene-scale"><i style="width:' + (100 / 3 / N * 100).toFixed(1) + '%;min-width:28px"></i>100 m</div></div>' +
      '<div class="views" role="group" aria-label="Scene view">' + btns + "</div>" +
      '<div class="readout" aria-live="polite">' +
      '<div><span>Blue</span><b id="rB">–</b></div><div><span>Green</span><b id="rG">–</b></div><div><span>Red</span><b id="rR">–</b></div><div><span>NIR</span><b id="rN">–</b></div>' +
      '<div class="cls"><span id="rI">NDWI</span><b id="rC">–</b></div></div>' +
      (d.scene_caption ? '<p class="scene-cap">' + esc(d.scene_caption) + "</p>" : "") + "</div>";
  }

  function wireScene(sc) {
    var cv = document.getElementById("scene"); if (!cv) return;
    var hud = document.getElementById("hud"), cross = document.getElementById("cross");
    var btns = document.querySelectorAll(".views button"), cur = 0, timer = null;
    function show(idx) {
      cur = idx; drawView(sc, VIEWS[idx].id, cv);
      hud.textContent = VIEWS[idx].hud;
      btns.forEach(function (b, i) { b.setAttribute("aria-pressed", String(i === idx)); });
    }
    function read(px, py) {
      px = Math.max(0, Math.min(N - 1, px)); py = Math.max(0, Math.min(N - 1, py));
      var i = py * N + px, f = function (v) { return v.toFixed(3); };
      var nd = (sc.G[i] - sc.NIR[i]) / (sc.G[i] + sc.NIR[i]);
      document.getElementById("rB").textContent = f(sc.B[i]);
      document.getElementById("rG").textContent = f(sc.G[i]);
      document.getElementById("rR").textContent = f(sc.R[i]);
      document.getElementById("rN").textContent = f(sc.NIR[i]);
      document.getElementById("rI").textContent = "NDWI " + (nd >= 0 ? "+" : "") + nd.toFixed(2);
      document.getElementById("rC").textContent = CLASSES[sc.C[i]];
      cross.style.left = ((px + .5) / N * 100) + "%"; cross.style.top = ((py + .5) / N * 100) + "%";
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    btns.forEach(function (b, i) { b.addEventListener("click", function () { stop(); show(i); }); });
    function pt(e) {
      var r = cv.getBoundingClientRect();
      read(Math.floor((e.clientX - r.left) / r.width * N), Math.floor((e.clientY - r.top) / r.height * N));
    }
    cv.addEventListener("pointermove", pt);
    cv.addEventListener("pointerdown", function (e) { stop(); pt(e); });
    // start on a river pixel near the middle
    var sx = Math.floor(N * .62), sy = 0;
    for (var y = 0; y < N; y++) if (sc.C[y * N + sx] === 0 && Math.abs(y - N * .55) < Math.abs(sy - N * .55)) sy = y;
    show(0); read(sx, sy);
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) timer = setInterval(function () { show((cur + 1) % VIEWS.length); }, 3400);
  }

  /* =========================================================
     Sections
     ========================================================= */
  function hero(d) {
    var p = d.profile || {};
    var acts = [];
    if (p.cv_url) acts.push('<a class="btn primary" href="' + esc(p.cv_url) + '" target="_blank" rel="noopener">Download CV</a>');
    acts.push('<a class="btn' + (p.cv_url ? "" : " primary") + '" href="#publications">See publications</a>');
    if (p.github) acts.push('<a class="btn" href="' + esc(p.github) + '" target="_blank" rel="noopener">GitHub ↗</a>');
    if (p.google_scholar) acts.push('<a class="btn" href="' + esc(p.google_scholar) + '" target="_blank" rel="noopener">Google Scholar ↗</a>');
    if (p.orcid) acts.push('<a class="btn" href="' + esc(p.orcid) + '" target="_blank" rel="noopener">ORCID ↗</a>');
    var words = String(p.name || "").split(" "), nameHTML = esc(p.name);
    if (words.length > 2 && /\.$/.test(words[0])) nameHTML = '<span class="soft">' + esc(words[0]) + "</span> " + esc(words.slice(1).join(" "));
    var stats = arr(d.highlights).map(function (h) { return '<div class="stat"><b>' + esc(h.value) + "</b><span>" + esc(h.label) + "</span></div>"; }).join("");

    return '<header class="hero"><div class="wrap wide"><div class="hero-inner"><div>' +
      '<div class="coord"><span>' + esc(p.coordinates) + "</span><span>" + esc(p.location) + "</span></div>" +
      "<h1>" + nameHTML + "</h1>" +
      '<p class="role">' + esc(p.role) + "</p>" +
      (p.status ? '<p class="status">' + esc(p.status) + "</p>" : "") +
      '<p class="lede">' + esc(p.summary) + "</p>" +
      '<div class="actions">' + acts.join("") + "</div>" +
      (p.email ? '<div class="email-line"><span id="email">' + esc(p.email) + '</span><button class="copy" type="button" data-copy="email">Copy email</button></div>' : "") +
      "</div>" + sceneHTML(d) + "</div>" +
      (stats ? '<div class="stats">' + stats + "</div>" : "") +
      "</div></header>";
  }

  function nowStrip(d) {
    var items = arr(d.now); if (!items.length) return "";
    return '<div class="now"><div class="wrap wide"><p class="now-head">Currently working on</p><div class="now-list">' +
      items.map(function (n) { return "<article><h3>" + esc(n.title) + "</h3><p>" + esc(n.text) + "</p></article>"; }).join("") +
      "</div></div></div>";
  }

  var THEME_SWATCH = { GFM: ["fcc", [8, 8, 40]], Water: ["mask", [40, 44, 40]], LULC: ["class", [10, 30, 40]], Forest: ["fcc", [60, 4, 40]] };

  function research(d) {
    var paras = arr(d.statement).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
    var counts = {};
    arr(d.publications).forEach(function (p) { if (p.theme) counts[p.theme] = (counts[p.theme] || 0) + 1; });
    var themes = arr(d.themes).map(function (t) {
      var n = counts[t.keyword] || 0;
      return '<button class="theme" type="button" data-theme-filter="' + esc(t.keyword) + '">' +
        '<canvas class="sw" data-swatch="' + esc(t.keyword) + '" aria-hidden="true"></canvas>' +
        '<span class="k"><span>' + esc(t.keyword) + "</span><em>" + n + " paper" + (n === 1 ? "" : "s") + " →</em></span>" +
        "<h3>" + esc(t.title) + "</h3><p>" + esc(t.text) + "</p></button>";
    }).join("");
    var formula = '<div class="formula"><span class="eq">NDWI = (Green − NIR) / (Green + NIR)</span>' +
      "<small>Water absorbs strongly in the near-infrared, around 0.86 µm, while plants reflect it. Several of my projects ask how a neural network can use that contrast directly.</small>" +
      '<div class="spec-wrap"><div class="spectrum" aria-hidden="true">' +
      '<span style="left:6%">Blue</span><span style="left:20%">Green</span><span style="left:38%">Red</span><span style="left:72%">Near-infrared</span></div></div></div>';
    return section("research", "Research", H(d, "research", "Research"),
      '<div class="statement">' + paras + "</div>" + formula + (themes ? '<div class="themes">' + themes + "</div>" : ""));
  }

  function pubItem(p) {
    var authors = p.authors ? esc(p.authors).replace(MY_NAME, "<strong>$1</strong>") : "";
    return '<article class="pub" data-status="' + esc(p.status) + '" data-theme="' + esc(p.theme || "") + '" data-first="' + (p.first_author ? "1" : "0") + '">' +
      '<span class="dot ' + esc(p.status) + '" aria-hidden="true"></span><div class="body">' +
      '<div class="meta"><span class="tag ' + esc(p.status) + '">' + esc(STATUS[p.status] || p.status) + "</span>" +
      (p.first_author ? '<span class="tag first">First author</span>' : "") +
      (p.venue ? "<span>" + esc(p.venue) + "</span>" : "") + (p.year ? "<span>" + esc(p.year) + "</span>" : "") + "</div>" +
      "<h3>" + esc(p.title) + "</h3>" +
      (authors ? '<p class="authors">' + authors + "</p>" : "") +
      (p.my_role ? '<p class="role-line"><em>My part</em>' + esc(p.my_role) + "</p>" : "") +
      (p.link ? '<div class="links">' + ext(p.link, p.link_label || "Link") + "</div>" : "") +
      "</div></article>";
  }

  function publications(d) {
    var order = ["published", "preprint", "under_review", "in_preparation"];
    var pubs = arr(d.publications).slice().sort(function (a, b) { return order.indexOf(a.status) - order.indexOf(b.status); });
    var n = function (f) { return pubs.filter(f).length; };
    var filters = [
      ["all", "All", pubs.length],
      ["first", "First author", n(function (p) { return p.first_author; })],
      ["published+preprint", "Published & preprints", n(function (p) { return p.status === "published" || p.status === "preprint"; })],
      ["under_review", "Under review", n(function (p) { return p.status === "under_review"; })],
      ["in_preparation", "In preparation", n(function (p) { return p.status === "in_preparation"; })]
    ];
    arr(d.themes).forEach(function (t) { filters.push(["theme:" + t.keyword, t.keyword, n(function (p) { return p.theme === t.keyword; })]); });
    var chips = filters.filter(function (f) { return f[2] > 0 || f[0] === "all"; }).map(function (f, i) {
      return '<button class="chip" type="button" data-filter="' + esc(f[0]) + '" aria-pressed="' + (i === 0) + '">' + esc(f[1]) + '<span class="n">' + f[2] + "</span></button>";
    }).join("");
    var theses = arr(d.theses).map(function (t) {
      return '<article class="pub"><span class="dot published" aria-hidden="true" style="border-radius:2px"></span><div class="body"><div class="meta"><span>' + esc(t.degree) + "</span><span>" + esc(t.place) + "</span></div><h3>" + esc(t.title) + "</h3>" +
        (t.link ? '<div class="links">' + ext(t.link, t.link_label || "Link") + "</div>" : "") + "</div></article>";
    }).join("");
    return section("publications", "Publications", H(d, "publications", "Publications"),
      '<div class="filters" role="group" aria-label="Filter publications">' + chips + "</div>" +
      '<div id="pub-list">' + pubs.map(pubItem).join("") + '</div><p class="empty" id="pub-empty" hidden>No papers match this filter.</p>' +
      (theses ? '<p class="subhead">Theses</p>' + theses : ""), "My name in bold");
  }

  function highlight(code) {
    return String(code).replace(/\s+$/, "").split(/(#[^\n]*|"[^"\n]*"|\b\d+(?:\.\d+)?\b|\b(?:import|as|from|def|return|for|in)\b)/).map(function (part, i) {
      if (i % 2 === 0) return esc(part);
      var cls = part[0] === "#" ? "c" : part[0] === '"' ? "s" : /\d/.test(part[0]) ? "n" : "k";
      return '<span class="' + cls + '">' + esc(part) + "</span>";
    }).join("");
  }

  function software(d) {
    var items = arr(d.software);
    var feat = items.filter(function (s) { return s.featured; }), rest = items.filter(function (s) { return !s.featured; });
    var links = function (s) { return '<div class="links">' + ext(s.repo, "Code") + ext(s.link, s.link_label || "Website") + "</div>"; };
    var techs = function (s) { return '<div class="techs">' + arr(s.tech).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</div>"; };
    var featHtml = feat.map(function (s) {
      return '<article class="featured"><div><div class="meta"><span>Featured · open source</span></div><h3>' + esc(s.name) + "</h3><p>" + esc(s.summary) + "</p>" +
        (arr(s.details).length ? "<ul>" + arr(s.details).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
        techs(s) + links(s) + "</div>" +
        (s.code ? '<div><pre class="code">' + highlight(s.code) + "</pre></div>" : "") + "</article>";
    }).join("");
    var grid = rest.map(function (s) { return '<article class="proj"><h3>' + esc(s.name) + "</h3><p>" + esc(s.summary) + "</p>" + techs(s) + links(s) + "</article>"; }).join("");
    return section("software", "Software", H(d, "software", "Software"), featHtml + (grid ? '<div class="grid">' + grid + "</div>" : ""), items.length + " projects", true);
  }

  function experience(d) {
    var jobs = arr(d.experience), SHOW = 4;
    var html = jobs.map(function (j, i) {
      var cur = /present/i.test(j.dates || "");
      return '<div class="job' + (cur ? " current" : "") + '"' + (i >= SHOW ? " hidden data-extra" : "") + '><div class="when">' + esc(j.dates) + "</div><div>" +
        "<h3>" + esc(j.role) + '</h3><p class="org">' + esc(j.org) + "</p>" +
        (j.project ? '<p class="proj-name">' + esc(j.project) + "</p>" : "") +
        (arr(j.points).length ? "<ul>" + arr(j.points).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") + "</div></div>";
    }).join("");
    var more = jobs.length > SHOW ? '<button class="btn more" type="button" id="more-jobs">Show ' + (jobs.length - SHOW) + " earlier roles</button>" : "";
    return section("experience", "Experience", H(d, "experience", "Experience"), '<div class="timeline">' + html + "</div>" + more, jobs.length + " roles since 2021");
  }

  function eduAwards(d) {
    var edu = arr(d.education).map(function (e) {
      return '<div class="entry"><div class="meta"><span>' + esc(e.dates) + "</span>" + (e.grade ? "<span>" + esc(e.grade) + "</span>" : "") + "</div><h3>" + esc(e.degree) + "</h3><p>" + esc(e.place) + "</p></div>";
    }).join("");
    var aw = arr(d.awards).map(function (a) {
      var yr = String(a.year || "").match(/\d{4}/);
      return '<div class="entry award"><span class="medal" aria-hidden="true">' + (yr ? "'" + yr[0].slice(2) : "★") + "</span><div><div class=\"meta\"><span>" + esc(a.year) + "</span></div><h3>" + esc(a.title) + "</h3><p>" + esc(a.org) + "</p></div></div>";
    }).join("");
    return section("education", "Education", H(d, "education", "Education"),
      '<div class="two"><div><p class="subhead" style="margin-top:0">Degrees</p>' + edu + '</div><div><p class="subhead" style="margin-top:0">Awards & fellowships</p>' + aw + "</div></div>");
  }

  function teaching(d) {
    var items = arr(d.teaching).map(function (t) {
      return "<article>" + (t.figure ? '<div class="big">' + esc(t.figure) + "<small>" + esc(t.figure_label) + "</small></div>" : "") +
        '<div class="meta"><span>' + esc(t.role) + "</span><span>" + esc(t.dates) + "</span></div><h3>" + esc(t.title) + "</h3><p>" + esc(t.text) + "</p>" +
        (t.link ? '<div class="links">' + ext(t.link, t.link_label || "Website") + "</div>" : "") + "</article>";
    }).join("");
    return section("teaching", "Teaching", H(d, "teaching", "Teaching"), '<div class="teach">' + items + "</div>");
  }

  function skills(d) {
    var g = arr(d.skills).map(function (s) {
      return "<div><h3>" + esc(s.group) + '</h3><div class="techs">' + arr(s.items).map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div></div>";
    }).join("");
    var c = arr(d.courses).map(function (x) { return "<li>" + (x.link ? ext(x.link, x.title) : esc(x.title)) + (x.org ? "<small>" + esc(x.org) + "</small>" : "") + "</li>"; }).join("");
    return section("skills", "Skills", H(d, "skills", "Skills"),
      '<div class="skills">' + g + "</div>" + (c ? '<p class="subhead">Courses and certificates</p><ul class="courses">' + c + "</ul>" : ""));
  }

  function contact(d) {
    var p = d.profile || {};
    var links = [["GitHub", p.github], ["Google Scholar", p.google_scholar], ["ORCID", p.orcid], ["LinkedIn", p.linkedin], ["ResearchGate", p.researchgate], ["CV", p.cv_url]]
      .filter(function (x) { return x[1]; }).map(function (x) { return ext(x[1], x[0]); }).join("");
    return '<section id="contact"><div class="wrap"><div class="contact-card">' +
      '<p class="eyebrow"><span>Contact</span></p><h2>' + esc(H(d, "contact", "Contact")) + "</h2>" +
      "<p>" + esc(p.status || "") + ". I'm glad to hear about open positions, research fit or collaboration.</p>" +
      (p.email ? '<div class="email-line"><span id="email2">' + esc(p.email) + '</span><button class="copy" type="button" data-copy="email2">Copy</button></div>' : "") +
      (links ? '<div class="links">' + links + "</div>" : "") +
      (d.references_note ? '<p class="ref">' + esc(d.references_note) + "</p>" : "") +
      "</div></div></section>";
  }

  /* =========================================================
     Behaviour
     ========================================================= */
  function theme() {
    var root = document.documentElement, btn = document.getElementById("themeToggle");
    function effective() { return root.getAttribute("data-theme") || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
    function label() { if (btn) btn.textContent = effective() === "dark" ? "☀ Light" : "☾ Dark"; }
    try { var saved = localStorage.getItem("theme"); if (saved) root.setAttribute("data-theme", saved); } catch (e) {}
    label();
    if (btn) btn.addEventListener("click", function () {
      var next = effective() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      label();
    });
  }

  function wire(d, sc) {
    document.querySelectorAll("button[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var el = document.getElementById(btn.getAttribute("data-copy")), label = btn.textContent;
        function select() { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "Selected"; }
        try { navigator.clipboard.writeText(el.textContent).then(function () { btn.textContent = "Copied"; setTimeout(function () { btn.textContent = label; }, 1500); }, select); }
        catch (e) { select(); }
      });
    });

    var chips = document.querySelectorAll(".chip");
    function apply(f) {
      var shown = 0;
      document.querySelectorAll("#pub-list .pub").forEach(function (el) {
        var s = el.getAttribute("data-status"), ok = true;
        if (f === "first") ok = el.getAttribute("data-first") === "1";
        else if (f === "published+preprint") ok = s === "published" || s === "preprint";
        else if (f.indexOf("theme:") === 0) ok = el.getAttribute("data-theme") === f.slice(6);
        else if (f !== "all") ok = s === f;
        el.hidden = !ok; if (ok) shown++;
      });
      document.getElementById("pub-empty").hidden = shown > 0;
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-filter") === f)); });
    }
    chips.forEach(function (c) { c.addEventListener("click", function () { apply(c.getAttribute("data-filter")); }); });
    document.querySelectorAll("[data-theme-filter]").forEach(function (b) {
      b.addEventListener("click", function () { apply("theme:" + b.getAttribute("data-theme-filter")); document.getElementById("publications").scrollIntoView(); });
    });
    document.querySelectorAll("canvas[data-swatch]").forEach(function (c) {
      var s = THEME_SWATCH[c.getAttribute("data-swatch")] || ["rgb", [30, 30, 40]];
      drawView(sc, s[0], c, s[1]);
    });

    var more = document.getElementById("more-jobs");
    if (more) more.addEventListener("click", function () { document.querySelectorAll("[data-extra]").forEach(function (el) { el.hidden = false; }); more.remove(); });

    var links = document.querySelectorAll(".navlinks a");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id); }); });
      }, { rootMargin: "-45% 0px -50% 0px" });
      document.querySelectorAll("section[id]").forEach(function (s) { io.observe(s); });
    }
    if (d.profile && d.profile.short_name) document.getElementById("brand").textContent = d.profile.short_name;
    wireScene(sc);
  }

  function render(d) {
    var p = d.profile || {}, sc = makeScene();
    if (p.name) document.title = p.name;
    document.getElementById("app").innerHTML =
      hero(d) + nowStrip(d) + research(d) + publications(d) + software(d) + experience(d) + eduAwards(d) + teaching(d) + skills(d) + contact(d) +
      '<footer class="wrap"><span>© ' + new Date().getFullYear() + " " + esc(p.name) + "</span><span>" + (d.updated ? "Updated " + esc(d.updated) : "") + "</span></footer>";
    wire(d, sc);
  }
  function fail(msg) {
    document.getElementById("app").innerHTML = '<div class="wrap"><div class="error"><b>The site could not read content.yml.</b>\n\n' + esc(msg) +
      "\n\nOpen content.yml, fix the line mentioned above (check spaces and quotes), and commit again.</div></div>";
  }

  theme();
  fetch("content.yml", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("content.yml was not found (HTTP " + r.status + ")."); return r.text(); })
    .then(function (txt) { var data; try { data = jsyaml.load(txt); } catch (e) { return fail(e.message); } render(data || {}); })
    .catch(function (e) { fail(e.message); });
})();
