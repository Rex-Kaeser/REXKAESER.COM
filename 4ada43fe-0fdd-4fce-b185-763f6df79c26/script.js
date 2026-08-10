(function () {
  "use strict";

  // Progressive-enhancement flag: CSS only hides .reveal content when this class is present,
  // so the page is fully readable if JS fails to load.
  document.documentElement.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- scroll progress bar ---------------- */

  var progressBar = document.getElementById("progress");
  function updateProgress() {
    var doc = document.documentElement;
    var scrollTop = doc.scrollTop || document.body.scrollTop;
    var height = doc.scrollHeight - doc.clientHeight;
    var pct = height > 0 ? (scrollTop / height) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + "%";
  }
  document.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  /* ---------------- reveal on scroll ---------------- */

  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------- dot nav active state ---------------- */

  var sections = document.querySelectorAll("section[id]");
  var dots = document.querySelectorAll(".dotnav a");
  if (sections.length && dots.length && "IntersectionObserver" in window) {
    var navMap = {};
    dots.forEach(function (d) { navMap[d.getAttribute("href").slice(1)] = d; });
    var navIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var dot = navMap[entry.target.id];
          if (!dot) return;
          if (entry.isIntersecting) {
            dots.forEach(function (d) { d.classList.remove("active"); });
            dot.classList.add("active");
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    sections.forEach(function (s) { navIo.observe(s); });
  }

  /* ---------------- animated stat numbers ---------------- */

  var statEls = document.querySelectorAll("[data-count]");
  if (statEls.length) {
    var countIo = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          countIo.unobserve(el);
          var target = parseInt(el.getAttribute("data-count"), 10);
          var suffix = el.getAttribute("data-suffix") || "";
          if (reduceMotion) {
            el.textContent = target + suffix;
            return;
          }
          var start = 0;
          var duration = 1400;
          var startTime = null;
          function step(ts) {
            if (!startTime) startTime = ts;
            var progress = Math.min((ts - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var val = Math.round(start + (target - start) * eased);
            el.textContent = val + suffix;
            if (progress < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        });
      },
      { threshold: 0.5 }
    );
    statEls.forEach(function (el) { countIo.observe(el); });
  }

  /* ---------------- hero canvas: flowing river lines ---------------- */

  var canvas = document.getElementById("riverCanvas");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var w, h, dpr;
    var rafId = null;
    var running = true;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    var lineCount = 7;
    var lines = [];
    for (var i = 0; i < lineCount; i++) {
      lines.push({
        yBase: 0.15 + (i / lineCount) * 0.75,
        amp: 18 + Math.random() * 34,
        freq: 0.0016 + Math.random() * 0.0018,
        speed: 0.00025 + Math.random() * 0.0004,
        phase: Math.random() * 1000,
        width: 1 + Math.random() * 1.6,
        color: i % 2 === 0 ? "45,212,191" : "232,147,90"
      });
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      lines.forEach(function (ln) {
        ctx.beginPath();
        var y0 = h * ln.yBase;
        for (var x = 0; x <= w; x += 6) {
          var y = y0 + Math.sin(x * ln.freq + t * ln.speed + ln.phase) * ln.amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(" + ln.color + "," + 0.28 + ")";
        ctx.lineWidth = ln.width;
        ctx.stroke();
      });
      if (running) rafId = requestAnimationFrame(draw);
    }

    if (reduceMotion) {
      draw(0);
    } else {
      rafId = requestAnimationFrame(draw);
      document.addEventListener("visibilitychange", function () {
        running = !document.hidden;
        if (running && !rafId) rafId = requestAnimationFrame(draw);
      });
    }
  }

  /* ---------------- uncertainty widget ---------------- */

  var track = document.getElementById("widgetTrack");
  var legend = document.getElementById("widgetLegend");
  var rerollBtn = document.getElementById("rerollBtn");

  var disruptions = [
    {
      label: "Funding disappears",
      range: [8, 42],
      detail: "A budget line gets cut, an operator changes hands, or the economics that justified the project stop working — long before the concrete does."
    },
    {
      label: "Safety failure",
      range: [4, 55],
      detail: "An inspection turns up something the original design never accounted for. The clock doesn't wait for the planned service life to finish."
    },
    {
      label: "License or rights challenge",
      range: [30, 88],
      detail: "This is what actually hit the Klamath dams: their federal operating license expired in 2006, decades before anyone had a real plan for what came next."
    },
    {
      label: "Natural disaster",
      range: [2, 78],
      detail: "Flood, fire, earthquake. Infrastructure doesn't get to finish its story on schedule just because the engineering was sound."
    },
    {
      label: "Sustained opposition",
      range: [15, 96],
      detail: "Organizers behind the Klamath removals were told for years it would never happen. It took roughly thirty years of pressure before it did."
    }
  ];

  function renderWidget() {
    if (!track || !legend) return;
    // clear old dots
    track.querySelectorAll(".disruption-dot").forEach(function (d) { d.remove(); });
    legend.innerHTML = "";

    var placed = disruptions
      .map(function (d) {
        var year = Math.round(d.range[0] + Math.random() * (d.range[1] - d.range[0]));
        return { def: d, year: year };
      })
      .sort(function (a, b) { return a.year - b.year; });

    placed.forEach(function (item, idx) {
      var dot = document.createElement("button");
      dot.className = "disruption-dot";
      dot.type = "button";
      dot.style.left = item.year + "%";
      dot.setAttribute("aria-label", item.def.label + ", year " + item.year);
      dot.title = item.def.label + " — year " + item.year;
      track.appendChild(dot);

      var card = document.createElement("div");
      card.className = "legend-item";
      card.innerHTML =
        '<span class="yr">Year ' + item.year + " of 100</span>" +
        "<h4>" + item.def.label + "</h4>" +
        "<p>" + item.def.detail + "</p>";

      dot.addEventListener("mouseenter", function () { card.classList.add("hot"); });
      dot.addEventListener("mouseleave", function () { card.classList.remove("hot"); });
      dot.addEventListener("focus", function () { card.classList.add("hot"); });
      dot.addEventListener("blur", function () { card.classList.remove("hot"); });
      dot.addEventListener("click", function () {
        card.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        card.classList.add("hot");
        setTimeout(function () { card.classList.remove("hot"); }, 1400);
      });

      legend.appendChild(card);
    });
  }

  if (track && legend) {
    renderWidget();
    if (rerollBtn) {
      rerollBtn.addEventListener("click", renderWidget);
    }
  }

  /* ---------------- mobile: smooth-scroll fallback for older browsers ---------------- */

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1);
      var target = document.getElementById(id);
      if (target && "scrollBehavior" in document.documentElement.style === false) {
        e.preventDefault();
        target.scrollIntoView();
      }
    });
  });
})();
