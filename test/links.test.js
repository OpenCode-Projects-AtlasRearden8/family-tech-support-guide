"use strict";
/*
 * Link integrity: every internal link in the built site must resolve to a
 * real page, and every in-page anchor to a real heading id.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { buildAll } = require("../build.js");

let outDir;

function pages() {
  if (!outDir) {
    outDir = path.join(os.tmpdir(), "fth-links-" + Date.now());
    buildAll({ outDir, quiet: true });
  }
  const files = fs.readdirSync(outDir).filter((f) => f.endsWith(".html"));
  const ids = new Map();
  for (const f of files) {
    const idsIn = new Set();
    const html = fs.readFileSync(path.join(outDir, f), "utf8");
    for (const m of html.matchAll(/\sid="([^"]*)"/g)) idsIn.add(m[1]);
    ids.set(f, idsIn);
  }
  return { files: new Set(files), ids };
}

function checkLink(href, ids, from) {
  if (/^(https?:)?\/\//i.test(href) || href.startsWith("mailto:")) return;
  if (href.startsWith("#")) {
    assert.ok((ids.get(from) || new Set()).has(href.slice(1)), `dead anchor ${href} in ${from}`);
    return;
  }
  const [file, anchor] = href.split("#");
  // non-page assets (only style.css today) just need to exist in the output dir
  if (!file.endsWith(".html")) {
    assert.ok(fs.existsSync(path.join(outDir, file)), `dead asset link ${href} in ${from}`);
    return;
  }
  assert.ok(files_set.has(file), `dead link ${href} in ${from}`);
  if (anchor) {
    assert.ok((ids.get(file) || new Set()).has(anchor), `dead anchor ${href} in ${from}`);
  }
}

test("every link in every built page resolves", () => {
  const { files, ids } = pages();
  files_set = files;
  for (const f of files) {
    const html = fs.readFileSync(path.join(outDir, f), "utf8");
    for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      checkLink(m[1], ids, f);
    }
  }
});

let files_set;
test.afterEach(() => { /* keep tmpdir cleanup simple */ });

test("teardown removes temp build", () => {
  if (outDir) fs.rmSync(outDir, { recursive: true, force: true });
});
