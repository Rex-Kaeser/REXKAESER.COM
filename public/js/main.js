const DATA_DIR = "/public/data";

async function getJSON(name) {
  const res = await fetch(`${DATA_DIR}/${name}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${name}.json (${res.status})`);
  return res.json();
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function whenRange(start, end) {
  return `${start} – ${end}`;
}

/* ---------- Badge system: any card (degree, experience, project, skill) can
   carry a left-edge type tab (item.type → badge-types.json "types") and/or a
   top-right status badge (item.status → badge-types.json "status"). Add the
   field to a data file and the tab/badge appears immediately — no code
   changes needed for a new type or status, only a JSON entry. ---------- */
let BADGES = { types: {}, status: {} };

function cssVars(vars) {
  const parts = Object.entries(vars).filter(([, v]) => v != null).map(([k, v]) => `${k}:${v}`);
  return parts.length ? parts.join(";") : undefined;
}

function buildStatusBadge(statusKey, extraClass = "") {
  const info = BADGES.status[statusKey];
  if (!info) return null;
  return el("span", { class: `status-badge${extraClass ? " " + extraClass : ""}`, style: cssVars({ "--badge-color": info.color }) }, info.label);
}

// Experience items derive "current" from end === "Present" unless an
// explicit status is already set in the data.
function resolveStatus(item) {
  return item.status || (item.end === "Present" ? "current" : undefined);
}

// .type-tab-label is a plain (unrotated) positioning box — JS drives its
// top/height to track scroll. .type-tab-label-text is what's actually
// rotated, via transform rather than writing-mode: an explicit rotate()
// on normally-shaped horizontal glyphs rasterizes far more cleanly than
// writing-mode's built-in glyph rotation, which several engines antialias
// as if the text were still horizontal, leaving rotated edges jagged.
function buildTypeTab(labelText) {
  const text = el("span", { class: "type-tab-label-text" }, labelText);
  const label = el("div", { class: "type-tab-label" }, [text]);
  return { tab: el("div", { class: "type-tab" }, [label]), label, text };
}

function applyBlockBadges(node, item, { borderMatchesStatus = false } = {}) {
  const typeInfo = item.type ? BADGES.types[item.type] : null;
  const statusKey = resolveStatus(item);
  const badge = statusKey ? buildStatusBadge(statusKey) : null;
  if (typeInfo) {
    node.classList.add("has-type");
    node.appendChild(buildTypeTab(typeInfo.label).tab);
  }
  if (badge) {
    node.classList.add("has-status");
    if (borderMatchesStatus) node.classList.add("status-border-match");
    node.appendChild(badge);
  }
  // --badge-color lives on the badge span itself (buildStatusBadge sets it
  // there) — custom properties don't flow upward, so border-color rules on
  // the card (.status-border-match) need their own copy set here too, or
  // they'd silently resolve to the var()'s static fallback instead.
  const varsStr = cssVars({ "--type-color": typeInfo?.color, "--badge-color": borderMatchesStatus ? BADGES.status[statusKey]?.color : undefined });
  if (varsStr) {
    const existing = node.getAttribute("style");
    node.setAttribute("style", existing ? `${existing};${varsStr}` : varsStr);
  }
}

/* ---------- Profile / hero + topbar + title block ---------- */
function renderProfile(p) {
  document.title = "Rex Kaeser - Mechanical Engineer";

  document.getElementById("topbar-id").innerHTML =
    `<b>${p.shortName}</b><span>&nbsp;/ ${p.shortTitle}</span>`;

  document.getElementById("hero-name").innerHTML =
    `Building hardware that <span class="accent">goes fast.</span>`;
  document.getElementById("hero-tagline").textContent = p.tagline;

  const meta = document.getElementById("hero-meta");
  meta.append(
    el("span", {}, [document.createTextNode(p.location)]),
    el("span", {}, [el("span", { class: "dot" }), document.createTextNode(p.status)]),
    el("span", {}, [document.createTextNode(p.email)])
  );

  const actions = document.getElementById("hero-actions");
  actions.append(
    el("a", { class: "btn primary", href: `mailto:${p.email}` }, "Email Me"),
    el("a", { class: "btn", href: p.links.find(l => l.label === "LinkedIn")?.url || "#", target: "_blank", rel: "noopener" }, "LinkedIn"),
    el("a", { class: "btn", href: "#contact" }, "Contact →")
  );

  const tb = document.getElementById("title-block");
  const cells = [
    ["Name", p.name],
    ["Title", p.title],
    ["Location", p.location],
    ["Status", p.status],
  ];
  tb.append(...cells.map(([k, v]) =>
    el("div", { class: "cell" }, [el("span", { class: "k" }, k.toUpperCase()), el("span", { class: "v" }, v)])
  ));

  document.getElementById("contact-email").textContent = p.email;
  document.getElementById("contact-email").href = `mailto:${p.email}`;
  document.getElementById("contact-phone").textContent = p.phone;
}

/* ---------- Experience ---------- */
function experienceCard(item, { assignId = true } = {}) {
  const card = el("article", { class: "card reveal", id: (assignId && item.id) ? `exp-${item.id}` : undefined });
  applyBlockBadges(card, item);
  card.append(
    el("div", { class: "row-head" }, [
      el("h3", {}, item.title),
      el("span", { class: "when" }, whenRange(item.start, item.end)),
    ]),
    el("p", { class: "org" }, `${item.org} — ${item.location}`),
    el("ul", {}, item.bullets.map(b => el("li", {}, b))),
    el("div", { class: "tags" }, (item.tags || []).map(t => el("span", { class: "tag" }, t)))
  );
  return card;
}

function renderExperience(data) {
  const grid = document.getElementById("experience-grid");
  grid.append(...data.featured.map(experienceCard));

  const compact = document.getElementById("experience-additional");
  compact.appendChild(el("div", { class: "label" }, "Additional Experience"));
  data.additional.forEach(item => {
    const row = el("div", { class: "compact-row" });
    const left = el("span", {}, [
      el("span", { class: "who" }, item.title + ", "),
      el("span", { class: "org" }, item.org),
    ]);
    row.append(left, el("span", { class: "when" }, whenRange(item.start, item.end)));
    compact.appendChild(row);
  });
}

/* ---------- Projects ---------- */
function projectCard(p) {
  const card = el("article", { class: "card reveal" });
  applyBlockBadges(card, p);
  card.append(
    el("div", { class: "row-head" }, [
      el("h3", {}, p.title),
      el("span", { class: "when" }, whenRange(p.start, p.end)),
    ]),
    el("p", { class: "org" }, p.course + (p.location ? ` — ${p.location}` : "")),
    el("p", { class: "summary" }, p.summary),
    el("ul", {}, p.bullets.map(b => el("li", {}, b))),
    el("div", { class: "tags" }, (p.tags || []).map(t => el("span", { class: "tag" }, t)))
  );

  if (p.video) {
    const inner = el("div", { class: "project-video-inner" }, [
      el("div", { class: "project-video-frame" }, [
        el("iframe", { src: p.video.embedUrl, title: `${p.title} — video`, allowfullscreen: "", frameborder: "0" }),
      ]),
    ]);
    if (p.video.linkUrl) {
      inner.appendChild(el("a", { class: "project-video-link", href: p.video.linkUrl, target: "_blank", rel: "noopener" }, p.video.linkText || "View original ↗"));
    }
    const detail = el("div", { class: "project-video-detail" }, [inner]);

    const toggle = el("button", { class: "expand-toggle", type: "button", "aria-expanded": "false" }, [
      el("span", {}, "View Video"),
      el("span", { class: "chevron", html: CHEVRON_SVG }),
    ]);
    toggle.addEventListener("click", () => toggleDegreeDetail(toggle, detail));

    card.append(toggle, detail);
  }

  return card;
}

function renderProjects(items) {
  const grid = document.getElementById("projects-grid");
  grid.append(...items.map(projectCard));
}

/* ---------- Info popup: hover/tap anywhere on the host element (a tag, chip,
   or certification row) to reveal a snippet. The dot is just a visual cue
   that more info exists — the whole element is the trigger. ---------- */
// A popup always starts flush with its trigger's left edge. Near the right
// side of a narrow (mobile) viewport that runs it off-screen, so once it's
// open, pull it back left by exactly however much it overflows — clamped so
// the pull-back itself can never push the left edge off-screen either.
function positionSnippetPopup(popup) {
  popup.style.left = "";
  const margin = 10;
  const r = popup.getBoundingClientRect();
  // documentElement.clientWidth, not window.innerWidth — the latter can
  // include extra chrome/scrollbar width depending on the environment.
  const vw = document.documentElement.clientWidth;
  const overflowRight = r.right - (vw - margin);
  if (overflowRight > 0) {
    popup.style.left = `${Math.max(-r.left + margin, -overflowRight)}px`;
  }
}

function attachSnippetInfo(hostEl, popupBodyEl) {
  hostEl.classList.add("has-info");
  hostEl.setAttribute("tabindex", "0");
  // For rows like .compact-row (a flex line with pre-existing space-between
  // children), anchor the dot+popup inside the leading label instead of as a
  // new flex sibling — hover/tap still applies to the whole row via .has-info.
  const anchor = hostEl.querySelector(".who") || hostEl;
  anchor.appendChild(el("span", { class: "info-dot", "aria-hidden": "true" }));
  const popup = el("div", { class: "info-popup" }, [popupBodyEl]);
  anchor.appendChild(popup);
  hostEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !hostEl.classList.contains("open");
    document.querySelectorAll(".has-info.open").forEach(t => t !== hostEl && t.classList.remove("open"));
    hostEl.classList.toggle("open", willOpen);
    if (willOpen) positionSnippetPopup(popup);
  });
  // The click path above only covers tap-to-open — a plain desktop hover
  // (no click at all) shows the popup purely via CSS :hover and never runs
  // that handler, so the overflow repositioning needs its own hook here too.
  hostEl.addEventListener("mouseenter", () => positionSnippetPopup(popup));
}
document.addEventListener("click", () => {
  document.querySelectorAll(".has-info.open").forEach(t => t.classList.remove("open"));
});

