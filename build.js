#!/usr/bin/env node
/*
 * Family Tech Helper — build script.
 *
 * Local-first static site generator: renders every Markdown document in docs/
 * into plain HTML in site/. Zero dependencies, no network access, no tracking.
 *
 * Usage:
 *   node build.js            # build into ./site
 *   node build.js --out DIR  # build into DIR (used by the tests)
 */
const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "docs");
const DEFAULT_OUT = path.join(__dirname, "site");

/* ---------------------------------------------------------------- helpers */

function walk(dir, base) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else if (entry.name.endsWith(".md")) out.push(path.relative(base, full));
  }
  return out.sort();
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[`*_[\]()]/g, "")
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

function stripInline(s) {
  return s
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .trim();
}

/* --------------------------------------------------- markdown (subset) */

const INLINE_CODE_TOKEN = "\u0000";

/** Inline markdown: code spans are protected first, then bold/italic/links. */
function inline(src, ctx) {
  const codes = [];
  let s = src.replace(/`([^`]+)`/g, (_m, code) => {
    codes.push('<code>' + code + '</code>');
    return INLINE_CODE_TOKEN + (codes.length - 1) + INLINE_CODE_TOKEN;
  });

  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");

  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const mapped = ctx.mapLink(url);
    if (!mapped) return text;
    return '<a href="' + mapped + '">' + text + '</a>';
  });

  return s.replace(
    new RegExp(INLINE_CODE_TOKEN + "(\\d+)" + INLINE_CODE_TOKEN, "g"),
    (_m, i) => codes[Number(i)]
  );
}

function makeSlugger() {
  const seen = {};
  return function slug(text) {
    let base = slugify(text) || "section";
    if (seen[base]) base = base + "-" + ++seen[base];
    else seen[base] = 1;
    return base;
  };
}

/** Block-level markdown. Supports: headings, paragraphs, lists (nested,
 *  with - [ ] checkboxes), fenced code, blockquotes, tables, hr. All input
 *  is HTML-escaped first; nested md() calls (blockquotes) set escape=false
 *  because their content was already escaped. */
