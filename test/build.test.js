"use strict";
/*
 * Tests for the build itself: every doc becomes a page, the site is
 * deterministic, and markdown features used by the manual render correctly.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { buildAll, relDocs, md, inline, escapeHtml } = require("../build.js");
const { ctx, mapLink } = require("./helpers.js");

test("builds a page for every markdown doc, plus index and style", () => {
  const out = path.join(os.tmpdir(), "fth-build-" + Date.now());
  const pages = buildAll({ outDir: out, quiet: true });
  const built = fs.readdirSync(out).sort();
  assert.ok(built.includes("index.html"), "index.html exists");
  assert.ok(built.includes("style.css"), "style.css exists");
  for (const p of pages) {
    if (p.rel === "index.html") continue;
    assert.ok(built.includes(p.href), "built " + p.href);
    const html = fs.readFileSync(path.join(out, p.href), "utf8");
    assert.ok(html.includes("<h1"), p.href + " has an h1");
    assert.ok(html.includes("</html>"), p.href + " is a complete page");
  }
  assert.strictEqual(pages.length, relDocs().length + 1);
  fs.rmSync(out, { recursive: true, force: true });
});

test("build is deterministic: same input, same output bytes", () => {
  const a = path.join(os.tmpdir(), "fth-det-a");
  const b = path.join(os.tmpdir(), "fth-det-b");
  buildAll({ outDir: a, quiet: true });
  buildAll({ outDir: b, quiet: true });
  for (const f of fs.readdirSync(a)) {
    assert.strictEqual(
      fs.readFileSync(path.join(a, f), "utf8"),
      fs.readFileSync(path.join(b, f), "utf8"),
      "unstable output: " + f
    );
  }
  fs.rmSync(a, { recursive: true, force: true });
  fs.rmSync(b, { recursive: true, force: true });
});

test("checkbox lists render inputs, tasks keep their text", () => {
  const html = md("- [ ] water the plant\n- [x] feed the cat\n- plain bullet", ctx());
  assert.ok(html.includes('<li class="task"><input type="checkbox"> water the plant'));
  assert.ok(html.includes('<input type="checkbox" checked> feed the cat'));
  assert.ok(html.includes("<li>plain bullet</li>"));
});

test("headings get stable slug anchors", () => {
  const html = md("## The rescue order\n\n## The rescue order: wifi, phone, printer");
  assert.ok(html.includes('id="the-rescue-order"'));
  assert.ok(html.includes('id="the-rescue-order-wifi-phone-printer"'));
});

test("tables render with a header row", () => {
  const html = md("| Instead of | Say |\n| --- | --- |\n| obviously | (delete the word) |", ctx());
  assert.ok(html.includes("<th>Instead of</th>"));
  assert.ok(html.includes("<td>obviously</td>"));
});

test("blockquotes nest rendered markdown", () => {
  const html = md("> **hang up, then dial.**\n> That's it.", ctx());
  assert.ok(html.includes("<blockquote>"));
  assert.ok(html.includes("<strong>hang up, then dial.</strong>"));
});

test("fenced code escapes html and never embeds scripts", () => {
  const html = md("```\n<script>alert(1)</script>\n```");
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("raw html in prose is neutralized", () => {
  const html = md("hello <img src=x onerror=alert(1)> world");
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img"));
});

test("documents contain no raw opening angle brackets outside code", () => {
  for (const rel of relDocs()) {
    const src = fs.readFileSync(path.join(__dirname, "..", "docs", rel), "utf8");
    // '>' is the legal blockquote marker; '<' would mean raw HTML, which the
    // renderer is expected to neutralize — the goal is none in sources.
    assert.ok(!/[\u003c]/.test(src.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "")), rel + " contains raw < outside code");
  }
});