// Desktop only (real hover capability): moving the mouse onto a different
// snippet trigger closes any other one left open by a click.
function initSnippetHoverClose() {
  if (!window.matchMedia("(hover: hover)").matches) return;
  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest(".has-info");
    if (!target) return;
    document.querySelectorAll(".has-info.open").forEach(t => {
      if (t !== target) t.classList.remove("open");
    });
  });
}

/* ---------- Snippets manifest: add a keyword set + content file to
   public/data/snippets/manifest.json and any matching tag/chip/cert row
   anywhere on the site automatically picks it up — no code changes. ---------- */
async function loadSnippets() {
  const manifest = await getJSON("snippets/manifest");
  return Promise.all(manifest.map(async (entry) => ({
    keywords: entry.keywords,
    content: await getJSON(`snippets/${entry.file}`),
  })));
}

function buildSnippetPopupBody(content) {
  const body = el("div", {}, [el("p", { class: "info-title" }, content.title)]);
  (content.lines || []).forEach(line => {
    const value = line.url
      ? el("a", { class: "v", href: line.url, target: "_blank", rel: "noopener" }, line.value || "")
      : el("span", { class: "v" }, line.value || "");
    body.appendChild(el("div", { class: "info-line" }, [
      el("span", { class: "k" }, line.label),
      value,
    ]));
  });
  if (content.note) body.appendChild(el("p", {}, content.note));
  if (content.url) body.appendChild(el("a", { class: "info-line-link", href: content.url, target: "_blank", rel: "noopener" }, content.linkText || "Learn more ↗"));
  return body;
}

