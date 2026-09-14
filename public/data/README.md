# public/data — guide for future edits

This site has no build step. `index.html` loads `public/js/main.js`, which fetches every JSON file in this folder at runtime (`getJSON()`, with `cache: "no-store"`) and renders it into the DOM with a small `el(tag, attrs, children)` helper.

**Routine content changes only need JSON edits — no code changes.** Everything below documents the data schema, every interactive feature the site has, and the small number of generic systems built on top of the data — so you know what's already possible before writing new code.

## Read this before adding any content

The user has said this explicitly, more than once: **only pull content from the LinkedIn export / resources the user already provided, and what's already on the site.** Do not invent or add other personal projects that may exist in the user's other repos (REngine, Until the Stars Go Out, Subway Designer, etc.) — they are deliberately excluded from this portfolio. If asked to add something and you're not sure it came from the user's own LinkedIn/resume data, ask rather than assume.

## After editing main.js or style.css (not JSON)

Bump the `?v=N` query param on the `<link>`/`<script>` tags in `index.html`. JSON fetches already bypass caching on their own; the JS/CSS files don't, and this dev environment's preview has shown genuinely severe origin-level caching — see "Known dev-environment gotchas" at the bottom before assuming a change didn't work.

## File-by-file reference

**profile.json** — hero/contact copy.
`pageTitle` (browser tab title), `name`, `shortName`, `title`, `shortTitle`, `kicker` (hero eyebrow line), `heroHeadline` (`{plain, accent}` — `accent` renders in the cyan accent color), `tagline`, `location`, `email`, `phone`, `status` (hero dot + title-block "Status" cell), `contactHeading`, `contactPitch`, `footerTagline`, `links[]`.

**education.json** — `degrees[]`.
Fields: `id`, `type`, `status` (see Badge system below), `compact` (bool — minimal school/GPA/dates-only card, used for the less-important entries), `school`, `location`, `program`, `start`, `end`, `gpa`, `note`, `timeline[]` (`{term, status, courses[{code, title, grade}]}`).
A degree with a timeline gets a "View Transcript" toggle. Each term becomes a card whose course rows auto-flip between code and title every 5 seconds; tapping a row flips all of them immediately and pauses auto-flip for 20 seconds. Grade tags are color-coded from `badge-types.json`'s `grades` map by first letter (A/B/C); `"IP"` reuses the `status["in-progress"]` color instead. `compact` degrees are hidden behind a "Show More" toggle on mobile only — desktop always shows them.

**experience.json** — `{featured[], additional[]}`.
`featured[]` are full cards: `id`, `type`, `status`, `title`, `org`, `location`, `start`, `end`, `tags[]`, `bullets[]`. `additional[]` are compact rows with no tags/badges (just title/org/dates). "Currently Employed" status is **auto-derived** from `end === "Present"` — don't set `status` for that case, just use `"Present"` as the end date (an explicit `status` still overrides this if you ever need to).

**projects.json** — array of project entries.
Fields: `title`, `course`, `location`, `start`, `end`, `tags[]`, `summary`, `bullets[]`, optional `type`, `status`, `video`. `video` is `{embedUrl, linkUrl, linkText}` and renders a "View Video" toggle with an embedded iframe (used for the LIDAR project's LinkedIn video post). `type`/`status` use the same generic badge system as every other card type — not currently used on any project, but fully wired and ready.

**skills.json** — array of `{category, description, items[]}`.
Each entry in `items` is either a plain string or `{name, info}` — `info` gives that one specific chip its own snippet popup, independent of the manifest auto-link system described below.

**certifications.json** — `{certifications[], awards[]}`.
Each entry: `{name, issuer, date}`.

**interests.json** — `{interests[], service[]}`.
Plain string chip lists.

**highlights.json** — array of `{type, id}`.
`type` is `"education"` or `"experience"`; `id` must match an `id` in `education.json`, or an item in `experience.json`'s `featured[]`. Controls which items appear as the 2×2 hero mini-tiles.

**badge-types.json** — the color/label registry for the whole badge system.
`types{}` (left-edge spine tags), `status{}` (top-right corner badges), `grades{}` (transcript grade-tag colors, keyed by first letter).

**ui-labels.json** — small interface-chrome strings.
Button/section labels that aren't really "about Rex" but shouldn't be hardcoded in JS either: `emailMe`, `contact`, `viewTranscript`, `showMore` (contains a literal `{n}` placeholder, replaced with the actual count at render time), `viewVideo`, `additionalExperience`, `certifications`, `awards`, `interests`, `communityService`.

**snippets/manifest.json + snippets/\*.json** — the auto-link "info popup" system.
`manifest.json` is `[{keywords[], file}]`. Any chip, tag, or compact-row whose visible text contains one of `keywords` (case-insensitive substring match) automatically gets a hover/tap popup built from `snippets/<file>.json`. To add a new one: create `snippets/whatever.json`, then add one `{keywords, file}` entry to `manifest.json` — no code changes needed.
Snippet file schema: `{title, lines: [{label, value, url}], note, url, linkText}` — everything except `title` and `lines` is optional. A line's own `url` makes just that value an underlined clickable link (e.g. a certification's verification link). The top-level `url`/`linkText` instead adds a single "Learn more ↗"-style link at the bottom of the whole popup.

