# Spike: adoptedStyleSheets + Bootstrap subset in shadow roots (2026-09-02)

Files: `spike.html` (test page), `run-spike.mjs` (Playwright driver + static server), `results.json` (raw), `bootstrap-subset.css`, `bootstrap-full.css`, `bi.css` + `fonts/`.
Engines run: Chromium 151.0.7922.34, Firefox 153.0, WebKit 26.5 (Playwright 1.62.1). All three completed every scenario; no page errors.

## Sizes (node zlib)

| file | raw | gzip -9 | brotli |
|---|---|---|---|
| libs/mintplayer-ng-bootstrap/_bootstrap.scss compiled (subset) | 231,482 | 27,205 | 11,208 |
| node_modules/bootstrap/scss/bootstrap.scss (full) | 276,927 | 33,433 | 25,003 |
| bootstrap-icons.css | 98,255 | 13,531 | 10,517 |

The "subset" is 84% of full Bootstrap by bytes: it pulls in the full utilities API. It contains 3 `:root` blocks, 0 `@font-face`, `.text-bg-*` helpers but **no `.badge` rule** (badge module is not imported).
Compile: `npx sass --load-path=node_modules --no-source-map libs/mintplayer-ng-bootstrap/_bootstrap.scss` succeeded (only `@import` deprecation warnings).

## Scenario outcomes (identical in all 3 engines unless stated)

