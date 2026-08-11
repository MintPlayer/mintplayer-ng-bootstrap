# Plan — `mp-code-snippet` becomes the code viewer

PRD: [code-snippet-viewer.md](./code-snippet-viewer.md)
Status: **Implemented** (2026-08-11) on `feat/code-snippet-viewer`. All milestones done and the
M9 sweep is green locally.

| Milestone | Scope | State |
|---|---|---|
| S | Spikes S1–S3 | ✅ all pass — S1 Chromium-only (§14.1), S4/S5 folded into the sweep |
| M0+M3 | Styles → `.styles.scss` + shared `_styles/hljs-theme`, light/dark palette | ✅ merged: the palette *is* the theming, so splitting them would have written the dark-only version twice |
| M1 | `split-lines.ts` pure core + specs | ✅ |
| M2 | Row-based renderer, line numbers, `wrap`, `start-line` | ✅ |
| M4 | Annotations, active line, `lineHref`, `line-activate`, `scrollToLine` | ✅ |
| M5 | Lazy hljs: 104-key alias-aware loader map + async pipeline + guard | ✅ 53.7 → ~9–15 KB gzip |
| M6 | Roving tabindex, naming, localisation; aria spec 12 → 40 tests | ✅ |
| M7 | Wrappers ×3 + `codeToCopy`→`code` (332 sites) | ✅ |
| M8 | Demo pages ×3, ng axe route, ngx-highlightjs purge | ✅ |
| M9 | Sweep | ✅ 4 builds, 1898 WC tests, 164+93 Angular suites, 3 axe gates (40+44+44), dock e2e |

## M10 — review fixes (PR #402)

Five defects found by using the running demo; four reported by the user, the fifth measured while
taking a selection baseline. PRD §15b has the analysis and the measurements.

| # | Defect | Fix |
|---|---|---|
| R1 | Clicking a line number reloads the page (route destroyed) | Resolve a fragment-only `lineHref` against `location.href` in the element; drop the modified/non-primary click from `line-activate` entirely; Angular + Vue emit the `CustomEvent` so `preventDefault()` is reachable; demo uses a path-qualified href and shows `scrollToLine()` for the deep-link half |
| R2 | Rows misalign once any line is annotated (60 / 94.2 / 104px) | CSS **subgrid**: `code` owns the tracks, each `.line` is a subgrid spanning them, cells explicitly placed by `grid-column`; `.line-marks` wrapper deleted → single 98.5px offset |
| R3 | Primary vs secondary label indistinguishable and unaligned | Each owns a column, right-aligned; distinct default treatment; still separately addressable as parts |
| R4 | Selection must keep excluding the gutter | Already correct — preserved and now pinned by a spec |
| R5 | The sr-only annotation description leaked into copied code | `.sr-only { user-select: none }` |

Rejected along the way: a `preventNavigation` boolean (redundant once the modifier guard exists,
and static); `display: contents` rows (removes the row box that carries the annotation background,
active outline and `part(line)`).

## M11 — collapse unused gutter tracks (R6) — investigated, NOT YET APPLIED

PRD §15c has the analysis. R2's `minmax(3ch, auto)` floors apply even to an EMPTY track, so a
snippet with neither line numbers nor annotations still reserves 46.2px of gutter — 13.5% of the
component at a 390px viewport, and 7 of the 9 snippets on the demo page pay it.

Fix, measured in Chromium against the running demo:

```scss
code {
  grid-template-columns: auto var(--mark-track, auto) var(--mark2-track, auto) 1fr;
}
code:has(.line-mark:not(.secondary)) { --mark-track:  minmax(var(--mp-code-mark-min-width, 3ch), auto); }
code:has(.line-mark.secondary)       { --mark2-track: minmax(var(--mp-code-mark-min-width, 3ch), auto); }
```

| snippet | before | after |
|---|---|---|
| plain | `0 · 23.09 · 23.09`, text at 47px | `0 · 0 · 0`, text at **0.8px** |
| line numbers only | `43.24 · 23.09 · 23.09`, 90.2px | `43.24 · 0 · 0`, **44px** |
| annotated | `43.24 · 23.09 · 39.63`, 106.8px | unchanged |
| secondary labels only | would floor track 2 | `0 · 0 · 39.63` — per-track split works |

Verified: `:has()` re-evaluates on DOM change (inserting a mark grew its track, removing it
collapsed it), so it survives Lit re-renders; no host state or new attribute needed; the floor is
harmless once gated, and within a snippet `auto` already prevents all jitter (all-`0` 23.09px,
all-`12×` 27.63px, mixed 27.63px), so the floor only aligns *separate* snippets.

