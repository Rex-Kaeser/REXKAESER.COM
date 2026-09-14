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

/* ---------- Profile / hero + topbar + title block ---------- */
function renderProfile(p) {
  document.title = `${p.shortName} — ${p.title}`;

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
function renderProjects(items) {
  const grid = document.getElementById("projects-grid");
  grid.append(...items.map(p => {
    const card = el("article", { class: "card reveal" });
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
    return card;
  }));
}

/* ---------- Info popup: hover/tap anywhere on the host element (a tag, chip,
   or certification row) to reveal a snippet. The dot is just a visual cue
   that more info exists — the whole element is the trigger. ---------- */
function attachSnippetInfo(hostEl, popupBodyEl) {
  hostEl.classList.add("has-info");
  hostEl.setAttribute("tabindex", "0");
  // For rows like .compact-row (a flex line with pre-existing space-between
  // children), anchor the dot+popup inside the leading label instead of as a
  // new flex sibling — hover/tap still applies to the whole row via .has-info.
  const anchor = hostEl.querySelector(".who") || hostEl;
  anchor.appendChild(el("span", { class: "info-dot", "aria-hidden": "true" }));
  anchor.appendChild(el("div", { class: "info-popup" }, [popupBodyEl]));
  hostEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !hostEl.classList.contains("open");
    document.querySelectorAll(".has-info.open").forEach(t => t !== hostEl && t.classList.remove("open"));
    hostEl.classList.toggle("open", willOpen);
  });
}
document.addEventListener("click", () => {
  document.querySelectorAll(".has-info.open").forEach(t => t.classList.remove("open"));
});

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
    body.appendChild(el("div", { class: "info-line" }, [
      el("span", { class: "k" }, line.label),
      el("span", { class: "v" }, line.value || ""),
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

function buildCourseRow(c) {
  const row = el("div", { class: "course-row" });
  const stack = el("div", { class: "face-stack" }, [
    el("div", { class: "face face-code" }, [
      el("span", { class: "ccode" }, c.code),
      el("span", { class: "cgrade-tag" }, c.grade),
    ]),
    el("div", { class: "face face-name" }, [
      el("span", { class: "ctitle" }, c.title),
      el("span", { class: "cgrade-tag" }, c.grade),
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
  const card = el("div", { class: `term-card ${term.status === "in-progress" ? "in-progress" : ""}` });
  card.append(
    el("div", { class: "term-head" }, [
      document.createTextNode(term.term),
      el("span", {}, term.status === "in-progress" ? "IN PROGRESS" : ""),
    ]),
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
}

function buildDegreeCard(d, { withTranscript = true, assignId = true } = {}) {
  const node = el("div", { class: "degree reveal", id: (assignId && d.id) ? `edu-${d.id}` : undefined });
  node.append(
    el("div", { class: "row-head" }, [
      el("h3", {}, d.program),
      el("span", { class: "when" }, whenRange(d.start, d.end)),
    ]),
    el("p", { class: "school" }, `${d.school} — ${d.location}` + (d.gpa ? ` · GPA ${d.gpa}` : "")),
  );
  if (d.note) node.append(el("div", { class: "note" }, d.note));

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
  degrees.append(...data.degrees.map(d => buildDegreeCard(d)));
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

    const tile = el("a", { class: "highlight-tile", href: `#${targetId}` });
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

    const preview = el("div", { class: "highlight-preview" });
    const previewCard = isEdu
      ? buildDegreeCard(record, { withTranscript: false, assignId: false })
      : experienceCard(record, { assignId: false });
    previewCard.classList.remove("reveal");
    preview.appendChild(previewCard);
    tile.appendChild(preview);

    grid.appendChild(tile);
  });
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
    const [profile, experience, projects, education, skills, certs, interests, highlights, snippets] = await Promise.all([
      getJSON("profile"), getJSON("experience"), getJSON("projects"),
      getJSON("education"), getJSON("skills"), getJSON("certifications"), getJSON("interests"),
      getJSON("highlights"), loadSnippets(),
    ]);
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
    document.getElementById("year").textContent = new Date().getFullYear();
  }
}

document.addEventListener("DOMContentLoaded", boot);