| Scenario | Measured |
|---|---|
| S0 doc `<link>` only, shadow adopts nothing | `.btn` unstyled (radius 0, UA grey), `.text-primary` NOT applied but `--bs-primary-rgb` **inherits** into the shadow (`13, 110, 253`), `p` margin 16px = UA default, h1 32px UA. Only inherited props cross. |
| S1 doc link + shadow adopts subset | `.btn` styled (blue, 6px), `.text-bg-danger` colours applied, `.text-primary` resolves (via inherited `--bs-primary-rgb` from the DOCUMENT's `:root`), reboot `p{margin-top:0}` + `h1` 40px apply. Probe rules in the adopted sheet: `:root{}` matched **nothing**, `html{}`/`body{}` matched nothing, `:host{}` matched. Angular emulated `.hdr[_ngcontent-x]` (document `<style>`) NOT applied inside shadow. |
| S1 @font-face: doc only | glyph renders (font-family `bootstrap-icons`, content set, width 16px, `document.fonts` = loaded). |
| S1 @font-face: adopted sheet only | **Chromium + Firefox: NOT loaded** (width 12.45/13px = fallback tofu, `document.fonts` empty, different pixel hash from doc-only). **WebKit: loads it** (width 16, listed in `document.fonts`). |
| S1 @font-face: both / injected into doc at runtime | loads everywhere. Runtime-injected `<style>@font-face` in `document.head` (the article's recommendation) works in all 3. |
| S2 shadow adopts subset, doc has NO bootstrap | `--bs-primary-rgb` empty; `.text-primary` colour = `rgb(0,0,0)` (invalid var -> inherited); `.btn.btn-primary` = **transparent background, white text, radius 0** (all `--bs-*` tokens undefined; our repo's `.btn-primary{--bs-btn-bg:var(--bs-primary)}` patch makes this worse than stock). |
| S2b same, `:root` textually rewritten to `:host` | everything resolves (blue button, 6px, `.text-primary` blue). One `replace(/:root/g, ':host')` on 3 blocks fixes it; `:host` matched in all engines. |
| S3 mirror `document.styleSheets` | Same-origin `<link>` and `<style>` serialize fine (212 KB + 87 KB + 3 styles). Cross-origin CDN `<link>`: `SecurityError` on `cssRules` in all 3 (Chromium "Cannot access rules", Firefox/WebKit "Not allowed to access cross-origin stylesheet") -> silently dropped. After mirroring, `.hdr[_ngcontent-x]` DOES apply (rgb(1,2,3)). A `<style>` appended to head afterwards is NOT picked up. `MutationObserver(head,{childList,subtree})` + re-mirror picks up appends and `textContent` replacement, but **`sheet.insertRule()` is invisible** (CSSOM, not DOM). Each re-mirror re-parses every sheet. Mirrored `@font-face` from bi.css rendered because the document copy still exists. |
| S3 timing, full bootstrap.css -> N roots (adopt + forced recalc, ms) | Chromium: shared 1/50/500 = 8.6 / 10.9 / 80; per-root = 6.9 / 339 / **2714**. Firefox: shared 6 / 12 / 46; per-root 6 / 397 / **3672**. WebKit: shared 16 / 11 / 51; per-root 5 / 26 / 245. Single parse of full CSS: Chromium 6.7 ms, Firefox 5.9, WebKit 0.75 (lazy). `performance.memory` (Chromium, precise) showed only KB deltas: CSSOM lives on the C++/Oilpan heap, not the JS heap, so it cannot measure this. |
| S4 cascade | Shadow `<style>.cas{1px}` vs adopted `.cas{2px}` -> **adopted wins (2px)** on equal specificity: adopted sheets sort after shadow `<style>`. Between adopted sheets, last wins (`[A,B]` -> B). `[B,A]` -> A in Firefox/WebKit. **Chromium: reassigning the same or fresh sheet objects in a different order did NOT restyle** (still B) until the array was cleared first; first assignment `[B3,A3]` was correct. `push()` works. Shadow `<style>` with higher specificity or `!important` beats adopted. A document rule on the host element (`#host{color}`) beats `:host{}` in the adopted sheet (outer tree wins). |
| S5 leak | `.leak{color:rgb(9,9,9)}` in the adopted sheet styles the shadow `.leak` only; light-DOM `.leak` untouched. Slotted light-DOM `.btn` child: styled by the DOCUMENT bootstrap when present, unstyled when absent -> adopted `.btn` never reaches slotted children. |
| S6 DSD + `<link>` inside `<template shadowrootmode>` | All 3 engines: 3 shadow roots created (`setHTMLUnsafe`), reboot applied inside (`p{margin-top:0}`), **1 network fetch for 3 roots** (1 resource-timing entry, 1 server hit, 231,782 B transfer). `<link>` = 51 bytes/instance vs 231,482 B/instance inlined. Inlined x3 page: 694 KB raw, 81 KB gzip (gzip window cannot dedupe 231 KB copies), 11 KB brotli. Same `:root` failure as S2 when the document lacks bootstrap (button transparent, radius 0). |

## Article claims vs measured (Eisenberg, "Debunking Web Component Myths", via r.jina.ai mirror; medium.com returned 403)

- Claim (verbatim): "Because of the ability to add any style sheet to the adoptedStyleSheets of a shadow root, you can simply create sheets from the document.styleSheets collection and use them in your Shadow DOM." Measured: true for same-origin sheets at one instant; false for cross-origin `<link>` (throws) and for anything added/mutated later (needs an observer and still misses `insertRule`). It does not address `:root`, cascade order, DSD/SSR, cost, or dynamic sheets.
- Claim: "What you can't do is define your @font-face configuration inside of a Shadow Root" - inject into the document in `connectedCallback`. Measured: correct for Chromium + Firefox; WebKit is more permissive. Runtime injection works everywhere.
- The SSR section discusses DSD but not styles at all.

## Sources
- Article mirror: https://r.jina.ai/https://eisenbergeffect.medium.com/debunking-web-component-myths-and-misconceptions-ea9bb13daf61
- MDN adoptedStyleSheets (constructed + same-document only; ordered after `ShadowRoot.styleSheets`; Baseline since 2023-03; Firefox 101, Safari 16.4; mutable array in newer engines): https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/adoptedStyleSheets
- @font-face in shadow roots ignored: Chromium issue 41085401 (issue tracker requires sign-in; could not read status) https://issues.chromium.org/issues/41085401 ; Rob Dodson https://robdodson.me/posts/at-font-face-doesnt-work-in-shadow-dom/ ; MDN interactive-examples #887 https://github.com/mdn/interactive-examples/issues/887
- DSD cannot carry adoptedStyleSheets; SSR frameworks inline `<style>` per root: Edge explainer (Active, proposes `<link rel=stylesheet import>`) https://microsoftedge.github.io/MSEdgeExplainers/ShadowDOM/explainer.html ; WICG/webcomponents#939 https://github.com/WICG/webcomponents/issues/939 ; web.dev DSD https://web.dev/articles/declarative-shadow-dom
- caniuse: https://caniuse.com/mdn-api_shadowroot_adoptedstylesheets