## Every interactive feature, for reference

- **Course-row auto-flip** — course code and title swap every 5s; tapping a row flips every row immediately and pauses auto-flip for 20s (see education.json above).
- **Reveal-on-scroll** — cards fade/slide in the first time they scroll into view (`.reveal` + IntersectionObserver in `initReveal()`).
- **Active-nav highlighting** — the topbar nav link for whichever section is in view gets `aria-current` (`initNavSpy()`).
- **Topbar auto-hide** — the sticky topbar slides up out of view on scroll-down and slides back on scroll-up, on both mobile and desktop (`initTopbarAutoHide()`). It never hides until you've scrolled past its own height, so it doesn't flicker at the very top of the page.
- **Snippet info-popups** — hover (desktop) or tap (any device) a `.has-info` element to show its popup. Tapping again, or tapping anywhere else, closes it. On desktop, hovering a *different* snippet trigger closes one left open by a click (`initSnippetHoverClose()`). A popup that would run off the right edge of the viewport shifts itself left just far enough to stay fully on-screen (`positionSnippetPopup()`), and popups are kept below the sticky topbar's z-index so they can never render over the nav. The cursor is only a pointer over the trigger itself and over actual links inside an open popup — not the whole popup body.
- **Hero mini-tile hover-preview** — hovering a hero tile (desktop) shows a floating clone of the full card. Type/status tags are deliberately stripped from this clone so it reads as plain content, not doubled-up UI — the tags/colors still show on the tile itself.
- **Mobile "Show More"** — compact degree cards (see `compact` above) collapse behind a toggle on mobile only; desktop always shows them.
- **Dark-theme declaration** — `<meta name="color-scheme">`, `<meta name="supported-color-schemes">`, `<meta name="theme-color">`, and CSS `color-scheme: dark` all tell mobile OS/browser "force dark" converters that the page is already dark and shouldn't be re-inverted.

## Generic systems (context for extending the code, not needed for content edits)

**Badge system** — any card (degree/experience/project/skill, and the hero mini-tiles) can carry a left-edge vertical "spine" label (`item.type` → `badge-types.json` `types`) and/or a top-right corner badge (`item.status` → `badge-types.json` `status`). Both are opt-in per data item — add the field, it appears, no code changes required. `borderMatchesStatus` is a JS-side option (not a data field) passed to `applyBlockBadges()` that makes a card's own border pick up its status badge's color and dashed style; it's currently enabled only for education's in-progress degrees and their hero tiles, deliberately *not* for experience's "Currently Employed" — that was an explicit user choice, not an oversight, if you're ever asked to extend it elsewhere.

**Spine-tab scroll-follow** (`layoutSpineLabels()` in main.js) — the colored type-tab band always spans its card's full height, but the vertical text inside it tracks whichever part of the card is actually on-screen: centered while there's room for full padding on both sides, otherwise anchored to whichever edge is visible (accounting for the sticky topbar covering the true top of the viewport), letting the rest clip off toward the direction the card continues off-screen. It also re-runs on the transcript/"show more" toggle transitions, since those resize a card without ever firing scroll or resize.

## Known dev-environment gotchas

These are about the Claude Code browser-preview tool used to test this site during development, not the site itself — worth knowing if you're verifying changes in that same tool:

- **Origin-level caching.** CSS/JS edits have repeatedly failed to show up even after a full navigate, including in a brand-new tab. Don't assume your code is wrong just because a change doesn't appear — first confirm with a direct `fetch(url, {cache:'no-store'})` whether the *server* is serving fresh content. If the server is fresh but the tab still isn't, the only fix that's reliably worked is changing the dev server's port (a genuinely new origin) in `.claude/launch.json`.
- **`window.innerWidth` is unreliable** in that tool — it has reported stale or simply wrong values. Use `document.documentElement.clientWidth` instead.
- **`read_console_messages` can return stale errors** from a previous page load that never got cleared from its buffer. Cross-check anything suspicious against direct DOM/behavior inspection before trusting it.
- **`min-width: 0` matters a lot here.** A grid/flex item without it lets its content's min-content size override an intended fixed or percentage width. This has caused real, reproducible bugs more than once on this site (`.degree`, `.card`, `.term-card`) — it's the first thing to check for any "card is wider than it should be" or "width changes when content changes" report.