function autoLinkSnippets(snippets) {
  if (!snippets || !snippets.length) return;
  document.querySelectorAll(".chip, .tag, .compact-row").forEach(node => {
    if (node.classList.contains("has-info")) return;
    const text = node.textContent.toLowerCase();
    const snippet = snippets.find(s => s.keywords.some(k => text.includes(k.toLowerCase())));
    if (!snippet) return;
    attachSnippetInfo(node, buildSnippetPopupBody(snippet.content));
  });
}

/* ---------- Skills ---------- */
function renderSkills(items) {
  const grid = document.getElementById("skills-grid");
  grid.append(...items.map(s => {
    const card = el("div", { class: "skill-card reveal" });
    applyBlockBadges(card, s);
    card.append(
      el("h3", {}, s.category),
      el("p", {}, s.description),
      el("div", { class: "chip-row" }, s.items.map(i => {
        const isObj = typeof i === "object" && i !== null;
        const chip = el("span", { class: "chip" }, isObj ? i.name : i);
        if (isObj && i.info) {
          attachSnippetInfo(chip, el("p", {}, i.info));
        }
        return chip;
      }))
    );
    return card;
  }));
}

/* ---------- Certifications ---------- */
function renderCerts(data) {
  const list = document.getElementById("certs-grid");
  const mk = (item, sub) => el("div", { class: "compact-row" }, [
    el("span", { class: "who" }, item.name),
    el("span", { class: "when" }, sub || ""),
  ]);
  data.certifications.forEach(c => list.appendChild(mk(c, [c.issuer, c.date].filter(Boolean).join(" · "))));
  const divider = el("div", { class: "label", style: "margin-top:20px" }, "Awards");
  list.appendChild(divider);
  data.awards.forEach(a => list.appendChild(mk(a, [a.issuer, a.date].filter(Boolean).join(" · "))));
}

