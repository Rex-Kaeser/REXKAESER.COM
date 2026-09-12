const DATA_DIR = "/public/data";

async function getJSON(name) {
  const res = await fetch(`${DATA_DIR}/${name}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${name}.json (${res.status})`);
  return res.json();
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
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
    `<b>${p.shortName}</b><span>&nbsp;/ ${p.drawingNo}</span>`;
  document.getElementById("topbar-rev").textContent = `${p.revision} · SCALE ${p.scale}`;

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
    ["Dwg No", p.drawingNo],
    ["Rev", p.revision],
  ];
  tb.append(...cells.map(([k, v]) =>
    el("div", { class: "cell" }, [el("span", { class: "k" }, k.toUpperCase()), el("span", { class: "v" }, v)])
  ));

  document.getElementById("contact-email").textContent = p.email;
  document.getElementById("contact-email").href = `mailto:${p.email}`;
  document.getElementById("contact-phone").textContent = p.phone;
}

/* ---------- Experience ---------- */
function experienceCard(item) {
  const card = el("article", { class: "card reveal" });
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
      el("p", { class: "code" }, p.code),
      el("p", { class: "summary" }, p.summary),
      el("ul", {}, p.bullets.map(b => el("li", {}, b))),
      el("div", { class: "tags" }, (p.tags || []).map(t => el("span", { class: "tag" }, t)))
    );
    return card;
  }));
}

/* ---------- Skills ---------- */
function renderSkills(items) {
  const grid = document.getElementById("skills-grid");
  grid.append(...items.map(s => {
    const card = el("div", { class: "skill-card reveal" });
    card.append(
      el("h3", {}, s.category),
      el("p", {}, s.description),
      el("div", { class: "chip-row" }, s.items.map(i => el("span", { class: "chip" }, i)))
    );
    return card;
  }));
}

/* ---------- Certifications ---------- */
function renderCerts(data) {
  const list = document.getElementById("certs-grid");
  const mk = (name, sub) => el("div", { class: "compact-row" }, [
    el("span", { class: "who" }, name),
    el("span", { class: "when" }, sub || ""),
  ]);
  data.certifications.forEach(c => list.appendChild(mk(c.name, [c.issuer, c.date].filter(Boolean).join(" · "))));
  const divider = el("div", { class: "label", style: "margin-top:20px" }, "Awards");
  list.appendChild(divider);
  data.awards.forEach(a => list.appendChild(mk(a.name, [a.issuer, a.date].filter(Boolean).join(" · "))));
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
    const flipped = row.getAttribute("data-flipped") === "true";
    row.setAttribute("data-flipped", flipped ? "false" : "true");
  });
  return row;
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

function renderEducation(data) {
  const degrees = document.getElementById("degree-list");
  degrees.append(...data.degrees.map(d => {
    const node = el("div", { class: "degree reveal" });
    node.append(
      el("div", { class: "row-head" }, [
        el("h3", {}, d.program),
        el("span", { class: "when" }, whenRange(d.start, d.end)),
      ]),
      el("p", { class: "school" }, `${d.school} — ${d.location}` + (d.gpa ? ` · GPA ${d.gpa}` : "")),
    );
    if (d.note) node.append(el("div", { class: "note" }, d.note));

    if (d.timeline && d.timeline.length) {
      const detail = el("div", { class: "degree-detail" });
      const inner = el("div", { class: "degree-detail-inner" });
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
  }));
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
    const [profile, experience, projects, education, skills, certs, interests] = await Promise.all([
      getJSON("profile"), getJSON("experience"), getJSON("projects"),
      getJSON("education"), getJSON("skills"), getJSON("certifications"), getJSON("interests"),
    ]);
    renderProfile(profile);
    renderExperience(experience);
    renderProjects(projects);
    renderEducation(education);
    renderSkills(skills);
    renderCerts(certs);
    renderInterests(interests);
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML("beforeend",
      `<div style="position:fixed;bottom:16px;left:16px;background:#2a1414;border:1px solid #663;color:#fbb;padding:10px 14px;font-family:monospace;font-size:12px;z-index:999">Content failed to load: ${err.message}</div>`);
  } finally {
    initReveal();
    initNavSpy();
    document.getElementById("year").textContent = new Date().getFullYear();
  }
}

document.addEventListener("DOMContentLoaded", boot);