Remaining work when this is applied: run the WC suite, add a spec asserting the empty tracks
collapse (assert `grid-template-columns` on `code`, since jsdom has no layout), re-check the
`wrap` and horizontal-scroll cases, and re-screenshot at 390px.

**Methodology note for anyone probing this component live:** Lit's ADOPTED stylesheet outranks a
`<style>` appended to the shadow root at equal specificity, so a probe silently does nothing
unless it uses `!important` or higher specificity. Two prototypes here looked like failures for
that reason alone.

Verified in Chromium against the running demo before writing the fix: subgrid supported, row box
survives, sticky gutter survives, annotated background still spans the full 3277px scroll width.

Two fixes the earlier sweep caught, both committed:
- `highlightPending` was created fire-and-forget, so the `getUpdateComplete` override awaited
  nothing and six aria assertions read a stale `detectedLanguage`.
- `mp-phone-input`'s D17 flake (pre-existing on master, confirmed on a clean checkout) — same
  defect class, fixed the same way. Picked up at the user's request.

**Not verified locally:** Firefox and WebKit. The installed engine builds predate the Playwright
driver and downloading matching browsers was declined, so those projects fail to launch here.
CI covers them.

## Conventions that bite here

- **After ANY `.scss` edit: `npx nx run mintplayer-web-components:codegen-wc`** or the change is
  invisible. Generated `*.styles.ts` / `*.generated.ts` are gitignored — never stage them.
- **The `.element.html` codegen cannot host a dynamic template** — it escapes `${` and emits a
  module-level constant. code-snippet keeps its inline `html\`\`` in `render()`. Do not attempt
  the HTML half of the codegen ask (PRD §10).
- **Batch the test runs.** One sweep at M9. Verify intermediate milestones by reading and
  `tsc --noEmit`. This includes targeted vitest runs and per-lib `nx build`s.
- **Commit per milestone, push once** at the very end — every push is billed and a push mid-run
  cancels the in-flight run.
- In wrapper specs, drive inputs from a `signal()`, never a mutable field.
- Nx on Windows: `NX_ISOLATE_PLUGINS=false NX_DAEMON=false`; vitest `--pool=threads`.
- Run e2e through Nx (`npx nx e2e <app>-bootstrap-demo-e2e`), never `npx playwright test`.
- No new branch or PR without explicit permission.

## Ordering rationale

S1 gates M3 because a failed `light-dark()` spike changes the *stylesheet*, not the API — cheap to
absorb before styles are written, expensive after. S2 gates M1/M2 because the line splitter is the
one genuinely novel algorithm and everything visual sits on top of it. M0 goes first so every
later milestone edits SCSS in its final home. M5 (lazy hljs) is sequenced *after* the renderer
because it makes highlighting async, and debugging an async pipeline through a renderer that is
itself in flux is the avoidable version of this work. M7 (the 332-site rename) is deliberately
late and mechanical — doing it early would mean re-touching call sites as the API settles.

---

## S — Spikes

The user has authorised as many spikes as are useful. Each is a throwaway under `docs/prd/`
(`_spike-*.html`) or a scratch script; none ship.

### S1 — `light-dark()` over an inherited `color-scheme` (gates M3)

`docs/prd/_spike-code-theme.html`, run in Chromium + Firefox + WebKit.

A WC with `light-dark()` colours in its shadow stylesheet, nested inside `[data-bs-theme]`
containers. Assertions:

1. `[data-bs-theme=dark]` ancestor → dark colours inside the shadow root.
2. **Light page (no `color-scheme` set anywhere) while `prefers-color-scheme: dark` → LIGHT
   colours.** This is the primary assertion; Bootstrap sets `color-scheme` on the dark theme only
   (`bootstrap.css:129`), so the light case relies on `light-dark()` treating the initial value
   `normal` as light. If any engine instead falls back to the media query, the mechanism is
   unusable as specified.
3. `:host([theme=light]) { color-scheme: only light }` overrides an inherited dark, and vice
   versa.
4. A theme flip on `<html>` at runtime repaints the shadow root with no JS.

**On failure:** fall back to a `--mp-code-scheme` custom property emitted by `_bootstrap.scss`
under each theme, consumed via the workspace's normal inherited-token pattern. Same public API,
more wiring, and a documented consumer requirement to include the stylesheet.

### S2 — line splitting against real hljs output (gates M1/M2)