/* ---------- Interests ---------- */
function renderInterests(data) {
  const wrap = document.getElementById("interests-row");
  const mkGroup = (label, items) => el("div", {}, [
    el("div", { class: "label" }, label),
    el("div", { class: "chip-row" }, items.map(i => el("span", { class: "chip" }, i))),
  ]);
  wrap.append(mkGroup("Interests", data.interests), mkGroup("Community Service", data.service));
}

/* ---------- Education ---------- */
const CHEVRON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

function gradeColor(grade) {
  if (grade === "IP") return BADGES.status["in-progress"]?.color;
  return BADGES.grades?.[grade?.charAt(0)]?.color;
}

function buildCourseRow(c) {
  const gradeStyle = cssVars({ "--grade-color": gradeColor(c.grade) });
  const gradeTag = () => el("span", { class: "cgrade-tag", style: gradeStyle }, c.grade);
  const row = el("div", { class: "course-row" });
  const stack = el("div", { class: "face-stack" }, [
    el("div", { class: "face face-code" }, [
      el("span", { class: "ccode" }, c.code),
      gradeTag(),
    ]),
    el("div", { class: "face face-name" }, [
      el("span", { class: "ctitle" }, c.title),
      gradeTag(),
    ]),
  ]);
  row.appendChild(stack);
  row.addEventListener("click", () => {
    const next = row.getAttribute("data-flipped") !== "true";
    document.querySelectorAll(".course-row").forEach(r => flipCourseRow(r, next));
    courseFlipPausedUntil = Date.now() + COURSE_FLIP_CLICK_OVERRIDE_MS;
  });
  return row;
}

function flipCourseRow(row, force) {
  const flipped = row.getAttribute("data-flipped") === "true";
  const next = force != null ? force : !flipped;
  row.setAttribute("data-flipped", next ? "true" : "false");
}

const COURSE_FLIP_INTERVAL_MS = 5000;
const COURSE_FLIP_CLICK_OVERRIDE_MS = 20000;
let courseFlipPausedUntil = 0;
function initCourseAutoFlip() {
  setInterval(() => {
    if (Date.now() < courseFlipPausedUntil) return;
    document.querySelectorAll(".course-row").forEach(row => flipCourseRow(row));
  }, COURSE_FLIP_INTERVAL_MS);
}

function buildTermCard(term) {
  const badge = term.status ? buildStatusBadge(term.status) : null;
  const card = el("div", { class: `term-card${badge ? " has-status" : ""}` });
  if (badge) card.appendChild(badge);
  card.append(
    el("div", { class: "term-head" }, term.term),
    el("div", { class: "courses" }, term.courses.map(buildCourseRow))
  );
  return card;
}

function toggleDegreeDetail(button, detail) {
  const expanded = button.getAttribute("aria-expanded") === "true";
  if (expanded) {
    // Coming from maxHeight:"none" — pin to a concrete pixel value first so the
    // browser has something to animate from, then collapse on the next frame.
    detail.style.maxHeight = detail.scrollHeight + "px";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      detail.style.maxHeight = "0px";
    }));
    button.setAttribute("aria-expanded", "false");
  } else {
    detail.style.maxHeight = detail.scrollHeight + "px";
    button.setAttribute("aria-expanded", "true");
    detail.addEventListener("transitionend", function onEnd(e) {
      if (e.propertyName !== "max-height") return;
      detail.removeEventListener("transitionend", onEnd);
      // Lift the cap once open so late font loads, resizes, or content
      // changes can never clip — a one-time scrollHeight snapshot goes stale.
      if (button.getAttribute("aria-expanded") === "true") {
        detail.style.maxHeight = "none";
      }
    });
  }
  // Expanding/collapsing animates the card's height over 0.35s without ever
  // firing scroll or resize — the only two events layoutSpineLabels() is
  // otherwise driven by — so it needs to be nudged directly here, and kept
  // running for the duration of the transition rather than just once.
  pulseSpineLayout();
}

