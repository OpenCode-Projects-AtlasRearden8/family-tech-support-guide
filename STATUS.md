# STATUS — family-tech-support-guide

Last updated: 2026-10-26

## What was built

A complete, local-first manual for being the calm, un-sighing family tech helper, built to the project's original goal:

- **`docs/` — the manual** (nine Markdown chapters, the source of truth):
  - Support-call checklist with red/yellow/green triage (`01-support-call-checklist.md`)
  - Teaching without taking over (`02-teach-without-taking-over.md`)
  - Guided fixes you talk through, with a hard no on remote access (`03-guided-fixes-you-talk-through.md`)
  - The rescue order: wifi → phone → printer (`04-rescue-order.md`)
  - Passwords and backups set up together on a one-hour visit (`05-passwords-and-backups.md`)
  - Elder-scam shields: five shields, scripts, family code word, after-tour (`06-elder-scam-shields.md`)
  - When to call the ISP or pay a pro, with scripts and a decision table (`07-when-to-call-the-isp-or-a-pro.md`)
  - Plain-English glossary, written to be read aloud (`08-glossary.md`)
  - Start-here chapter framing the six rules and the standard of done (`00-start-here.md`)
- **`docs/teach-sheets/` — six printable one-pagers** (Wi-Fi ritual, phone routine, printer triage, passwords, backups, scam-scripts card), each with a fill-in blank for household facts and a print tip.
- **`build.js` — a zero-dependency static site generator** (Node built-ins only): renders every Markdown doc into `site/` as linked pages with shared nav/stylesheet, checkbox checklists, tables, blockquotes, heading anchors, a generated index, and prev/next pagers. Escapes all raw HTML, so sources stay inert.
- **`assets/style.css`** — one hand-rolled stylesheet; print media rules so teach sheets print cleanly on one page.
- **`test/` — 26 tests** (`node --test`, zero dependencies): build determinism, page-for-every-doc, link/anchor integrity across the built site, markdown rendering units, content contract (chapters in reading order, required topics present, six teach sheets, alphabetical glossary), and project integrity (exact MIT line, README credit, secrets pattern scan, no network calls in the build).
- **README.md** — purpose, chapter table, build/test commands, project shape, printing tips; credits Asdale Dynamics, LLC and the companion projects free-large-print-tech-kit and ai-scam-safety-guide.
- **LICENSE** — MIT, copyright line exactly `Copyright (c) 2026 Asdale Dynamics, LLC`.

## How to run

```bash
npm run build    # renders docs/*.md → site/ (16 pages)
npm test         # 26 tests
npm run verify   # fresh build + tests
```

Then open `site/index.html` in any browser. No network, no accounts, no tracking — safe on an air-gapped machine.

## Verification results

- `npm run verify` — **26/26 tests pass**, exit code 0 (Node v20.19.2).
- Build emits 16 pages (9 chapters + 6 teach sheets + index) plus `style.css`, byte-deterministic across two runs.
- Link test: every `href`/`src` in every built page resolves to a built page, an in-page anchor, or the stylesheet.
- Integrity checks pass: exact copyright line, README credit present, no secret/credential patterns in `docs/`, `test/`, README, build.js, package.json.

## Known gaps / future work

- The site has **no client-side search**; navigation is index + pagers. A tiny local search index could be added without any network dependency.
- **Cross-platform detail is deliberately generic** — chapters name iCloud/Google/Windows features at the level beginners need, without trackable menu paths that age quickly. A future pass could add screenshots.
- **Teach sheets are text-only**; a large-print variant (matching free-large-print-tech-kit) would be a natural follow-up.
- The checklist checkboxes are printable/static (no saved state); browser `localStorage` persistence would need a small script inside the generated site.
- Content covers the six goal areas; additional chapters (e.g., phone cameras, streaming TV, video appointments with doctors) could extend the same tested build.