Scratch script against real `highlight.js`, feeding output through a draft
`splitHighlightedLines`, then re-parsing each row to assert well-formedness. Corpus: TypeScript
(nested spans), JSON (the `.hljs-attr`/`.hljs-punctuation` case), XML/HTML (entities), C#, and
Markdown (embedded code fences). Assert: no unbalanced tags in any row; concatenating rows'
`textContent` reproduces the source exactly; `&lt;`/`&amp;` escaped exactly once; a span opened on
line 1 and closed on line 4 produces four well-formed rows.

### S3 — alias extraction across all 36 grammars

The research measured aliases for 2 of 384 files and flagged that a full pass may hit grammars
with unusual API requirements. Register each of the 36 `lib/common` grammars against the **real**
`lib/core` (a mocked API throws `TypeError: hljs.COMMENT is not a function`), collect
`{ id, aliases }`, and assert `tsx`→typescript, `html`→xml, and `js`**≠**typescript. Output feeds
M5's generator directly.

### S4 — bundler resolution matrix, extended to webpack

§9.3's matrix is measured for esbuild/rollup/vite; webpack is untested. Build a consumer with
hljs absent and confirm webpack's behaviour for static vs dynamic vs `.catch()`. Determines
whether a README install note is sufficient or whether the error needs to be caught and explained
at runtime.

### S5 — row rendering vs today's `<pre>`

Before committing to a single row-based render path, render the same snippet both ways in the
three demo apps and compare line-height, wrapping, horizontal scroll, and — importantly —
**what a drag-select copy actually puts on the clipboard** with `user-select: none` gutters.

---

## M0 — Styles to `.styles.scss` (no behaviour change)

1. `code-snippet/src/styles/code-snippet.styles.scss` — layout/chrome (host, `pre`, `code`,
   `.copy`, `.toast`, `.sr-only`, slot hiding), ported verbatim from `element.ts:33-127`.
2. `libs/mintplayer-web-components/_styles/hljs-theme.styles.scss` — the token→colour map alone
   (`:129-150`), **shared**, so a future component reuses the same `CSSStyleSheet`.
3. `code-snippet/src/styles/index.ts` — hand-written re-export (carousel's one-liner is the
   pattern).
4. Element: `static override styles = [hljsThemeStyles, codeSnippetStyles]`.
5. Run `codegen-wc`. No `project.json` change — the walker globs `**/*.styles.scss` already.

Behaviour must be identical at this point; the palette work is M3.

## M1 — `split-lines.ts`

`code-snippet/src/core/split-lines.ts`, pure and DOM-free, plus `split-lines.spec.ts` written
first from S2's corpus. The interface comment carries the *why*: hljs emits only
`<span class="…">` and escaped text, so a literal `\n` can only occur in a text node — which is
what makes a scanner correct here and a general HTML parser unnecessary.

## M2 — Row renderer

Replace the single `<pre><code>` blob with rows inside the same `<pre role="region">`. Adds
`lineNumbers`, `startLine`, `wrap`. `user-select: none` on gutter columns. Copy still copies
`this.code`, never the DOM. CRLF normalized on input.

## M3 — Theming (after S1)

`theme` attribute (`auto`/`light`/`dark`) implemented by constraining `color-scheme` on `:host`.
Light palette **chosen, not transcribed** (PRD §8): resolve the Yellow/Orange collapse, pick a
`.hljs-punctuation` value that passes contrast on `#fefefe`, and **compute the ratios** for every
token colour. Record the chosen values and their ratios in the PRD.

## M4 — Annotations

`annotations`, `activeLine`, `lineHref`, `scrollToLine(n)`, and the cancelable `line-activate`
event. Active line is an **outline**, composing over the annotation background rather than
replacing it. Annotation colours via `--mp-code-annotation-<kind>-bg`. Lines named by
annotations may exceed `code`'s extent (CodeCoverage's source-unavailable mode).

## M5 — Lazy highlight.js

1. `tools/scripts/build-hljs-loaders.mjs` → `code-snippet/src/hljs-loaders.generated.ts`, an
   **alias-aware, many-to-one** `Record<string, () => Promise<LanguageFn>>` over the 36 common
   grammars, using S3's data and static string-literal specifiers only.
2. Wire into `codegen-wc` (`outputs`, `inputs` incl. `externalDependencies: ["highlight.js"]`);
   confirm `.gitignore:66` already covers `*.generated.ts`.
3. Async pipeline: promise cache keyed by resolved grammar (mirroring `load-flag.ts` — cache the
   promise, evict on rejection, never reject), first-paint escaped plain text, out-of-order guard,
   and a **distinction between "unknown language id" and "chunk failed"** so a failed load is not
   silently rendered as plaintext.