function buildDegreeCard(d, { withTranscript = true, assignId = true } = {}) {
  const node = el("div", {
    class: `degree reveal${d.compact ? " degree--compact" : ""}`,
    id: (assignId && d.id) ? `edu-${d.id}` : undefined,
  });
  applyBlockBadges(node, d, { borderMatchesStatus: true });

  if (d.compact) {
    // Minimal card: school, GPA, and dates — no title, location, or note.
    node.append(
      el("div", { class: "row-head" }, [
        el("p", { class: "school" }, d.school + (d.gpa ? ` · GPA ${d.gpa}` : "")),
        el("span", { class: "when" }, whenRange(d.start, d.end)),
      ]),
    );
  } else {
    node.append(
      el("div", { class: "row-head" }, [
        el("h3", {}, d.program),
        el("span", { class: "when" }, whenRange(d.start, d.end)),
      ]),
      el("p", { class: "school" }, `${d.school} — ${d.location}` + (d.gpa ? ` · GPA ${d.gpa}` : "")),
    );
    if (d.note) node.append(el("div", { class: "note" }, d.note));
  }

  if (withTranscript && d.timeline && d.timeline.length) {
    const detail = el("div", { class: "degree-detail" });
    const inner = el("div", { class: "degree-detail-inner", "data-many": d.timeline.length > 4 ? "true" : "false" });
    inner.append(...d.timeline.map(buildTermCard));
    detail.appendChild(inner);

    const toggle = el("button", { class: "expand-toggle", type: "button", "aria-expanded": "false" }, [
      el("span", {}, "View Transcript"),
      el("span", { class: "chevron", html: CHEVRON_SVG }),
    ]);
    toggle.addEventListener("click", () => toggleDegreeDetail(toggle, detail));

    node.append(toggle, detail);
  }
  return node;
}

function renderEducation(data) {
  const degrees = document.getElementById("degree-list");
  const primary = data.degrees.filter(d => !d.compact);
  const compact = data.degrees.filter(d => d.compact);

  degrees.append(...primary.map(d => buildDegreeCard(d)));

  if (compact.length) {
    const more = el("div", { class: "degree-more" });
    const inner = el("div", { class: "degree-more-inner" });
    inner.append(...compact.map(d => buildDegreeCard(d)));

    const toggle = el("button", { class: "expand-toggle degree-more-toggle", type: "button", "aria-expanded": "false" }, [
      el("span", {}, `Show ${compact.length} More`),
      el("span", { class: "chevron", html: CHEVRON_SVG }),
    ]);
    toggle.addEventListener("click", () => toggleDegreeDetail(toggle, inner));

    more.append(toggle, inner);
    degrees.appendChild(more);
  }
}

