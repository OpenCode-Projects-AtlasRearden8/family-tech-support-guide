"use strict";
/*
 * Project integrity: license text, README credit, package scripts,
 * and a scan for secrets or personal data that must never appear in files.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

test("license is MIT with the exact required copyright line", () => {
  const lic = fs.readFileSync(path.join(ROOT, "LICENSE"), "utf8");
  assert.ok(lic.includes("MIT License"));
  assert.ok(lic.includes("Copyright (c) 2026 Asdale Dynamics, LLC"), "exact copyright line required");
  assert.ok(!lic.includes("Co-authored"), "no co-author trailers in license");
});

test("README credits Asdale Dynamics, LLC and the author hub", () => {
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  assert.ok(readme.includes("Asdale Dynamics, LLC"), "README must credit Asdale Dynamics, LLC");
  assert.ok(readme.includes("dylanasdale.github.io"));
  for (const sib of ["free-large-print-tech-kit", "ai-scam-safety-guide"]) {
    assert.ok(readme.includes(sib), "README must mention companion project " + sib);
  }
  assert.ok(/npm run (build|test|verify)/.test(readme), "README documents the commands");
});

test("package.json exposes build, test and verify scripts", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  for (const s of ["build", "test", "verify"]) assert.ok(pkg.scripts[s], "missing script " + s);
  assert.strictEqual(pkg.license, "MIT");
  assert.ok(pkg.author.includes("Asdale Dynamics"));
});

test("no secrets, keys, or personal data patterns anywhere in sources", () => {
  const patterns = [
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key block"],
    [/AKIA[0-9A-Z]{16}/, "AWS access key"],
    [/sk-[A-Za-z0-9]{20,}/, "API key (sk-)"],
    [/ghp_[A-Za-z0-9]{30,}/, "GitHub token"],
    [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, "JWT"],
    [/\b\d{3}-\d{2}-\d{4}\b/, "SSN-like number"],
  ];
  const dirs = ["docs", "test"];
  const files = ["README.md", "build.js", "package.json", "STATUS.md"];
  const everything = dirs.flatMap((d) =>
    fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })
      .filter((e) => e.isFile() && /\.md$/.test(e.name))
      .map((e) => path.join(d, e.name))
  ).concat(files.filter((f) => fs.existsSync(path.join(ROOT, f))));
  for (const rel of everything) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    for (const [re] of patterns) assert.ok(!re.test(src), rel + " matches a secret pattern");
  }
});

test("no outbound network calls in the project's own code", () => {
  const build = fs.readFileSync(path.join(ROOT, "build.js"), "utf8");
  for (const banned of ["require('http", 'require("http', "fetch(", "XMLHttpRequest", "https.request"]) {
    assert.ok(!build.includes(banned), "build.js contains " + banned);
  }
});
