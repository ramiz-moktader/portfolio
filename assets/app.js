/* Renders the site from content.yml. You normally never need to edit this file. */
(function () {
  "use strict";

  var STATUS = {
    published: "Published",
    preprint: "Preprint",
    under_review: "Under review",
    in_preparation: "In preparation"
  };
  var MY_NAME = /(Moula,\s*M\.\s*M\.)/g;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function arr(x) { return Array.isArray(x) ? x : []; }
  function ext(href, label) {
    if (!href) return "";
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + "</a>";
  }
  function section(id, title, inner, note) {
    return '<section id="' + id + '"><div class="sec-head"><h2>' + esc(title) + "</h2>" +
      (note ? '<span class="sec-note">' + esc(note) + "</span>" : "") + "</div>" + inner + "</section>";
  }

  /* ---------- sections ---------- */
  function hero(d) {
    var p = d.profile || {};
    var actions = [];
    if (p.cv_url) actions.push('<a class="btn primary" href="' + esc(p.cv_url) + '" target="_blank" rel="noopener">Download CV</a>');
    actions.push('<a class="btn' + (p.cv_url ? "" : " primary") + '" href="#publications">Publications</a>');
    if (p.github) actions.push('<a class="btn" href="' + esc(p.github) + '" target="_blank" rel="noopener">GitHub</a>');
    if (p.google_scholar) actions.push('<a class="btn" href="' + esc(p.google_scholar) + '" target="_blank" rel="noopener">Google Scholar</a>');
    if (p.orcid) actions.push('<a class="btn" href="' + esc(p.orcid) + '" target="_blank" rel="noopener">ORCID</a>');

    var stats = arr(d.highlights).map(function (h) {
      return '<div class="stat"><b>' + esc(h.value) + "</b><span>" + esc(h.label) + "</span></div>";
    }).join("");

    return '<div class="hero"><canvas id="contours" aria-hidden="true"></canvas>' +
      '<div class="hero-grid"><div>' +
      '<div class="coord">' + esc(p.coordinates) + (p.location ? " — " + esc(p.location) : "") + "</div>" +
      "<h1>" + esc(p.name) + "</h1>" +
      '<p class="role">' + esc(p.role) + "</p>" +
      (p.status ? '<p class="status">' + esc(p.status) + "</p>" : "") +
      '<p class="lede">' + esc(p.summary) + "</p>" +
      '<div class="actions">' + actions.join("") + "</div>" +
      (p.email ? '<div class="email-line"><span id="email">' + esc(p.email) + '</span><button class="copy" type="button" data-copy="email">Copy email</button></div>' : "") +
      "</div>" +
      (p.photo ? '<img class="photo" src="' + esc(p.photo) + '" alt="Photo of ' + esc(p.name) + '">' : "") +
      "</div>" +
      (stats ? '<div class="stats">' + stats + "</div>" : "") +
      "</div>";
  }

  function research(d) {
    var paras = arr(d.statement).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
    var counts = {};
    arr(d.publications).forEach(function (p) { if (p.theme) counts[p.theme] = (counts[p.theme] || 0) + 1; });
    var themes = arr(d.themes).map(function (t) {
      var n = counts[t.keyword] || 0;
      return '<button class="theme" type="button" data-theme-filter="' + esc(t.keyword) + '">' +
        '<span class="k"><span>' + esc(t.keyword) + "</span><span>" + n + " paper" + (n === 1 ? "" : "s") + " →</span></span>" +
        "<h3>" + esc(t.title) + "</h3><p>" + esc(t.text) + "</p></button>";
    }).join("");
    return section("research", "Research",
      '<div class="statement">' + paras + "</div>" +
      '<div class="formula">NDWI = (Green − NIR) / (Green + NIR)' +
      "<small>Water absorbs strongly near 0.86 µm in the near-infrared. Several of my projects ask how a network can use that contrast directly.</small></div>" +
      (themes ? '<div class="themes">' + themes + "</div>" : ""));
  }

  function pubItem(p) {
    var authors = p.authors ? esc(p.authors).replace(MY_NAME, "<strong>$1</strong>") : "";
    return '<article class="pub" data-status="' + esc(p.status) + '" data-theme="' + esc(p.theme || "") + '" data-first="' + (p.first_author ? "1" : "0") + '">' +
      '<div class="meta"><span class="tag ' + esc(p.status) + '">' + esc(STATUS[p.status] || p.status) + "</span>" +
      (p.first_author ? '<span class="tag first">First author</span>' : "") +
      (p.venue ? "<span>" + esc(p.venue) + "</span>" : "") +
      (p.year ? "<span>" + esc(p.year) + "</span>" : "") + "</div>" +
      "<h3>" + esc(p.title) + "</h3>" +
      (authors ? '<p class="authors">' + authors + "</p>" : "") +
      (p.my_role ? '<p class="role-line"><em>My part</em>' + esc(p.my_role) + "</p>" : "") +
      (p.link ? '<div class="links">' + ext(p.link, p.link_label || "Link") + "</div>" : "") +
      "</article>";
  }

  function publications(d) {
    var pubs = arr(d.publications);
    var order = ["published", "preprint", "under_review", "in_preparation"];
    pubs = pubs.slice().sort(function (a, b) { return order.indexOf(a.status) - order.indexOf(b.status); });
    var n = function (f) { return pubs.filter(f).length; };
    var filters = [
      ["all", "All", n(function () { return true; })],
      ["first", "First author", n(function (p) { return p.first_author; })],
      ["published+preprint", "Published & preprints", n(function (p) { return p.status === "published" || p.status === "preprint"; })],
      ["under_review", "Under review", n(function (p) { return p.status === "under_review"; })],
      ["in_preparation", "In preparation", n(function (p) { return p.status === "in_preparation"; })]
    ];
    arr(d.themes).forEach(function (t) {
      filters.push(["theme:" + t.keyword, t.keyword, n(function (p) { return p.theme === t.keyword; })]);
    });
    var chips = filters.filter(function (f) { return f[2] > 0 || f[0] === "all"; }).map(function (f, i) {
      return '<button class="chip" type="button" data-filter="' + esc(f[0]) + '" aria-pressed="' + (i === 0) + '">' + esc(f[1]) + '<span class="n">' + f[2] + "</span></button>";
    }).join("");

    var theses = arr(d.theses).map(function (t) {
      return '<article class="pub"><div class="meta"><span>' + esc(t.degree) + "</span><span>" + esc(t.place) + "</span></div><h3>" + esc(t.title) + "</h3>" +
        (t.link ? '<div class="links">' + ext(t.link, t.link_label || "Link") + "</div>" : "") + "</article>";
    }).join("");

    return section("publications", "Publications",
      '<div class="filters" role="group" aria-label="Filter publications">' + chips + "</div>" +
      '<div id="pub-list">' + pubs.map(pubItem).join("") + '</div><p class="empty" id="pub-empty" hidden>No papers match this filter.</p>' +
      (theses ? '<p class="subhead">Theses</p>' + theses : ""),
      "Bold name = me");
  }

  function software(d) {
    var items = arr(d.software);
    var feat = items.filter(function (s) { return s.featured; });
    var rest = items.filter(function (s) { return !s.featured; });
    var links = function (s) {
      return '<div class="links">' + ext(s.repo, "Code") + ext(s.link, s.link_label || "Website") + "</div>";
    };
    var techs = function (s) { return '<div class="techs">' + arr(s.tech).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</div>"; };
    var featHtml = feat.map(function (s) {
      return '<article class="featured"><div class="meta"><span>Featured project</span></div><h3>' + esc(s.name) + "</h3>" +
        "<p>" + esc(s.summary) + "</p>" +
        (arr(s.details).length ? "<ul>" + arr(s.details).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
        (s.code ? '<pre class="code">' + esc(s.code) + "</pre>" : "") +
        techs(s) + links(s) + "</article>";
    }).join("");
    var grid = rest.map(function (s) {
      return '<article class="proj"><h3>' + esc(s.name) + "</h3><p>" + esc(s.summary) + "</p>" + techs(s) + links(s) + "</article>";
    }).join("");
    return section("software", "Software & projects", featHtml + (grid ? '<div class="grid">' + grid + "</div>" : ""), items.length + " projects");
  }

  function experience(d) {
    var jobs = arr(d.experience);
    var SHOW = 4;
    var html = jobs.map(function (j, i) {
      return '<div class="job"' + (i >= SHOW ? " hidden data-extra" : "") + '><div class="when">' + esc(j.dates) + "</div><div>" +
        "<h3>" + esc(j.role) + '</h3><p class="org">' + esc(j.org) + "</p>" +
        (j.project ? '<p class="proj-name">' + esc(j.project) + "</p>" : "") +
        (arr(j.points).length ? "<ul>" + arr(j.points).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
        "</div></div>";
    }).join("");
    var more = jobs.length > SHOW ? '<button class="btn more" type="button" id="more-jobs">Show ' + (jobs.length - SHOW) + " earlier roles</button>" : "";
    return section("experience", "Experience", '<div class="timeline">' + html + "</div>" + more);
  }

  function eduAwards(d) {
    var edu = arr(d.education).map(function (e) {
      return '<div class="entry"><div class="meta"><span>' + esc(e.dates) + "</span>" + (e.grade ? "<span>" + esc(e.grade) + "</span>" : "") + "</div><h3>" + esc(e.degree) + "</h3><p>" + esc(e.place) + "</p></div>";
    }).join("");
    var aw = arr(d.awards).map(function (a) {
      return '<div class="entry"><div class="meta"><span>' + esc(a.year) + "</span></div><h3>" + esc(a.title) + "</h3><p>" + esc(a.org) + "</p></div>";
    }).join("");
    return section("education", "Education & awards",
      '<div class="two"><div><p class="subhead" style="margin-top:0">Degrees</p>' + edu + '</div><div><p class="subhead" style="margin-top:0">Awards & fellowships</p>' + aw + "</div></div>");
  }

  function teaching(d) {
    var items = arr(d.teaching).map(function (t) {
      return '<article><div class="meta"><span>' + esc(t.role) + "</span><span>" + esc(t.dates) + "</span></div><h3>" + esc(t.title) + "</h3><p>" + esc(t.text) + "</p>" +
        (t.link ? '<div class="links">' + ext(t.link, t.link_label || "Website") + "</div>" : "") + "</article>";
    }).join("");
    return section("teaching", "Teaching & community", '<div class="teach">' + items + "</div>");
  }

  function skills(d) {
    var g = arr(d.skills).map(function (s) {
      return "<div><h3>" + esc(s.group) + '</h3><div class="techs">' + arr(s.items).map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div></div>";
    }).join("");
    var c = arr(d.courses).map(function (x) {
      return "<li>" + (x.link ? ext(x.link, x.title) : esc(x.title)) + (x.org ? "<small>" + esc(x.org) + "</small>" : "") + "</li>";
    }).join("");
    return section("skills", "Skills & training",
      '<div class="skills">' + g + "</div>" + (c ? '<p class="subhead">Courses and certificates</p><ul class="courses">' + c + "</ul>" : ""));
  }

  function contact(d) {
    var p = d.profile || {};
    var rows = [];
    if (p.email) rows.push('<div class="email-line" style="margin:0"><span id="email2">' + esc(p.email) + '</span><button class="copy" type="button" data-copy="email2">Copy</button></div>');
    var links = [["GitHub", p.github], ["Google Scholar", p.google_scholar], ["ORCID", p.orcid], ["LinkedIn", p.linkedin], ["ResearchGate", p.researchgate]]
      .filter(function (x) { return x[1]; }).map(function (x) { return ext(x[1], x[0]); }).join("");
    return section("contact", "Contact",
      '<div class="contact"><p>' + esc(p.status || "") + ". I'm happy to talk about research fit, projects or collaboration.</p>" + rows.join("") +
      (links ? '<div class="links">' + links + "</div>" : "") +
      (d.references_note ? '<p style="color:var(--muted);font-size:15.5px">' + esc(d.references_note) + "</p>" : "") + "</div>");
  }

  /* ---------- behaviour ---------- */
  function wire(d) {
    // copy buttons
    document.querySelectorAll("button[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var el = document.getElementById(btn.getAttribute("data-copy"));
        var label = btn.textContent;
        function select() {
          var r = document.createRange(); r.selectNodeContents(el);
          var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
          btn.textContent = "Selected";
        }
        try {
          navigator.clipboard.writeText(el.textContent).then(function () {
            btn.textContent = "Copied"; setTimeout(function () { btn.textContent = label; }, 1500);
          }, select);
        } catch (e) { select(); }
      });
    });

    // publication filters
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
      b.addEventListener("click", function () {
        apply("theme:" + b.getAttribute("data-theme-filter"));
        document.getElementById("publications").scrollIntoView();
      });
    });

    // earlier roles
    var more = document.getElementById("more-jobs");
    if (more) more.addEventListener("click", function () {
      document.querySelectorAll("[data-extra]").forEach(function (el) { el.hidden = false; });
      more.remove();
    });

    // active nav link
    var links = document.querySelectorAll(".navlinks a");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      document.querySelectorAll("section[id]").forEach(function (s) { io.observe(s); });
    }

    if (d.profile && d.profile.short_name) document.getElementById("brand").textContent = d.profile.short_name;
    contours();
  }

  /* contour lines of a smooth synthetic terrain (marching squares) */
  function contours() {
    var c = document.getElementById("contours"); if (!c) return;
    var ctx = c.getContext("2d");
    function f(x, y) { return Math.sin(x * 1.3 + .4) * Math.cos(y * 1.7) + .6 * Math.sin(x * 2.9 - y * 1.1 + 1.2) + .35 * Math.cos(x * .7 + y * 3.1); }
    function draw() {
      var r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      if (!r.width) return;
      c.width = r.width * dpr; c.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--contour").trim();
      ctx.lineWidth = 1;
      var st = 8, cols = Math.ceil(r.width / st) + 1, rows = Math.ceil(r.height / st) + 1, v = [], i, j;
      for (j = 0; j < rows; j++) { v[j] = []; for (i = 0; i < cols; i++) v[j][i] = f(i * st / 170, j * st / 170); }
      for (var lv = -1.6; lv <= 1.6; lv += .22) {
        ctx.beginPath();
        for (j = 0; j < rows - 1; j++) for (i = 0; i < cols - 1; i++) {
          var a = v[j][i], b = v[j][i + 1], cc = v[j + 1][i + 1], dd = v[j + 1][i], x = i * st, y = j * st, p = [];
          var e = function (p1, p2, x1, y1, x2, y2) { if ((p1 < lv) !== (p2 < lv)) { var t = (lv - p1) / (p2 - p1); p.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]); } };
          e(a, b, x, y, x + st, y); e(b, cc, x + st, y, x + st, y + st); e(cc, dd, x + st, y + st, x, y + st); e(dd, a, x, y + st, x, y);
          if (p.length >= 2) { ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); }
          if (p.length === 4) { ctx.moveTo(p[2][0], p[2][1]); ctx.lineTo(p[3][0], p[3][1]); }
        }
        ctx.stroke();
      }
    }
    draw();
    var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(draw, 150); });
    if (window.matchMedia) { var m = matchMedia("(prefers-color-scheme: dark)"); if (m.addEventListener) m.addEventListener("change", draw); }
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* ---------- boot ---------- */
  function render(d) {
    var p = d.profile || {};
    if (p.name) document.title = p.name;
    document.getElementById("app").innerHTML =
      hero(d) + research(d) + publications(d) + software(d) + experience(d) + eduAwards(d) + teaching(d) + skills(d) + contact(d) +
      "<footer><span>© " + new Date().getFullYear() + " " + esc(p.name) + "</span><span>" + (d.updated ? "Updated " + esc(d.updated) : "") + "</span></footer>";
    wire(d);
  }
  function fail(msg) {
    document.getElementById("app").innerHTML = '<div class="error"><b>The site could not read content.yml.</b>\n\n' + esc(msg) +
      "\n\nOpen content.yml, fix the line mentioned above (check spaces and quotes), and commit again.</div>";
  }

  fetch("content.yml", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("content.yml was not found (HTTP " + r.status + ")."); return r.text(); })
    .then(function (txt) {
      var data;
      try { data = jsyaml.load(txt); } catch (e) { return fail(e.message); }
      render(data || {});
    })
    .catch(function (e) { fail(e.message); });
})();