/* ---------- Hero highlights (2x2 quick-facts grid) ---------- */
function renderHighlights(highlights, educationData, experienceData) {
  const grid = document.getElementById("highlights-grid");
  if (!grid) return;

  const findRecord = (h) => {
    if (h.type === "education") return educationData.degrees.find(d => d.id === h.id);
    if (h.type === "experience") return experienceData.featured.find(x => x.id === h.id);
    return null;
  };

  highlights.forEach(h => {
    const record = findRecord(h);
    if (!record) return;

    const isEdu = h.type === "education";
    const title = isEdu ? record.program : record.title;
    const sub = isEdu ? record.school : record.org;
    const targetId = isEdu ? `edu-${record.id}` : `exp-${record.id}`;

    // The tile itself carries both tags (type color as a left-edge accent,
    // status as the same top-right badge used on the full cards). The hover
    // preview below is a clone of the real card with its own copies of those
    // tags stripped — the popup should read as bare content, not doubled UI.
    const typeInfo = record.type ? BADGES.types[record.type] : null;
    const statusKey = resolveStatus(record);
    const badge = statusKey ? buildStatusBadge(statusKey) : null;

    // Border-matches-badge is only for education's in-progress badges (same
    // scoping as the full degree cards) — experience's "Currently Employed"
    // stays off, so this only applies when isEdu is also true.
    const borderMatch = isEdu && badge;
    const tile = el("a", {
      class: `highlight-tile${typeInfo ? " has-type" : ""}${borderMatch ? " has-status status-border-match" : ""}`,
      href: `#${targetId}`,
      // --badge-color: buildStatusBadge only sets it on the badge span
      // itself, which doesn't flow upward to a border-color rule on the
      // tile — needs its own copy here, same reasoning as applyBlockBadges.
      style: cssVars({ "--type-color": typeInfo?.color, "--badge-color": borderMatch ? BADGES.status[statusKey]?.color : undefined }),
    });
    if (badge) tile.appendChild(badge);
    tile.addEventListener("click", () => {
      // Reveal the target synchronously so the native anchor-scroll doesn't
      // race the scroll-reveal fade-in — otherwise the card slides into place
      // mid-scroll and reads as the jump overshooting.
      document.getElementById(targetId)?.classList.add("in");
    });
    tile.append(
      el("div", { class: "highlight-eyebrow" }, h.type.toUpperCase()),
      el("div", { class: "highlight-title" }, title),
      el("div", { class: "highlight-sub" }, sub),
      el("div", { class: "highlight-when" }, whenRange(record.start, record.end)),
    );
    // Same spine-tab element and look as the full cards (sizing comes from
    // the .highlight-tile ancestor selector in CSS, same pattern as compact
    // degree cards) so it reads as one consistent tag everywhere it appears.
    if (typeInfo) tile.appendChild(buildTypeTab(typeInfo.label).tab);

    const preview = el("div", { class: "highlight-preview" });
    const previewCard = isEdu
      ? buildDegreeCard(record, { withTranscript: false, assignId: false })
      : experienceCard(record, { assignId: false });
    previewCard.classList.remove("reveal", "has-type", "has-status");
    previewCard.querySelectorAll(".type-tab, .status-badge").forEach(n => n.remove());
    preview.appendChild(previewCard);
    tile.appendChild(preview);

    grid.appendChild(tile);
  });
}

/* ---------- Spine-tab scroll-follow ----------
   The colored .type-tab band always spans its card's full height, but the
   vertical text inside it (.type-tab-label) tracks whatever portion of that
   band is actually on-screen: centered within the visible slice while the
   slice is tall enough to hold it, otherwise anchored — with a bit of
   padding — toward whichever edge is still mostly in view, so it clips off
   in the direction the card continues off-screen rather than trying (and
   failing) to center in a space too short for it. */
const SPINE_LABEL_PADDING = 10;
let spineTabs = [];
let spineTopbar = null;

function layoutSpineLabels() {
  const vh = window.innerHeight;
  // The sticky topbar visually covers whatever scrolls underneath it, so
  // the true top of the visible area is its bottom edge, not y:0 — unless
  // the topbar itself isn't actually on-screen (its own bottom at or above
  // 0), in which case there's nothing covering the true viewport top.
  const topbarRect = spineTopbar ? spineTopbar.getBoundingClientRect() : null;
  const viewportTop = topbarRect && topbarRect.bottom > 0 ? topbarRect.bottom : 0;

  spineTabs.forEach(({ tab, label, text }) => {
    const r = tab.getBoundingClientRect();
    const visibleTop = Math.max(r.top, viewportTop);
    const visibleBottom = Math.min(r.bottom, vh);
    const visibleHeight = visibleBottom - visibleTop;
    if (visibleHeight <= 0) return; // fully off-screen (or under the topbar) — leave as-is

    // .text is rotated via transform, so its own getBoundingClientRect
    // already reflects the swapped, post-rotation footprint — .label (the
    // plain, unrotated box JS actually positions) needs an explicit height
    // to match, since a transform never affects layout/auto-sizing.
    const naturalHeight = text.getBoundingClientRect().height;
    const localVisibleTop = visibleTop - r.top;
    const localVisibleBottom = visibleBottom - r.top;

    // True centering only once there's enough slack for a full padding's
    // worth of margin on BOTH sides. Switching at visibleHeight >= naturalHeight
    // (i.e. the instant it merely fits) meant the centered margin shrank to
    // 0 right as the anchored branch — which starts at a full padding — took
    // over, so the label would touch the edge for a moment before clipping
    // ever began. Anchoring earlier (while there's still room to spare)
    // keeps that padding guaranteed the whole time, clipping or not.
    let top;
    if (visibleHeight - naturalHeight >= 2 * SPINE_LABEL_PADDING) {
      top = localVisibleTop + (visibleHeight - naturalHeight) / 2;
    } else if (r.top < viewportTop) {
      // Only the card's lower portion is on-screen — hug the visible
      // bottom edge, clipping upward toward the rest of the card.
      top = localVisibleBottom - SPINE_LABEL_PADDING - naturalHeight;
    } else {
      // Only the card's upper portion is on-screen — hug the visible
      // top edge, clipping downward toward the rest of the card.
      top = localVisibleTop + SPINE_LABEL_PADDING;
    }
    label.style.height = `${naturalHeight}px`;
    label.style.top = `${Math.max(0, Math.min(top, r.height - naturalHeight))}px`;
  });
}

