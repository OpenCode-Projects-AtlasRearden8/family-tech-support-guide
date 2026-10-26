# The Family Tech Helper

*A manual for being the calm, un-sighing family tech helper.*

You're the person your family calls when "the printer is haunted," the Wi-Fi quits, or a scary text says their bank account is frozen. This project is a field manual for doing that job well and gently: **the sigh never happens, the fix gets taught, and every call leaves the person a little more able than they found them.**

Written in the same plain-English, step-by-step, never-condescending style that Dylan Asdale uses to explain AI "like a friend would" in *The Massive AI Manual* and on [dylanasdale.github.io](https://dylanasdale.github.io).

## What's inside

**The manual** (`docs/`, also rendered as a static HTML site):

| | Chapter | One line |
| --- | --- | --- |
| 00 | [Start here: the promise](docs/00-start-here.md) | The six rules, the office-hours trick, and the standard of "done" |
| 01 | [The support-call checklist](docs/01-support-call-checklist.md) | Red/yellow/green triage for every call, printable checklist phases |
| 02 | [Teach without taking over](docs/02-teach-without-taking-over.md) | Their hands, your words; the show–do–do-alone loop; one skill per visit |
| 03 | [Guided fixes you talk through](docs/03-guided-fixes-you-talk-through.md) | "Be their screen" talk-throughs — with a hard no on remote access (yours or anyone's) |
| 04 | [The rescue order](docs/04-rescue-order.md) | When "everything's broken": wifi, then phone, then printer |
| 05 | [Passwords and backups](docs/05-passwords-and-backups.md) | The one unhurried hour that prevents every future disaster, done together |
| 06 | [Elder-scam shields](docs/06-elder-scam-shields.md) | Five shields, rehearsed scripts, the family code word, and the after-action tour |
| 07 | [When to call the ISP or a pro](docs/07-when-to-call-the-isp-or-a-pro.md) | The hand-off map, the sentences that make ISP calls painless, and how to pick a repair shop |
| 08 | [Glossary](docs/08-glossary.md) | Plain words for tech words, written to be read out loud on calls |

**Teach sheets** (`docs/teach-sheets/`): six printable one-pagers to leave with the person — Wi-Fi ritual, phone routine, printer triage, passwords, backups, and the scam-scripts card. Each has a spot to fill in household facts (Wi-Fi password, printer name, family code word) after printing.

**Companion projects:** this guide pairs with **free-large-print-tech-kit** (large-print versions of the basics) and **ai-scam-safety-guide** (deeper scam education). The three are independent; use whichever your person needs first.

## Build & test

Zero runtime dependencies. Node 18+ is all it needs.

```bash
npm run build    # renders docs/*.md into a static HTML site in site/
npm test         # runs the whole test suite (build, links, content, integrity)
npm run verify   # fresh build + tests in one command
```

Open `site/index.html` in a browser to read the manual. Everything is local-first: no accounts, no tracking, no network calls at build time or run time. Generated site works entirely offline.

## Project shape

```
docs/           the manual (Markdown, the source of truth)
docs/teach-sheets/   printable one-pagers
assets/style.css     the site's single stylesheet
build.js        zero-dependency Markdown→HTML static site generator
test/           node --test suites: build, link integrity, content contract, project integrity
site/           generated output (gitignored; created by npm run build)
```

## Project tests, briefly

- **Build:** every doc produces a complete page; output is byte-deterministic across runs.
- **Links:** every internal link and anchor in the built site resolves.
- **Markdown:** headings, tables, blockquotes, checkbox checklists, fenced code (safe: raw HTML in sources is escaped).
- **Content contract:** the promised artifacts exist and hold their shape — reading-order chapters, six teach sheets with print + fill-in lines, an alphabetical glossary.
- **Integrity:** exact `MIT License` line (`Copyright (c) 2026 Asdale Dynamics, LLC`), README credit, no secrets/personal-data patterns in sources, no network calls in the build.

## Printing tips

Teach sheets are designed for one page at 100% or the printer's "large" setting — the fill-in blanks are for after you print. For a house that needs bigger, the free-large-print-tech-kit pair takes over from here.

## License & credit

MIT — see [LICENSE](LICENSE). Built and maintained by **Asdale Dynamics, LLC** (Dylan Asdale). More plain-English AI and tech guides at [dylanasdale.github.io](https://dylanasdale.github.io).
