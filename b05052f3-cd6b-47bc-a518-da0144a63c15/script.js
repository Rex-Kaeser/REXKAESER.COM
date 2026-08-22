(function () {
  "use strict";

  var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Recomputed per-render from the actual schedule (see computeGridBounds) —
  // these defaults only matter if something reads them before the first
  // render completes.
  var GRID_START_MIN = 7 * 60;
  var GRID_END_MIN = 16 * 60;
  var HOUR_PX = 64;

  var app = document.getElementById("app");
  var loadingMsg = document.getElementById("loadingMsg");
  var termLabel = document.getElementById("termLabel");
  var gridView = document.getElementById("gridView");
  var gridHeader = document.getElementById("gridHeader");
  var gridBody = document.getElementById("gridBody");
  var dayScroller = document.getElementById("dayScroller");
  var dayHours = document.getElementById("dayHours");
  var dayTrack = document.getElementById("dayTrack");
  var dayDots = document.getElementById("dayDots");
  var asyncSection = document.getElementById("asyncSection");
  var asyncStrip = document.getElementById("asyncStrip");
  var overlay = document.getElementById("overlay");
  var detailClose = document.getElementById("detailClose");

  var today = new Date();
  var todayIdx = today.getDay(); // 0 = Sunday
  var timedClassesCache = [];

  init();

  function init() {
    fetch("calendar.txt", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("Could not read calendar.txt (" + r.status + ")");
        return r.text();
      })
      .then(function (text) {
        var configFile = parseCalendarTxt(text);
        if (!configFile) throw new Error("calendar.txt did not name a config file.");
        return fetch(configFile, { cache: "no-store" }).then(function (r) {
          if (!r.ok) throw new Error("Could not read " + configFile + " (" + r.status + ")");
          return r.json();
        });
      })
      .then(renderSchedule)
      .catch(function (err) {
        showError(err.message);
      });
  }

  function parseCalendarTxt(text) {
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.indexOf("#") === 0) continue;
      return line;
    }
    return null;
  }

  function showError(msg) {
    app.innerHTML = '<div class="error">LINK FAILURE — ' + escapeHtml(msg) + '</div>';
  }

  // ---------- time helpers ----------

  function timeToMinutes(t) {
    if (!t) return null;
    var parts = t.split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function formatTime(t) {
    var mins = timeToMinutes(t);
    if (mins === null) return "";
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    var suffix = h >= 12 ? "PM" : "AM";
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + (m ? ":" + (m < 10 ? "0" : "") + m : ":00") + " " + suffix;
  }

  // Grid spans 30 min before the earliest class start and 30 min after the
  // latest class end, across every day of the week (not per-day — the desktop
  // grid and every mobile day panel share one scale, so the bound has to be
  // the widest one needed by any day).
  function computeGridBounds(timedClasses) {
    var starts = [];
    var ends = [];
    timedClasses.forEach(function (c) {
      starts.push(timeToMinutes(c.start));
      ends.push(timeToMinutes(c.end));
    });
    if (!starts.length) return { start: 8 * 60, end: 17 * 60 };
    var minStart = Math.min.apply(null, starts);
    var maxEnd = Math.max.apply(null, ends);
    return {
      start: Math.max(0, minStart - 30),
      end: Math.min(24 * 60, maxEnd + 30)
    };
  }

  // Hour ticks (for grid lines + axis labels) always land on the clock hour,
  // even though GRID_START_MIN/GRID_END_MIN themselves usually don't (they're
  // padded by 30 min from computeGridBounds) — so the first/last tick sits
  // inset from the grid's top/bottom edge rather than glued to it.
  function getHourTicks() {
    var ticks = [];
    var first = Math.ceil(GRID_START_MIN / 60) * 60;
    var last = Math.floor(GRID_END_MIN / 60) * 60;
    for (var m = first; m <= last; m += 60) ticks.push(m);
    return ticks;
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- main render ----------

  function renderSchedule(data) {
    loadingMsg.hidden = true;
    termLabel.textContent = (data.term || "").toUpperCase() +
      (data.termStart ? "  ·  " + formatDate(data.termStart) + " – " + formatDate(data.termEnd) : "");

    var classes = data.classes || [];
    var timedClasses = classes.filter(function (c) { return c.days && c.days.length > 0; });
    var asyncClasses = classes.filter(function (c) { return !c.days || c.days.length === 0; });

    app.innerHTML = "";
    if (asyncClasses.length) {
      buildAsyncStrip(asyncClasses);
      asyncSection.hidden = false;
    }

    var bounds = computeGridBounds(timedClasses);
    GRID_START_MIN = bounds.start;
    GRID_END_MIN = bounds.end;

    timedClassesCache = timedClasses;
    buildGridView(timedClasses);
    buildDayScrollerView(timedClasses, computeMobileHourPx());

    gridView.hidden = false;
    dayScroller.hidden = false;

    // Auto-jump to today's panel (mobile). Reading offsetLeft below forces
    // layout, so this is safe to call immediately (no rAF needed — rAF is
    // throttled/never fires in a backgrounded tab, e.g. a hidden preview pane).
    scrollToToday();

    updateNowLines();
    if (!nowLineInterval) nowLineInterval = setInterval(updateNowLines, 60 * 1000);
  }

  var nowLineInterval = null;

  // Re-fits the mobile day view to the viewport (orientation change, browser
  // chrome showing/hiding, etc.) and re-centers on today afterward.
  function rebuildMobileDayView() {
    buildDayScrollerView(timedClassesCache, computeMobileHourPx());
    scrollToToday();
    updateNowLines();
  }

  function buildAsyncStrip(asyncClasses) {
    asyncStrip.innerHTML = "";
    asyncClasses.forEach(function (c) {
      var item = document.createElement("span");
      item.className = "async-strip__item";
      item.innerHTML = "<b>" + escapeHtml(c.type || "Online") + "</b> — " + escapeHtml(c.title);
      item.addEventListener("click", function () { openDetail(c); });
      asyncStrip.appendChild(item);
    });
  }

  // ---------- desktop grid ----------

  function buildGridView(classes) {
    gridHeader.innerHTML = "";
    gridBody.innerHTML = "";

    var timeCol = document.createElement("div");
    timeCol.className = "grid-header__cell";
    timeCol.textContent = "";
    gridHeader.appendChild(timeCol);

    DAY_NAMES.forEach(function (name, idx) {
      var cell = document.createElement("div");
      cell.className = "grid-header__cell" + (idx === todayIdx ? " is-today" : "");
      cell.textContent = name;
      gridHeader.appendChild(cell);
    });

    var totalMinutes = GRID_END_MIN - GRID_START_MIN;
    var totalHeight = (totalMinutes / 60) * HOUR_PX;

    var hourTicks = getHourTicks();

    var timeColBody = document.createElement("div");
    timeColBody.className = "time-col";
    timeColBody.style.height = totalHeight + "px";
    hourTicks.forEach(function (m) {
      var label = document.createElement("div");
      label.className = "time-col__label";
      label.style.top = ((m - GRID_START_MIN) / 60 * HOUR_PX) + "px";
      label.textContent = formatTime(minutesToTimeStr(m));
      timeColBody.appendChild(label);
    });
    gridBody.appendChild(timeColBody);

    DAY_NAMES.forEach(function (dayName, dayIdx) {
      var col = document.createElement("div");
      col.className = "day-col" + (dayIdx === todayIdx ? " is-today" : "");
      col.style.height = totalHeight + "px";

      hourTicks.forEach(function (mm) {
        var hl = document.createElement("div");
        hl.className = "hour-line";
        hl.style.top = ((mm - GRID_START_MIN) / 60 * HOUR_PX) + "px";
        col.appendChild(hl);
      });

      if (dayIdx === todayIdx) {
        col.appendChild(makeNowLine(HOUR_PX));
      }

      var dayEvents = classes.filter(function (c) {
        return c.days.indexOf(dayName) !== -1;
      });
      var laidOut = layoutOverlaps(dayEvents);

      laidOut.forEach(function (item) {
        var c = item.event;
        var startMin = timeToMinutes(c.start);
        var endMin = timeToMinutes(c.end);
        var top = ((startMin - GRID_START_MIN) / 60) * HOUR_PX;
        var height = ((endMin - startMin) / 60) * HOUR_PX;

        var block = document.createElement("div");
        block.className = "event-block" + (height < 40 ? " event-block--compact" : "");
        block.style.top = top + "px";
        block.style.height = Math.max(height, 22) + "px";
        block.style.left = "calc(" + item.left + "% + 2px)";
        block.style.width = "calc(" + item.width + "% - 4px)";
        block.style.setProperty("--block-color", c.color || "#43d9ff");
        block.tabIndex = 0;
        block.setAttribute("role", "button");
        block.innerHTML =
          '<div class="event-block__title">' + escapeHtml(c.title) + '</div>' +
          '<div class="event-block__meta">' + escapeHtml(c.room ? c.building + " " + c.room : c.building) + '</div>';
        block.addEventListener("click", function () { openDetail(c); });
        block.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(c); }
        });
        col.appendChild(block);
      });

      gridBody.appendChild(col);
    });
  }

  function minutesToTimeStr(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  // Greedy column-packing so overlapping events (e.g. a lecture nested inside
  // a longer recitation) sit side-by-side instead of stacking on top of each
  // other. Column counts are computed per connected overlap cluster, not for
  // the whole day — otherwise a single early overlap (e.g. two Tuesday-morning
  // classes) would needlessly halve the width of unrelated later events.
  function layoutOverlaps(events) {
    var sorted = events.slice().sort(function (a, b) {
      return timeToMinutes(a.start) - timeToMinutes(b.start);
    });
    var results = [];
    var i = 0;
    while (i < sorted.length) {
      var clusterEnd = i;
      var maxEnd = timeToMinutes(sorted[i].end);
      while (clusterEnd + 1 < sorted.length && timeToMinutes(sorted[clusterEnd + 1].start) < maxEnd) {
        clusterEnd++;
        maxEnd = Math.max(maxEnd, timeToMinutes(sorted[clusterEnd].end));
      }

      var columns = []; // columns[i] = end-minute of the last event placed in column i
      var placed = sorted.slice(i, clusterEnd + 1).map(function (ev) {
        var start = timeToMinutes(ev.start);
        var end = timeToMinutes(ev.end);
        var col = 0;
        while (columns[col] !== undefined && columns[col] > start) col++;
        columns[col] = end;
        return { event: ev, col: col };
      });
      var totalCols = columns.length || 1;
      placed.forEach(function (p) {
        results.push({
          event: p.event,
          left: (p.col / totalCols) * 100,
          width: (1 / totalCols) * 100
        });
      });

      i = clusterEnd + 1;
    }
    return results;
  }

  // ---------- mobile day scroller ----------
  // Arranged the same way as the desktop week grid: each day is its own
  // mini time-grid (same GRID_START_MIN/GRID_END_MIN/HOUR_PX scale), so the
  // shared sideways hour axis on the left lines up with every day's rows.

  var HOUR_LABEL_H = 14; // px — must match .day-scroller__hour-label height in CSS
  var MOBILE_HOUR_PX_MIN = 30; // below this, tiles/text stop being legible
  var DAY_SCROLLER_DOTS_H = 30; // px — must match .day-scroller__dots (4px + 6px dot + 20px padding)
  var DAY_SCROLLER_BUFFER = 14; // breathing room below the fold on mobile

  // Shrinks the hour scale so a full day (GRID_START_MIN..GRID_END_MIN) fits
  // within the phone's actual free vertical space — viewport height minus the
  // header, the async strip (if shown), the dot row, and the day panel's own
  // chrome (padding/border/head) — instead of a fixed px-per-hour that forces
  // scrolling on most phones. Read from the same CSS custom properties the
  // day-panel chrome is built from, so the two never drift apart.
  function computeMobileHourPx() {
    var headerH = document.querySelector(".hud-header").getBoundingClientRect().height;
    var asyncH = 0;
    if (!asyncSection.hidden) {
      var asyncStyle = getComputedStyle(asyncSection);
      asyncH = asyncSection.getBoundingClientRect().height +
        parseFloat(asyncStyle.marginTop) + parseFloat(asyncStyle.marginBottom);
    }

    var bodyStyle = getComputedStyle(document.querySelector(".day-scroller__body"));
    var panelPad = parseFloat(bodyStyle.getPropertyValue("--panel-pad")) || 14;
    var panelHeadH = parseFloat(bodyStyle.getPropertyValue("--panel-head-h")) || 40;
    var headGap = parseFloat(bodyStyle.getPropertyValue("--head-gap")) || 8;
    var trackPad = 10 + 6; // .day-scroller__track's own top+bottom padding
    var panelBorder = 2; // 1px top + 1px bottom
    var chrome = trackPad + panelBorder + panelPad * 2 + panelHeadH + headGap;

    var available = window.innerHeight - headerH - asyncH - DAY_SCROLLER_DOTS_H - chrome - DAY_SCROLLER_BUFFER;
    var totalHours = (GRID_END_MIN - GRID_START_MIN) / 60;
    var hourPx = Math.floor(available / totalHours);

    return Math.max(MOBILE_HOUR_PX_MIN, Math.min(HOUR_PX, hourPx));
  }

  var NOON_MIN = 12 * 60;

  // "Now" indicator — one per today's column/panel. Position is stamped with
  // the px-per-hour scale it was built at (desktop's fixed HOUR_PX or
  // mobile's viewport-fit hourPx) so updateNowLines can reposition it
  // correctly without needing to know which view it belongs to.
  function makeNowLine(scale) {
    var line = document.createElement("div");
    line.className = "now-line";
    line.dataset.hourPx = String(scale);
    line.hidden = true; // updateNowLines sets the real state immediately after
    return line;
  }

  // Moves every "now" line to the current time and shows/hides it — hidden
  // whenever the current moment falls outside the grid's displayed hours
  // (before the first class's -30min padding or after the last one's).
  // Today's column/panel is fixed at page-load (todayIdx), same as the rest
  // of the app, so this doesn't roll over at midnight if left open.
  function updateNowLines() {
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var inRange = now.getDay() === todayIdx && nowMin >= GRID_START_MIN && nowMin <= GRID_END_MIN;

    document.querySelectorAll(".now-line").forEach(function (line) {
      line.hidden = !inRange;
      if (!inRange) return;
      var scale = parseFloat(line.dataset.hourPx);
      line.style.top = ((nowMin - GRID_START_MIN) / 60 * scale) + "px";
    });
  }

  // Mobile hour axis: bare hour number, no AM/PM (repeating it on every tick
  // is noise) — the switch from AM to PM is marked instead by a thicker
  // divider line at noon, drawn in buildDayScrollerView below.
  function formatHourOnly(mins) {
    var h = Math.floor(mins / 60) % 12;
    if (h === 0) h = 12;
    return String(h);
  }

  function buildHourAxis(hourPx) {
    dayHours.innerHTML = "";
    getHourTicks().forEach(function (m) {
      var label = document.createElement("div");
      label.className = "day-scroller__hour-label";
      var tickY = (m - GRID_START_MIN) / 60 * hourPx;
      label.style.top = (tickY - HOUR_LABEL_H / 2) + "px";
      label.textContent = formatHourOnly(m);
      dayHours.appendChild(label);
    });
  }

  function buildDayScrollerView(classes, hourPx) {
    dayTrack.innerHTML = "";
    dayDots.innerHTML = "";
    buildHourAxis(hourPx);

    var totalMinutes = GRID_END_MIN - GRID_START_MIN;
    var gridHeight = (totalMinutes / 60) * hourPx;
    dayHours.style.height = gridHeight + "px";
    var hourTicks = getHourTicks();

    DAY_NAMES.forEach(function (dayName, dayIdx) {
      var panel = document.createElement("div");
      panel.className = "day-panel" + (dayIdx === todayIdx ? " is-today" : "");
      panel.dataset.dayIdx = dayIdx;

      var head = document.createElement("div");
      head.className = "day-panel__head";
      var nameEl = document.createElement("div");
      nameEl.className = "day-panel__name";
      nameEl.textContent = DAY_FULL[dayIdx];
      head.appendChild(nameEl);
      if (dayIdx === todayIdx) {
        var tag = document.createElement("div");
        tag.className = "day-panel__tag";
        tag.textContent = "TODAY";
        head.appendChild(tag);
      }
      panel.appendChild(head);

      var grid = document.createElement("div");
      grid.className = "day-panel__grid";
      grid.style.height = gridHeight + "px";

      hourTicks.forEach(function (mm) {
        var hl = document.createElement("div");
        hl.className = "hour-line" + (mm === NOON_MIN ? " hour-line--noon" : "");
        hl.style.top = ((mm - GRID_START_MIN) / 60 * hourPx) + "px";
        grid.appendChild(hl);
      });

      if (dayIdx === todayIdx) {
        grid.appendChild(makeNowLine(hourPx));
      }

      var dayEvents = classes.filter(function (c) {
        return c.days.indexOf(dayName) !== -1;
      });

      if (dayEvents.length === 0) {
        var empty = document.createElement("div");
        empty.className = "day-panel__empty";
        empty.innerHTML = "<span>NO CLASSES</span>";
        // Sit right on the noon divider — falls back to a fixed mid-grid
        // position if a future schedule ever pushes noon outside the grid's
        // (dynamically computed) start/end bounds.
        var noonInRange = NOON_MIN >= GRID_START_MIN && NOON_MIN <= GRID_END_MIN;
        empty.style.top = noonInRange
          ? ((NOON_MIN - GRID_START_MIN) / 60 * hourPx) + "px"
          : "40%";
        grid.appendChild(empty);
      } else {
        var laidOut = layoutOverlaps(dayEvents);
        laidOut.forEach(function (item) {
          var c = item.event;
          var startMin = timeToMinutes(c.start);
          var endMin = timeToMinutes(c.end);
          var top = ((startMin - GRID_START_MIN) / 60) * hourPx;
          var height = ((endMin - startMin) / 60) * hourPx;

          var block = document.createElement("div");
          block.className = "event-block" + (height < 46 ? " event-block--compact" : "");
          block.style.top = top + "px";
          block.style.height = Math.max(height, 26) + "px";
          block.style.left = "calc(" + item.left + "% + 2px)";
          block.style.width = "calc(" + item.width + "% - 4px)";
          block.style.setProperty("--block-color", c.color || "#43d9ff");
          block.tabIndex = 0;
          block.setAttribute("role", "button");
          block.innerHTML =
            '<div class="event-block__title">' + escapeHtml(c.title) + '</div>' +
            '<div class="event-block__meta">' + escapeHtml(c.room ? c.building + " " + c.room : c.building) + '</div>';
          block.addEventListener("click", function () { openDetail(c); });
          grid.appendChild(block);
        });
      }

      panel.appendChild(grid);
      dayTrack.appendChild(panel);

      var dot = document.createElement("div");
      dot.className = "day-dot" + (dayIdx === todayIdx ? " is-active" : "");
      dayDots.appendChild(dot);
    });

    dayTrack.addEventListener("scroll", debounce(updateActiveDot, 100));
  }

  function updateActiveDot() {
    var panels = dayTrack.querySelectorAll(".day-panel");
    var trackCenter = dayTrack.scrollLeft + dayTrack.clientWidth / 2;
    var closest = 0;
    var closestDist = Infinity;
    panels.forEach(function (panel, i) {
      var center = panel.offsetLeft + panel.offsetWidth / 2;
      var dist = Math.abs(center - trackCenter);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    var dots = dayDots.querySelectorAll(".day-dot");
    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === closest);
    });
  }

  function scrollToToday() {
    var panel = dayTrack.querySelector('.day-panel[data-day-idx="' + todayIdx + '"]');
    if (!panel) return;
    var target = panel.offsetLeft - (dayTrack.clientWidth - panel.offsetWidth) / 2;
    dayTrack.scrollLeft = Math.max(target, 0);
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments;
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  // ---------- detail modal ----------

  function openDetail(c) {
    document.getElementById("detailType").textContent = (c.type || "Class").toUpperCase();
    document.getElementById("detailTitle").textContent = c.title;
    document.getElementById("detailCode").textContent = c.courseCode || "";
    document.getElementById("detailProf").textContent = c.instructor || "—";

    var coRow = document.getElementById("detailCoRow");
    if (c.coInstructors && c.coInstructors.length) {
      coRow.hidden = false;
      document.getElementById("detailCo").textContent = c.coInstructors.join(", ");
    } else {
      coRow.hidden = true;
      document.getElementById("detailCo").textContent = "—";
    }

    var loc = c.room && c.room !== "—" ? c.building + " — Room " + c.room : c.building;
    document.getElementById("detailLoc").textContent = loc;

    var timeText = "—";
    if (c.days && c.days.length) {
      timeText = c.days.join("/") + "  " + formatTime(c.start) + " – " + formatTime(c.end);
    } else if (c.notes) {
      timeText = "Async";
    }
    document.getElementById("detailTime").textContent = timeText;

    document.getElementById("detailTerm").textContent =
      formatDate(c.termStart) + " – " + formatDate(c.termEnd);
    document.getElementById("detailCrn").textContent = c.crn || "—";

    var notesEl = document.getElementById("detailNotes");
    if (c.notes) {
      notesEl.hidden = false;
      notesEl.textContent = c.notes;
    } else {
      notesEl.hidden = true;
    }

    overlay.classList.add("is-open");
  }

  function closeDetail() {
    overlay.classList.remove("is-open");
  }

  detailClose.addEventListener("click", closeDetail);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeDetail();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDetail();
  });

  window.addEventListener("resize", debounce(rebuildMobileDayView, 200));
})();
