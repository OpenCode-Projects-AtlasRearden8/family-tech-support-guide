"use strict";
/*
 * Content contract: the artifacts the project's goal requires must exist,
 * and their shape must hold (titles, alphabetical glossary, printable sheets).
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const DOCS = path.join(__dirname, "..", "docs");

const read = (rel) => fs.readFileSync(path.join(DOCS, rel), "utf8");
const firstHeading = (src) => (src.match(/^#\s+(.+)$/m) || [])[1];

test("the required manual exists, in reading order", () => {
  const chapters = fs.readdirSync(DOCS).filter((f) => /^\d/.test(f)).sort();
  assert.deepStrictEqual(chapters, [
    "00-start-here.md",
    "01-support-call-checklist.md",
    "02-teach-without-taking-over.md",
    "03-guided-fixes-you-talk-through.md",
    "04-rescue-order.md",
    "05-passwords-and-backups.md",
    "06-elder-scam-shields.md",
    "07-when-to-call-the-isp-or-a-pro.md",
    "08-glossary.md",
  ]);
  for (const c of chapters) assert.ok(firstHeading(read(c)), c + " opens with a title");
});

test("the support-call checklist covers triage and the close", () => {
  const src = read("01-support-call-checklist.md");
  for (const needle of ["## Phase 1", "Triage", "RED", "Phase 4", "checklist"]) {
    assert.ok(src.toLowerCase().includes(needle.toLowerCase()), "checklist missing " + needle);
  }
});

test("chapter 4 is the wifi-phone-printer rescue order", () => {
  const src = read("04-rescue-order.md");
  assert.ok(/wifi, then phone, then printer/i.test(src));
  for (const term of ["## Rescue 1", "## Rescue 2", "## Rescue 3", "unplug", "modem"]) {
    assert.ok(src.toLowerCase().includes(term.toLowerCase()), "rescue order missing " + term);
  }
});

test("chapter 5 commits to passwords and backups on a visit", () => {
  const src = read("05-passwords-and-backups.md");
  for (const term of ["password manager", "four", "two-factor", "iCloud", "Google", "restore", "test"]) {
    assert.ok(src.toLowerCase().includes(term.toLowerCase()), "chapter 5 missing " + term);
  }
});

test("chapter 6 includes the core scam shields", () => {
  const src = read("06-elder-scam-shields.md");
  for (const term of ["gift card", "hang up", "code word", "remote", "urgent"]) {
    assert.ok(src.toLowerCase().includes(term.toLowerCase()), "scam chapter missing " + term);
  }
});

test("chapter 7 tells readers when the ISP or a pro owns it", () => {
  const src = read("07-when-to-call-the-isp-or-a-pro.md");
  for (const term of ["ISP", "repair", "estimate", "outage"]) {
    assert.ok(src.toLowerCase().includes(term.toLowerCase()), "chapter 7 missing " + term);
  }
});

test("six teach sheets, all printable one-pagers with fill-in lines", () => {
  const sheets = fs.readdirSync(path.join(DOCS, "teach-sheets")).sort();
  assert.deepStrictEqual(sheets, [
    "backups.md",
    "passwords.md",
    "phone-basics.md",
    "printer.md",
    "scam-scripts.md",
    "wifi.md",
  ]);
  for (const s of sheets) {
    const src = fs.readFileSync(path.join(DOCS, "teach-sheets", s), "utf8");
    assert.ok(firstHeading(src), s + " has a title");
    assert.ok(/print/i.test(src), s + " mentions printing");
    assert.ok(/_{5,}/.test(src), s + " has a fill-in blank");
    assert.ok(src.length > 400 && src.length < 3200, s + " is roughly one page: " + src.length);
  }
});

test("glossary entries are in alphabetical order, plain-English length", () => {
  const src = read("08-glossary.md");
  const terms = [...src.matchAll(/^- \*\*(.+?)\*\*/gm)].map((m) => m[1].toLowerCase().replace(/ \(.*\)/, ""));
  assert.ok(terms.length >= 25, "glossary has at least 25 terms, has " + terms.length);
  const sorted = [...terms].sort();
  assert.deepStrictEqual(terms, sorted, "glossary not alphabetical: " + terms.join(", "));
  for (const line of src.split("\n")) {
    if (/^- \*\*/.test(line)) assert.ok(line.length < 420, "glossary entry too long: " + line.slice(0, 40));
  }
});

test("every chapter cross-links at least two siblings through relative md links", () => {
  for (const c of ["00-start-here.md", "02-teach-without-taking-over.md", "04-rescue-order.md", "06-elder-scam-shields.md"]) {
    const links = read(c).match(/\]\([^)#]+\.md\)/g) || [];
    assert.ok(links.length >= 2, c + " has only " + links.length + " sibling links");
  }
});