4. `registerLanguage(name, fn)` escape hatch.
5. `tools/scripts/check-code-snippet-bundle-size.mjs` + CI wiring.
6. Update `apps/ng-bootstrap-demo/src/test-setup.ts:19-31` — stub the loader map, not global
   `hljs`.

## M6 — Accessibility

Roving tabindex across line anchors (one tab stop, arrows to move, Enter to activate), keymap
announced on entry and documented on the demo page. `label`, `lineLabel` localisable; the
remaining hard-coded strings (`Copied!`, `Copied to clipboard`, `… code sample`) routed through
the same channel. Row naming from `lineLabel` + `description` — never colour alone. Declare the
no-JS tier in the class comment (currently undeclared; it renders an empty `<pre>`).

Extend `mp-code-snippet.element.aria.spec.ts`: the existing 12 tests stay green (they pin
`button.copy`, `[role=status]`, `.toast`, the `${language}` substitution and the 3 000 ms expiry —
none touch `<pre>`/`<code>`), plus new assertions for roving focus, active line, and annotated-row
naming. The async change means some tests need an extra await — update, don't weaken.

## M7 — Wrappers

- **Angular**: `codeToCopy` → `code` (332 call sites, mechanical); add `annotations`,
  `activeLine`, `lineHref`, `theme`, `lineNumbers`, `copyLabel`, `label`; `(lineActivate)`;
  **forward host `aria-*`/`id`/`tabindex`** to the inner element (currently dropped).
- **React**: add the missing `events` block so `language-detected` and `line-activate` surface as
  `onLanguageDetected`/`onLineActivate`; object props via ref.
- **Vue**: emits + object props on the element ref; `v-bind="$attrs"` already correct.
- Add the `./code-snippet` subpath export to the React and Vue package `exports` maps (neither
  declares one today).
- Update `libs/mintplayer-ng-bootstrap-snippets/snippets/html.json:18-24`.

## M8 — Demos + purge

Demo sections for line numbers, annotations and theming, live demo **before** the snippet, keymap
documented. Add the ng demo's code-snippet route to its axe suite (React and Vue already audit
theirs; ng does not).

**Purge `ngx-highlightjs`**: root dependency (`package.json:51`), `provideHighlightOptions`
(`app.config.ts:39-42`), the `HighlightModule` usage on `advanced/copy` (which sits on the same
page as two normal `<bs-code-snippet>`), `libs/mintplayer-ng-bootstrap/src/styles/ngx-highlight-themes/a11y-dark.scss`,
and the stale prose at `code-snippet.component.html:5-7`.

Add one assertion to `progress-bar.component.spec.ts` pinning that a consumer's static `class`
survives the host `[class]` binding — the reported bug is measured **not real** (PRD §13.3), and
the assertion is what stops it being re-reported.

## M9 — Sweep

```bash
npx nx build mintplayer-web-components
npx nx build mintplayer-ng-bootstrap
npx nx build mintplayer-react-bootstrap
npx nx build mintplayer-vue-bootstrap
npx nx test mintplayer-web-components
npx nx test mintplayer-ng-bootstrap
node tools/scripts/check-code-snippet-bundle-size.mjs
npx nx run-many -t e2e --parallel=1
npx nx run-many -t e2e-a11y --parallel=1
```

Then reply to `C:\Repos\Coverage\docs\ng-bootstrap-handoff.md`: §1 delivered as an extension of
`bs-code-snippet` rather than a new `bs-code-viewer`, with the API mapping for their
`RenderedLine[]`; §3 progress-bar claim corrected as measured-not-real; §3 `bsShellTopbar` noted
as never having existed (`<div slot="topbar">` works today); §3 Sass `@use` migration deferred to
its own PRD with the 140-`@import` scope stated.

## Deliberately deferred

Virtualization; diff mode; folding; search; SSR/no-JS tier; `bsShellTopbar`; the Sass `@use`
migration; the two genuine leads from the host-class sweep (`button-type.directive.ts:8` binding a
mutable field, and two directives both binding host `[class]` on one element).

## Decisions taken (2026-08-11) — no open questions

1. **Demo site: `line-numbers` on for multi-line snippets, off for one-liners.** Folded into M8;
   sweep the demo pages once rather than leaving it per-page.
2. **CodeCoverage ships highlight.js** — confirmed. The highlighted path is the primary design;
   plain text stays as the first-paint state, not a supported mode.
3. **No element rename.** Reconsidered with the breaking-API justification available and still
   declined — `snippet` and `block` are synonyms. `codeToCopy` → `code` on the Angular wrapper
   still happens (M7).
