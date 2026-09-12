// /public/js/tagsConverter.js
(() => {
  const TPL_DIR = '/public/html/tags_content';
  const DEFAULTS = {
    TEXT_COLOR: 'text-blue-100',
    BOX_COLOR: 'analog-grey',
    // No default SECTION_FILE; can inherit from earlier sections
  };

  const LOG_NS = '[tagsConverter]';
  const replaceAll = (str, map) =>
    Object.keys(map).reduce((s, k) => s.split(k).join(map[k]), String(str));

  const stripPublicPrefix = (p) =>
    p && p.startsWith('/public/') ? p.replace(/^\/public\//, '/') : p;

  async function fetchTextWithFallback(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        console.info(`${LOG_NS} loaded: ${url}`);
        return await res.text();
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (url.startsWith('/public/')) {
        const fb = stripPublicPrefix(url);
        const res2 = await fetch(fb, { cache: 'no-store' });
        if (res2.ok) {
          console.info(`${LOG_NS} loaded (fallback): ${fb}`);
          return await res2.text();
        }
        console.error(`${LOG_NS} failed: ${url} and fallback ${fb}`);
        throw err;
      }
      console.error(`${LOG_NS} failed: ${url}`);
      throw err;
    }
  }

  // --- Parser ---
  // #  Title
  // ## Subtitle
  // ?  KEY VALUE
  // *  Item text
  function parseData(text) {
    const lines = text.split(/\r?\n/);
    const sections = [];

    let currentSection = null;
    let currentConfig = { ...DEFAULTS }; // carries forward (inheritance)
    // Allow configurators before first section
    let preSectionConfig = {};

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      if (line.startsWith('# ')) {
        // finalize previous section (nothing special here)
        currentSection = {
          title: line.slice(2).trim(),
          subtitle: '',
          items: [],
          cfg: {
            // snapshot current known values; SECTION_FILE may be undefined here (we'll fix up later via inheritance)
            SECTION_FILE: currentConfig.SECTION_FILE ?? preSectionConfig.SECTION_FILE ?? null,
          },
        };
        sections.push(currentSection);
        continue;
      }

      if (line.startsWith('## ')) {
        if (!currentSection) {
          // Create an implicit section; SECTION_FILE may be filled later by inheritance
          currentSection = {
            title: 'Tags',
            subtitle: '',
            items: [],
            cfg: { SECTION_FILE: currentConfig.SECTION_FILE ?? preSectionConfig.SECTION_FILE ?? null },
          };
          sections.push(currentSection);
        }
        currentSection.subtitle = line.slice(3).trim();
        continue;
      }

      if (line.startsWith('? ')) {
        const withoutQ = line.slice(2).trim();
        const i = withoutQ.indexOf(' ');
        if (i === -1) continue;
        const key = withoutQ.slice(0, i).trim().toUpperCase();
        const value = withoutQ.slice(i + 1).trim();

        if (key === 'TEXT_COLOR' || key === 'BOX_COLOR') {
          currentConfig[key] = value;
        } else if (key === 'SECTION_FILE') {
          // Set for current section if inside one; otherwise stage for first section
          if (currentSection) {
            currentSection.cfg.SECTION_FILE = value;
          } else {
            preSectionConfig.SECTION_FILE = value;
          }
          // Also update the rolling config so subsequent sections inherit
          currentConfig.SECTION_FILE = value;
        }
        continue;
      }

      if (line.startsWith('* ')) {
        if (!currentSection) {
          // Implicit section if items arrive first
          currentSection = {
            title: 'Tags',
            subtitle: '',
            items: [],
            cfg: { SECTION_FILE: currentConfig.SECTION_FILE ?? preSectionConfig.SECTION_FILE ?? null },
          };
          sections.push(currentSection);
        }
        currentSection.items.push({
          name: line.slice(2).trim(),
          TEXT_COLOR: currentConfig.TEXT_COLOR || DEFAULTS.TEXT_COLOR,
          BOX_COLOR: currentConfig.BOX_COLOR || DEFAULTS.BOX_COLOR,
        });
        continue;
      }
    }

    // Inheritance pass: carry forward the last known SECTION_FILE
    let lastSectionFile = preSectionConfig.SECTION_FILE ?? currentConfig.SECTION_FILE ?? null;
    for (const s of sections) {
      if (s.cfg.SECTION_FILE) {
        lastSectionFile = s.cfg.SECTION_FILE; // update inheritance anchor
      } else if (lastSectionFile) {
        s.cfg.SECTION_FILE = lastSectionFile; // inherit from earlier section
      } else {
        // No SECTION_FILE has ever been defined yet → error on this section
        throw new Error(
          `SECTION_FILE not defined for section "${s.title}". Add "? SECTION_FILE file.html" before or inside this section.`
        );
      }
    }

    return sections;
  }

  // --- Renderer ---
  async function renderSectionsHTML(sections) {
    const blockTpl = await fetchTextWithFallback(`${TPL_DIR}/block.html`);
    const sectionTplCache = new Map();

    const chunks = [];
    for (const section of sections) {
      const sectionUrl = `${TPL_DIR}/${section.cfg.SECTION_FILE}`;

      let sectionTpl = sectionTplCache.get(sectionUrl);
      if (!sectionTpl) {
        sectionTpl = await fetchTextWithFallback(sectionUrl);
        sectionTplCache.set(sectionUrl, sectionTpl);
      }

      const blocks = section.items.map(item =>
        replaceAll(blockTpl, {
          '[BOX_COLOR]': item.BOX_COLOR,
          '[TEXT_COLOR]': item.TEXT_COLOR,
          '[TEXT]': item.name,
        })
      );

      const hasSubtitle = !!(section.subtitle && section.subtitle.length);

      chunks.push(
        replaceAll(sectionTpl, {
          '[TITLE]': section.title || '',
          '[SUBTITLE]': section.subtitle || '',
          '[SUBTITLE_COMMENT_START]': hasSubtitle ? '' : '<!--',
          '[SUBTITLE_COMMENT_END]': hasSubtitle ? '' : '-->',
          '[CONTENT]': blocks.join('\n'),
        })
      );
    }
    return chunks.join('\n');
  }

  async function runTagsConverter(node, file) {
    if (!node) throw new Error('runTagsConverter: missing target node');
    if (!file) throw new Error('runTagsConverter: missing data file path');

    try {
      const dataText = await fetchTextWithFallback(file);
      const sections = parseData(dataText);
      const html = await renderSectionsHTML(sections);
      node.innerHTML = html;
    } catch (err) {
      node.textContent = `[tagsConverter] ${err?.message || String(err)}`;
    }
  }

  window.runTagsConverter = runTagsConverter;
})();


(() => {
  const s = document.currentScript;
  const file = s.getAttribute("data-file");
  if (!file || typeof runTagsConverter !== "function") return;
  const div = document.createElement("div");
  s.parentNode.insertBefore(div, s.nextSibling);
  runTagsConverter(div, file);
})();