function md(src, ctx, options = {}) {
  if (options.escape !== false) {
    src = escapeHtml(src);
    // restore the blockquote open-marker so it survives escaping unharmed
    src = src.replace(/^(?:[ \t]*&gt;[ \t]?)(.*)$/gm, ">$1");
  }
  const lines = src.split("\n");
  const out = [];
  const slug = makeSlugger();
  let i = 0;

  const para = [];
  const flush = () => {
    if (para.length) {
      out.push("<p>" + inline(para.join(" "), ctx) + "</p>");
      para.length = 0;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { flush(); i++; continue; }

    // fenced code
    if (/^```/.test(line)) {
      flush();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; // closing fence (or end of input)
      out.push("<pre><code>" + buf.join("\n") + "</code></pre>");
      continue;
    }

    // heading
    let m = line.match(/^(#{1,4})\s+(.*)$/);
    if (m) {
      flush();
      const level = m[1].length;
      const text = inline(m[2], ctx);
      out.push("<h" + level + ' id="' + slug(stripInline(m[2])) + '">' + text + "</h" + level + ">");
      i++;
      continue;
    }

    // hr
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { flush(); out.push("<hr>"); i++; continue; }

    // table
    if (line.includes("|") && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1] || "")) {
      flush();
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && !/^\s*$/.test(lines[i])) {
        rows.push(lines[i]);
        i++;
      }
      const cells = (r) => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(_t => _t.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      const t = ["<table><thead><tr>"];
      for (const h of head) t.push("<th>" + inline(h, ctx) + "</th>");
      t.push("</tr></thead><tbody>");
      for (const row of body) {
        t.push("<tr>");
        for (const c of row) t.push("<td>" + inline(c, ctx) + "</td>");
        t.push("</tr>");
      }
      t.push("</tbody></table>");
      out.push(t.join(""));
      continue;
    }

    // blockquote
    if (/^\s*>/.test(line)) {
      flush();
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push("<blockquote>" + md(buf.join("\n").trim(), ctx, { escape: false }) + "</blockquote>");
      continue;
    }

    // list (supports two indent levels and - [ ] checkboxes)
    m = line.match(/^(?<indent>\s*)(?<bullet>[-*]|\d{1,2}\.)\s+(?<rest>.*)$/);
    if (m) {
      flush();
      const ordered = /\d/.test(m.groups.bullet);
      const tag = ordered ? "ol" : "ul";
      const items = [];
      while (i < lines.length) {
        const lm = lines[i].match(/^(?<indent>\s*)(?<bullet>[-*]|\d{1,2}\.)\s+(?<rest>.*)$/);
        if (!lm) break;
        const depth = Math.min(2, Math.floor(lm.groups.indent.length / 2));
        items.push({ depth, text: lm.groups.rest });
        i++;
        // continuation lines (indented, non-list) ride along with the item
        while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*([-*]|\d{1,2}\.)\s+/.test(lines[i])) {
          items[items.length - 1].depth = 0;
          items[items.length - 1].text += " " + lines[i].trim();
          i++;
        }
      }
      const emit = (from, depth) => {
        const parts = ["<" + tag + ">"];
        let j = from;
        while (j < items.length && items[j].depth >= depth) {
          if (items[j].depth === depth) {
            let text = items[j].text;
            const task = text.match(/^\[( |x|X)\]\s+(.*)$/);
            if (task) {
              parts.push('<li class="task"><input type="checkbox"' + (task[1] === "x" ? " checked" : "") + "> " + inline(task[2], ctx));
            } else {
              parts.push("<li>" + inline(text, ctx));
            }
            // nested list
            if (j + 1 < items.length && items[j + 1].depth > depth) {
              const sub = [];
              let k = j + 1;
              while (k < items.length && items[k].depth > depth) k++;
              sub.push(emit(j + 1, depth + 1));
              parts.push(sub.join(""));
              j = k;
            } else {
              j++;
            }
            parts.push("</li>");
          } else {
            j++; // safety (shouldn't happen)
          }
        }
        parts.push("</" + tag + ">");
        return parts.join("");
      };
      out.push(emit(0, 0));
      continue;
    }

    // paragraph
    para.push(line.trim());
    i++;
  }
  flush();
  return out.join("\n");
}

/* ----------------------------------------------------------------- pages */

function pageHref(sourceRel, currentDir) {
  ensureDocMap();
  const stripped = sourceRel.replace(/\.md$/, "").replace(/#.*$/, "");
  const anchor = (sourceRel.match(/#(.*)$/) || [])[1];
  const abs = path.posix.normalize(path.posix.join(currentDir ? path.posix.dirname(currentDir) : "", stripped));
  const doc = DOCS_BY_REL["docs/" + abs + ".md"];
  if (!doc) return null;
  return doc.href + (anchor ? "#" + anchor : "");
}

function buildLinkContext(rel) {
  return {
    mapLink(url) {
      url = url.trim();
      if (/^(https?:)?\/\//i.test(url) || url.startsWith("mailto:")) return url;
      if (url.startsWith("#")) return url;
      const target = pageHref(url, rel);
      if (!target) return url; // let the link test flag it
      return target;
    },
  };
}

function metaFor(rel) {
  const src = fs.readFileSync(path.join(DOCS_DIR, rel), "utf8");
  const lines = src.split("\n");
  let title = rel;
  let desc = "";
  for (const line of lines) {
    if (/^#\s+/.test(line)) { title = line.replace(/^#\s+/, "").trim(); break; }
  }
  let seenTitle = false;
  for (const line of lines) {
    if (/^#\s+/.test(line)) { seenTitle = true; continue; }
    if (seenTitle && /^##?\s/.test(line)) break;
    if (seenTitle && /^\s*$/.test(line)) continue;
    if (seenTitle && !desc) { desc = stripInline(line).trim(); }
    if (seenTitle && desc) break;
  }
  if (desc.length > 160) desc = desc.slice(0, 157).replace(/\s+\S*$/, "") + "…";
  return { rel, title, desc };
}

const SITE_NAME = "The Family Tech Helper";

const TEMPLATE = (title, desc, body, nav) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${desc}">
<title>${title === SITE_NAME ? SITE_NAME : title + " — " + SITE_NAME}</title>
<link rel="stylesheet" href="${nav.root}style.css">
</head>
<body>
<header class="site">
  <div class="wrap">
    <a class="site-name" href="${nav.root}index.html">The Family Tech Helper</a>
    <span class="crumb">${nav.crumb}</span>
  </div>
</header>
<main class="wrap">
${body}
</main>
<footer class="site"><div class="wrap">
  The Family Tech Helper — a calm, un-sighing manual for being the person your family calls.<br>
  Built by <a href="https://dylanasdale.github.io">Asdale Dynamics, LLC</a>. Local-first: no accounts, no tracking, no network needed.
</div></footer>
</body>
</html>
`;

function renderIndex(pages) {
  const groups = [
    { label: "Start here", test: (p) => p.rel === "00-start-here.md" },
    { label: "The manual", test: (p) => /^[01]\d-/.test(p.rel) },
    { label: "Teach sheets (print and leave behind)", test: (p) => p.rel.startsWith("teach-sheets/") },
    { label: "Reference", test: (p) => p.rel === "08-glossary.md" || (!/^[01]\d-/.test(p.rel) && p.rel !== "00-start-here.md" && !p.rel.startsWith("teach-sheets/")) },
  ];

  const body = [
    `<section class="hero">
<h1>The Family Tech Helper</h1>
<p class="tagline">A calm, un-sighing manual for being the person your family calls — support-call triage, teaching without taking over, fixes you talk through, the wifi-phone-printer rescue order, passwords and backups on one visit, scam shields, and knowing when it's the ISP's problem or a pro's.</p>
<p><em>Everything on this site works offline. Nothing here asks for a login, a subscription, or your patience with a phone tree.</em></p>
</section>`,
  ];

  for (const g of groups) {
    const items = pages.filter(g.test);
    if (!items.length) continue;
    body.push(`<p class="section-label">${g.label}</p><div class="cards">`);
    for (const p of items) {
      body.push(
        `<a class="card" href="${p.href}"><div class="card-title">${p.title}</div><div class="card-desc">${p.desc}</div></a>`
      );
    }
    body.push(`</div>`);
  }

  body.push(`<footer class="site-note"></footer>`);
  return TEMPLATE(
    SITE_NAME,
    "A calm, un-sighing manual for being the person your family calls. Free, local-first, plain English.",
    body.join("\n"),
    { root: "", crumb: "Start here" }
  );
}

function renderPage(doc, pages) {
  const src = fs.readFileSync(path.join(DOCS_DIR, doc.rel), "utf8");
  const ctx = buildLinkContext(doc.rel);
  const inner = md(src, ctx);

  const idx = pages.indexOf(doc);
  const isChapter = /^[0-9]/.test(doc.rel);
  const isSheet = doc.rel.startsWith("teach-sheets/");
  const crumb = isChapter ? "The manual" : isSheet ? "Teach sheets" : doc.rel === "08-glossary.md" ? "Reference" : "Guide";
  let pager = "";
  if (isChapter || isSheet) {
    const sibs = pages.filter(isSheet ? (p) => p.rel.startsWith("teach-sheets/") : (p) => /^[0-9]/.test(p.rel) && p.rel !== "08-glossary.md");
    const li = sibs.indexOf(doc);
    const prev = sibs[li - 1];
    const next = sibs[li + 1];
    const a = (p, arrow) => (p ? `<a href="${p.href}">${arrow} ${p.title}</a>` : `<span></span>`);
    pager = `<div class="pager">${a(prev, "&larr;")}${a(next, "&rarr;")}</div>`;
  }

  const body = inner + pager;
  return TEMPLATE(doc.title, doc.desc || doc.title, body, { root: "", crumb });
}

/* ---------------------------------------------------------------- build */

const DOCS_BY_REL = {};
let docMapReady = false;
let docPages = [];

const relDocs = () => walk(DOCS_DIR, DOCS_DIR);

function ensureDocMap() {
  if (docMapReady) return docPages;
  const pages = relDocs().map(metaFor);
  for (const p of pages) {
    const base = path.basename(p.rel, ".md").replace(/^[0-9]+-/, "");
    p.slug = p.rel.startsWith("teach-sheets/") ? "ts-" + base : base;
    p.href = p.slug + ".html";
    DOCS_BY_REL["docs/" + p.rel] = p;
  }
  docPages = pages;
  docMapReady = true;
  return pages;
}

function buildAll({ outDir = DEFAULT_OUT, quiet = false } = {}) {
  const rels = relDocs();
  if (!rels.length) throw new Error("No markdown documents found in docs/");
  const pages = ensureDocMap();
  if (pages.length !== rels.length) throw new Error("doc map out of sync");

  for (const p of pages) {
    if (pages.some((q) => q !== p && q.slug === p.slug)) throw new Error("Duplicate slug: " + p.slug);
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, "assets", "style.css"), path.join(outDir, "style.css"));

  fs.writeFileSync(path.join(outDir, "index.html"), renderIndex(pages));
  for (const p of pages) {
    fs.writeFileSync(path.join(outDir, p.href), renderPage(p, pages));
  }

  if (!quiet) console.log("built " + (pages.length + 1) + " pages into " + path.relative(process.cwd(), outDir) + "/");
  return pages.concat([{ rel: "index.html", href: "index.html", slug: "index", title: "The Family Tech Helper", desc: "" }]);
}

module.exports = { buildAll, md, inline, slugify, stripInline, escapeHtml, relDocs, metaFor, pageHref, DEFAULT_OUT };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const outFlag = argv.indexOf("--out");
  buildAll({ outDir: outFlag >= 0 ? path.resolve(argv[outFlag + 1]) : DEFAULT_OUT });
}