let spineLayoutQueued = false;
function scheduleSpineLayout() {
  if (spineLayoutQueued) return;
  spineLayoutQueued = true;
  requestAnimationFrame(() => {
    spineLayoutQueued = false;
    layoutSpineLabels();
  });
}

// Re-runs layoutSpineLabels() every frame for the length of a max-height
// transition (transcript / "show more" toggles), since those resize a card
// without ever firing scroll or resize.
function pulseSpineLayout(durationMs = 450) {
  const start = performance.now();
  function tick(now) {
    layoutSpineLabels();
    if (now - start < durationMs) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function initSpineLabels() {
  spineTopbar = document.querySelector(".topbar");
  spineTabs = [...document.querySelectorAll(".type-tab")]
    .map(tab => ({ tab, label: tab.querySelector(".type-tab-label"), text: tab.querySelector(".type-tab-label-text") }))
    .filter(t => t.label && t.text);
  if (!spineTabs.length) return;
  layoutSpineLabels();
  window.addEventListener("scroll", scheduleSpineLayout, { passive: true });
  window.addEventListener("resize", scheduleSpineLayout);
}

/* ---------- Reveal-on-scroll ---------- */
function initReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || targets.length === 0) {
    targets.forEach(t => t.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.01, rootMargin: "0px 0px 120px 0px" });
  targets.forEach(t => io.observe(t));
}

/* ---------- Active nav on scroll ---------- */
function initNavSpy() {
  const links = [...document.querySelectorAll(".topbar nav a")];
  const sections = links
    .map(l => document.querySelector(l.getAttribute("href")))
    .filter(Boolean);
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = "#" + entry.target.id;
      const link = links.find(l => l.getAttribute("href") === id);
      if (!link) return;
      if (entry.isIntersecting) {
        links.forEach(l => l.removeAttribute("aria-current"));
        link.setAttribute("aria-current", "true");
      }
    });
  }, { threshold: 0.5 });
  sections.forEach(s => io.observe(s));
}

async function boot() {
  try {
    const [profile, experience, projects, education, skills, certs, interests, highlights, snippets, badgeTypes] = await Promise.all([
      getJSON("profile"), getJSON("experience"), getJSON("projects"),
      getJSON("education"), getJSON("skills"), getJSON("certifications"), getJSON("interests"),
      getJSON("highlights"), loadSnippets(), getJSON("badge-types"),
    ]);
    BADGES = badgeTypes;
    renderProfile(profile);
    renderExperience(experience);
    renderProjects(projects);
    renderEducation(education);
    renderSkills(skills);
    renderCerts(certs);
    renderInterests(interests);
    // Auto-link before building highlight previews, so cloned cards inside
    // the hover popover never get their own nested info-dot — a popup
    // nested inside another hover-only popover is an awkward, hard-to-use
    // interaction (moving toward it closes the outer one).
    autoLinkSnippets(snippets);
    renderHighlights(highlights, education, experience);
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML("beforeend",
      `<div style="position:fixed;bottom:16px;left:16px;background:#2a1414;border:1px solid #663;color:#fbb;padding:10px 14px;font-family:monospace;font-size:12px;z-index:999">Content failed to load: ${err.message}</div>`);
  } finally {
    initReveal();
    initNavSpy();
    initCourseAutoFlip();
    initSnippetHoverClose();
    initSpineLabels();
    document.getElementById("year").textContent = new Date().getFullYear();
  }
}

document.addEventListener("DOMContentLoaded", boot);
