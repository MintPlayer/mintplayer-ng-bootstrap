# PRD — `mp-code-snippet` becomes the code **viewer**: line rendering, theming, lazy highlighting

Status: **Proposal** (2026-08-11)
Author: Pieterjan — investigation by a 5-agent team (code-snippet surface + consumers, WC
codegen infrastructure, the CodeCoverage consumer, highlight.js packaging/theming, and the
reported `bs-progress-bar` bug).
Plan: [code-snippet-viewer-plan.md](./code-snippet-viewer-plan.md)
Upstream ask: `C:\Repos\Coverage\docs\ng-bootstrap-handoff.md` §1 (+ §3 extras).

**Headline decision: we do NOT add `mp-code-viewer`.** The requested features are
`mp-code-snippet`'s own deficiencies. One element absorbs them. See §4.

---

## 1. Problem

The CodeCoverage project asked for a **new** `mp-code-viewer` component, arguing that
`mp-code-snippet` cannot serve a source-file view because it has no line numbers, is permanently
dark, and has no per-line annotation channel.

Every one of those is a real gap — but each is a gap *in `mp-code-snippet` itself*, not evidence
that a second component is needed:

- **No line numbers.** The element renders one `<pre><code>` blob
  (`mp-code-snippet.element.ts:257-262`). A documentation snippet wants line numbers roughly as
  often as a file view does; the demo site has simply never had the option.
- **Dark-only, by an explicit decision that has now aged out.** The style block carries a
  verbatim port of hljs's `a11y-dark.css` and a comment justifying "no Bootstrap `data-bs-theme`
  branch" (`:33-50`), pinning `background: #2b2b2b`. Any consumer with a light page gets a black
  rectangle they cannot re-theme.
- **No annotation channel.** There is nowhere to hang a per-line gutter, background or label.

Meanwhile the component has three packaging faults that a second component would **duplicate**
rather than fix:

1. **highlight.js is referenced three times over.** The element statically imports
   `highlight.js/lib/common` at module top level (`:4`); the Angular demo *additionally* loads the
   **full** library through legacy `ngx-highlightjs`
   (`apps/ng-bootstrap-demo/src/app/app.config.ts:39-42`, `fullLibraryLoader: () => import('highlight.js')`);
   and a third copy of the theme ships as
   `libs/mintplayer-ng-bootstrap/src/styles/ngx-highlight-themes/a11y-dark.scss` (108 lines)
   duplicating the port inlined in the element.
2. **The import is eager and unconditional**, so every consumer of the `./code-snippet` subpath
   pays for 36 language grammars whether they use one or all of them. Tree-shaking cannot help:
   hljs's own `package.json` `sideEffects` array names `"./lib/common.js"`, pinning all 36
   `registerLanguage` calls.
3. **Its styles are inlined**, alone among non-`ribbon` components, so the code-block appearance
   cannot be shared with anything and does not participate in the workspace's SCSS codegen.

Measured cost of the eager import (esbuild, minified, gzip): **53.7 KB** for `lib/common`, versus
**8.6 KB** for `lib/core` plus 0.3–6 KB for the one language actually needed —
**≈45 KB of dead weight**, when 331 of 332 in-repo usages name their language up front.

Note the blast radius is correctly scoped already: the root barrel `src/index.ts` does **not**
re-export code-snippet, `./code-snippet` is its own subpath in the built package, and
`vite.config.mts:52` externalizes `/^highlight\.js(\/.*)?$/`. So only consumers who import that
subpath pay anything — a fact that changes the packaging conclusion in §9.

## 2. Goals

1. **G1 — One component.** `mp-code-snippet` renders both a documentation snippet and an
   annotated source-file view. No `mp-code-viewer`.
2. **G2 — Per-line rendering** with line numbers, stable per-line anchors, an active-line state,
   and a generic annotation channel (background kind + gutter labels), all opt-in and off by
   default.
3. **G3 — Theme-following.** The code block honours Bootstrap's `data-bs-theme` with **no JS and
   no ancestor selector**, plus an explicit override for consumers who want a fixed appearance.
4. **G4 — highlight.js referenced exactly once, lazily.** Nothing in the initial bundle;
   `ngx-highlightjs` and the duplicate theme file deleted from the workspace.
5. **G5 — Styles in `.styles.scss`** via the existing `codegen-wc` target, with the token→colour
   map declared **once** in `_styles/` so any future component reuses the same `CSSStyleSheet`.
6. **G6 — Wrapper parity**: Angular/React/Vue expose the full surface, forward host `aria-*`, and
   the new subpath exports resolve for published consumers.

## 3. Non-goals

- **Virtualization.** CodeCoverage renders one DOM node per line today and names virtualization a
  future scaling flag (`Coverage/docs/PRD.md:274`); the handoff says "plain render is acceptable
  v1". Out of scope, but the row-based renderer is the prerequisite for adding it later.
- **Diff mode, code folding, search/match highlighting, sticky filename headers.** Nothing in
  either repo asks for them.
- **An editor.** Read-only rendering only.
- **A radial progress ring** (`mp-progress-circle`) — already declined upstream in the charts PR
  and unrelated to this work.
- **Renaming the element.** `mp-code-snippet` keeps its tag; see §4.3.

## 4. Decision: one element, not two

### 4.1 The alternative, designed properly

**Design B — two elements over a shared core**: keep `mp-code-snippet` as-is, add
`mp-code-viewer`, and factor the highlighting into a shared `code-highlight` module plus a shared
`_styles/hljs-theme.styles.scss`.

Design B satisfies G4 and G5 just as well as Design A — the shared core is what removes the
duplicate highlight.js reference, not the element count. What Design B adds on top is:

- a second element, its `styles/`, `types/` and aria spec;
- **six more wrappers** (Angular + React + Vue, source + barrels + `ng-package.json`);
- three more demo pages, three more routes, three more axe-gate entries;
- a permanent "which one do I use?" question for every consumer, whose honest answer is "the same
  one, with different attributes".

And it leaves `mp-code-snippet` still dark-only and still without line numbers — i.e. it does not
actually fix the reported defects; it routes around them.

### 4.2 Why Design A wins

The delta between the two use cases is **chrome, not substance**. Both render highlighted source.
Once the genuinely hard part is solved — splitting hljs token markup at line boundaries, §7 — a
per-line renderer is the natural output for both, and "snippet" vs "viewer" reduces to which
gutter columns are switched on. The features the handoff asks for are the features the snippet is
missing.

Cost is concentrated where it belongs: one renderer, one theme, one hljs reference, one aria
spec, one demo page per framework.

**The honest risk** is that a component accumulating `line-numbers`, `annotations`,
`active-line` and `line-href` becomes a shallow mode-switch rather than a deep abstraction. The
mitigation is that all of it is opt-in and defaults off — the existing 332 usages keep working
with `code` + `language` alone — and the element's interface comment states one promise:
*render source code, optionally annotated per line*. If that sentence ever stops being writable,
the abstraction has drifted and the split becomes correct. It is writable today.

### 4.3 The element keeps its name — decided

`mp-code-snippet` keeps its tag name. **Decision made 2026-08-11 with the rename explicitly on the
table**: the API *is* breaking (see §6), so a rename was permitted rather than blocked — but
permission is not a reason.

The rejection is semantic, not logistical. "Snippet" and "block" are synonyms; neither says
*annotated source viewer* any better than the other, so the rename buys no clarity for the reader
it would supposedly help. Weighed against that: 332 Angular usages, 56 React, 56 Vue, a VS Code
snippet definition (`libs/mintplayer-ng-bootstrap-snippets/snippets/html.json:18-24`) and two demo
CSS rules that reach the element by tag name (`RibbonPage.css:193`, `RibbonView.vue:988`).

The one name change that *does* earn its cost happens anyway: the Angular wrapper's `codeToCopy`
→ `code`, which removes a real divergence from the property it wraps.

## 5. Current state (measured)

| Fact | Evidence |
|---|---|
| WC is 4 files, no `styles/`, no codegen, no SSR chrome | `libs/mintplayer-web-components/code-snippet/` |
| Styles inlined, 119 lines, incl. a11y-dark port | `mp-code-snippet.element.ts:33-151` |
| hljs imported statically, eagerly, top-level | `:4` |
| hljs is an **optional** peer; externalized in the WC build | `package.json:32-38`, `vite.config.mts:52` |
| `lib/common` **53.7 KB gzip** vs `lib/core` **8.6 KB**; +typescript 3.1 KB, +xml 0.8 KB, +json 0.3 KB | measured (esbuild min+gzip), hljs 11.11.1 |
| `lib/common` registers exactly **36** languages; `lib/languages/` holds 384 files | `grep -c registerLanguage lib/common.js` |
| hljs `sideEffects` names `./lib/common.js` → **not tree-shakeable** | `node_modules/highlight.js/package.json` |
| Angular usages: **332** across 99 templates; **331 pass `[language]`** | ng demo |
| React 56, Vue 56 | react/vue demos |
| `language-detected` bound by **zero** consumers | repo-wide |
| Default slot, `copy-label`, `::part()` used by **zero** consumers | repo-wide |
| Angular input is `codeToCopy`, WC property is `code` | `code-snippet.component.ts:27` |
| Angular wrapper does **not** forward host `aria-*`/`id`/`tabindex` | `.a11y-audit/06-status-content.md:155` |
| React wrapper has **no `events`** block → `language-detected` unreachable | `BsCodeSnippet.tsx:10-14` |
| React/Vue `package.json` declare **no `./code-snippet` subpath** | both |
| Only spec is the aria spec, 12 tests; pins `button.copy`, `[role=status]`, `.toast` | `mp-code-snippet.element.aria.spec.ts` |
| e2e reads the `.code` **property** off the inner element | `dock-keyboard.spec.ts:84-104` |
| No SSR chrome, no no-JS tier; with JS off it renders an empty `<pre>` | `:121` |
| CodeCoverage has **no** frontend tests pinning its DOM | `Coverage/ClientApp` |

**Backward compatibility is explicitly not required for this work** (user direction, 2026-08-11),
consistent with the workspace's standing preference for a clean API over shims.

## 6. Proposed API

### 6.1 Element

```ts
// content
code: string                       // unchanged; still the copy source of truth
language: string                   // '' = auto-detect

// rendering
lineNumbers: boolean               // attr `line-numbers`, default false
startLine: number                  // attr `start-line`, default 1
wrap: boolean                      // attr `wrap`, default false (horizontal scroll)
theme: 'auto' | 'light' | 'dark'   // attr `theme`, default 'auto'
copy: boolean                      // attr `copy`, default true — the copy button

// annotation (viewer mode)
annotations: CodeLineAnnotation[]  // property only
activeLine: number | null          // attr `active-line`
lineHref: ((line: number) => string) | null   // render-callback; produces real <a href>

// naming / localisation
copyLabel: string                  // unchanged, attr `copy-label`
label: string                      // attr `label` — names the code region
lineLabel: string                  // attr `line-label`, default 'Line ${line}'
```

```ts
export interface CodeLineAnnotation {
  line: number;                    // 1-based, matches the rendered gutter
  kind?: string;                   // -> class `annotation-<kind>`, themed via custom properties
  label?: string;                  // primary gutter label, e.g. '5×'
  secondaryLabel?: string;         // second gutter label, e.g. '3/4'
  description?: string;            // SR text + title, e.g. 'Branches: 3/4'
}
```

`annotations` is deliberately a **flat array keyed by line**, not a per-line map or a render
callback: CodeCoverage's data arrives as `LineCoverageInfo[]` + `BranchCoverageInfo[]` and most
lines carry no annotation at all, so a sparse array is the shape that already exists at both ends.

Events:

- `language-detected` — unchanged (`detail.language`).
- `line-activate` — `detail: { line: number }`, **cancelable**. Fires on click/Enter of a line
  anchor. A router-driven consumer calls `preventDefault()` and navigates itself; doing nothing
  lets the real `href` navigate. This is what makes CodeCoverage's `[routerLink]`-with-fragment
  behaviour expressible without the WC knowing what a router is.

`lineHref` renders a genuine `<a href>` so middle-click and open-in-new-tab work — a bare
`line-activate` event would silently break both.

### 6.2 Wrappers

| | Angular | React | Vue |
|---|---|---|---|
| code input | `[code]` (**renamed** from `codeToCopy`) | `code` | `:code` |
| annotations | `[annotations]` | `annotations` | `:annotations` |
| line activate | `(lineActivate)` | `onLineActivate` | `@line-activate` |
| language detected | `(detectedLanguage)` | `onLanguageDetected` (**new** `events` block) | `@language-detected` |
| host `aria-*` passthrough | **new** — forwarded to `<mp-code-snippet>` | `...rest` | `v-bind="$attrs"` (already) |

The Angular rename `codeToCopy` → `code` is mechanical across 332 call sites and removes a
gratuitous name divergence from the element it wraps.

## 7. Highlighting core — the actually-hard part

hljs emits one HTML string with nested `<span class="hljs-…">` that **cross newlines**. Per-line
rows each need their own `id`, background and gutter, so the markup must be split at every `\n`
and every open span re-opened on the next row. CodeCoverage has no prior art here — it never
built highlighting at all, which is precisely why the ask exists.

New pure module `code-snippet/src/core/split-lines.ts`:

```ts
export function splitHighlightedLines(html: string): string[]
```

Scanner, not a DOM parse. It walks the string tracking whether it is inside a tag, maintains a
stack of open `<span class="…">` tags, and at each `\n` found **outside** a tag closes the stack,
emits the row, and re-opens the stack on the next row.

This is safe on hljs output specifically, and the reasoning belongs in the code as a comment:
hljs emits only `<span class="…">` elements and HTML-escaped text, so a literal `\n` can never
occur inside a tag or inside an entity — the only place a newline appears is a text node. A
general HTML parser would be over-engineering, and a regex `split('\n')` would be wrong.

Pure, DOM-free, unit-tested under jsdom. Cases the spec must cover: a span opened on one line and
closed three lines later; nested spans across a break; `\r\n` normalized upstream; a trailing
newline not producing a phantom final row; empty lines; and source with `<`/`&` that must stay
escaped exactly once.

**Rendering is always row-based**, including for a plain two-line snippet. One render path, not
two. The copy button copies `this.code` — the raw string, never the DOM — so copy output is exact
regardless of gutters. Both gutter columns take `user-select: none` so a user's drag-select of the
source does not drag line numbers and hit counts with it.

## 8. Theming — `light-dark()` over an inherited `color-scheme`

**This deliberately reverses a documented decision.** The element's comment states the dark
background is fixed on purpose, so the snippet "renders dark-on-light-page like in an IDE"
(`mp-code-snippet.element.ts:34-40`). That was a defensible call for a demo site; it is the wrong
default for a component library whose consumers control their own page. We are changing it
knowingly, and `theme="dark"` preserves the old behaviour for anyone who wants it.

The workspace convention is explicit and documented in-tree: **inherited custom properties**,
never ancestor selectors, because Bootstrap's `[data-bs-theme="dark"] …` rules "can't match
across a shadow boundary" (`dropdown-menu/src/styles/dropdown-menu.styles.scss:5-12`, validated by
the `_spike-dropdown` spike; same reasoning at `accordion.styles.scss:100-104`).
`:host-context()` is used by **zero** web components here — the only two hits repo-wide are
legacy Angular stylesheets — and it is Chromium-only. Ruled out.

`prefers-color-scheme` is also ruled out, and measurably so: the demo resolves a tri-state
`auto`/`light`/`dark` preference to a **concrete** `data-bs-theme` on `<html>` before boot, and
`theme-toggle.spec.ts` asserts literal `light` even under `emulateMedia({colorScheme:'dark'})`.
Bootstrap 5.3's compiled CSS contains zero `prefers-color-scheme` occurrences. A media query
inside the shadow root would disagree with the page exactly when the user has expressed a
preference.

The mechanism that does work:

- Bootstrap 5.3.8 sets **`color-scheme: dark`** under `[data-bs-theme=dark]`
  (`bootstrap.css:129`) — attribute-driven, not media-driven.
- `color-scheme` is an **inherited CSS property**, so it crosses the shadow boundary with no help
  from us.
- Therefore CSS **`light-dark()`** inside the component's own stylesheet resolves against
  Bootstrap's theme — **zero JS, zero ancestor selectors, zero consumer wiring**.

**The subtlety that makes S1 mandatory:** Bootstrap sets `color-scheme` on the dark theme *only*.
On a light page the property is never set, so the host inherits the initial value `normal`. The
design depends on `light-dark()` treating `normal` as light — which the spec says it does, but
which must be measured, because if any engine instead falls back to `prefers-color-scheme` there,
a light Bootstrap page on a dark-OS machine renders a dark code block. That is the exact bug this
section exists to avoid, so it is the spike's primary assertion.

```scss
:host {
  color-scheme: light dark;                                   // theme="auto" (default)
  background: light-dark(#{$code-bg-light}, #{$code-bg-dark});
  color:      light-dark(#{$code-fg-light}, #{$code-fg-dark});
}
:host([theme='light']) { color-scheme: only light; }           // explicit override
:host([theme='dark'])  { color-scheme: only dark; }
```

The `theme` attribute works by *constraining `color-scheme` on the host*, so a single palette
definition serves all three values — the override needs no duplicate colour declarations.

Baseline support: Chrome 123+, Safari 17.5+, Firefox 120+. **This is spike-gated (S1)** — the
claim that an inherited `color-scheme` set outside a shadow root drives `light-dark()` inside it
must be measured in three engines before the styles are written. Fallback if S1 fails: a
`--mp-code-scheme` custom property set by `_bootstrap.scss` under each theme, plus the same
`theme` attribute — more wiring, same API.

Palettes: hljs's own **`a11y-dark`** (current, kept) and **`a11y-light`**
(`node_modules/highlight.js/styles/a11y-light.css`, `#fefefe` bg / `#545454` fg, same author, both
authored for contrast). The light palette is **not a mechanical transcription** — two measured
problems must be decided, not converted:

1. **In `a11y-light`, Yellow collapses onto Orange** — `.hljs-attribute` and `.hljs-number` are
   both `#aa5d00`. Light has one fewer distinguishable hue than dark, losing exactly the
   attr/number distinction the current dark port went out of its way to create.
2. **The port's two additions have no upstream light counterpart.** `.hljs-attr` (folded into
   Yellow, `:139`) and `.hljs-punctuation` (`#c8c8c2`, an entirely new group, `:144`) exist
   because "JSON would render as mostly white text" without them. `#c8c8c2` is a dark-background
   grey that will fail contrast on `#fefefe`, so the light value must be **chosen and
   contrast-checked**, not derived.

Contrast ratios were computed during M0/M3 and all 18 token/background pairs measure **≥ 4.5:1**
(WCAG AA for body text), lowest 4.51:1 (light blue). Chosen light values: yellow `#7c4a03` (kept
distinct from orange `#aa5d00`) and punctuation `#6a6a66` at 5.39:1.

**Annotation colours ship as CSS parts, not custom properties.** The PRD originally proposed
`--mp-code-annotation-<kind>-bg`, which does not work: `kind` is an opaque consumer string, so
neither the component's stylesheet nor the consumer's can name the property without the component
writing an inline style per row — banned by house convention, and unnecessary. Each row is
exposed as `part="annotation-<kind>"` instead, which is exactly the shadow-DOM styling channel:

```css
bs-code-snippet::part(annotation-uncovered) { background: rgba(220, 53, 69, 0.14); }
```

The component therefore ships **no** colour for any kind, keeping it genuinely coverage-agnostic.

## 9. highlight.js packaging

### 9.1 Lazy, per-language loading

A generated static loader map, following `flags/src/flag-loaders.generated.ts` exactly
(`Record<Key, () => Promise<T>>` with **static string literal** specifiers, emitted by a
`tools/scripts/` script, wired into `codegen-wc`, gitignored). CLAUDE.md's rule is absolute: a
computed `import()` specifier survives into the published `.mjs` and either hard-fails an esbuild
consumer or silently globs the whole directory into their bundle.

- `language` given (331/332 usages) → load `core` + that one grammar. **~9–15 KB gzip instead of
  53.7 KB.**
- `language` omitted → one lazy `() => import('highlight.js/lib/common')`. Auto-detect genuinely
  needs many grammars registered, and thin sets detect *confidently wrong* (measured: with only
  typescript registered, `highlightAuto('<div class="a">hi</div>')` returned `typescript`). The
  win is making the 53.7 KB lazy, not eliminating it — detection quality is unchanged.
- The map covers the 36 `lib/common` grammars, **not all 192**: 192 dynamic imports would emit
  192 chunks into every consumer's build for negligible benefit. `registerLanguage(name, fn)` is
  the escape hatch.

**The alias trap — this bites on day one.** Language ids and aliases are not the same set, and the
demos use aliases heavily: `language="tsx"` **51×** and `language="html"` **51×**. Measured:
registering `typescript` makes `getLanguage('tsx')` hit but `getLanguage('js')` **miss** — its
real aliases are `ts, tsx, mts, cts`; the `['js','jsx','mjs','cjs']` list visible in
`typescript.js:614` belongs to an inlined sub-definition that is never registered. `xml` is what
covers `html`. So the map must be **alias-aware and many-to-one**, the shape
`phone-core/src/metadata-loaders.generated.ts` already uses (many keys → one target). Aliases must
be read by registering each grammar against the real `lib/core` — a mocked API throws
`TypeError: hljs.COMMENT is not a function`.

**The silent-plaintext landmine.** `hljs.highlight()` with an unregistered language **throws**,
and today's code catches that and falls through to `highlightAuto` (`:204-208`). Under lazy
loading that catch turns a failed chunk load into silently unhighlighted output with no
diagnostic. The refactor must distinguish "unknown language id" (fall back, warn once) from
"chunk failed to load" (retry-able, warn) — mirroring `load-flag.ts`, which caches the **promise**
so concurrent callers share one fetch, evicts on rejection, and never rejects.

### 9.2 Async highlighting changes observable timing

`runHighlight()` is called synchronously from `willUpdate` (`:187-191`). Lazy makes it a promise,
which requires: a first-paint state that renders escaped plain text immediately and upgrades in
place (a block that flashes *empty* is worse than one that flashes *unstyled*); a per-key promise
cache; and out-of-order-resolution guarding. `language-detected` fires a tick later than today —
the aria spec and the Angular wrapper both currently assume one update cycle, so both need
updating.

### 9.3 The optional peer — decision

The research question was whether lazy loading makes the optional peer safe. **Measured answer:
no.** With hljs genuinely absent from `node_modules`, a bare specifier fails to resolve at
**build** time whether the import is static or dynamic, because the bundler must still emit the
chunk:

| variant | esbuild | rollup + node-resolve | vite build |
|---|---|---|---|
| static `import` (today) | ERROR | warn, external, OK | **FAILS** |
| `() => import(…)` | ERROR | warn, OK | **FAILS** |
| `() => import(…).catch(() => undefined)` | OK | — | **FAILS** |
| dynamic + consumer marks it external | OK | OK | OK |

(Webpack untested.) Deferring *execution* does not defer *resolution*.

**Decision: keep `highlight.js` an optional peer, and document it.** The `optional` flag is
accurate at the granularity that matters — the root barrel does not re-export code-snippet and
`./code-snippet` is its own subpath, so a consumer who never imports that subpath never names the
specifier and genuinely does not need the package. A consumer who *does* import it must install
it, which is ordinary opt-in-peer semantics. What is missing is not machinery but a sentence in
the README and a clear runtime error.

Rejected alternatives, recorded: promoting it to a hard `dependency` (forces the install on every
consumer, including the majority who never render code); and inverting to a consumer-supplied
highlighter callback so the package names no hljs specifier at all (genuinely solves it, but
pushes the whole highlighting decision onto every consumer — the opposite of pulling complexity
downwards, and it would make the zero-config case worse for the 332 in-repo usages). The callback
remains the right answer *if* a consumer ever needs a non-hljs highlighter; `registerLanguage`
is the smaller step in that direction.

### 9.4 Budget guard

`tools/scripts/check-code-snippet-bundle-size.mjs`, modelled on the existing
`check-ribbon-bundle-size.mjs`, pins the guarantee. Without it a single stray static import
silently restores the 53.7 KB and nothing fails.

## 10. Styles codegen

The user asked whether the HTML could be codegen'd alongside the SCSS. **It cannot, and should
not be attempted here.**

`tools/scripts/build-web-components.mjs` escapes `${` in `.element.html`
(`escapeForTemplateLiteral`, `:78-83`) and emits `export const template = html\`…\`` as a
**module-level constant, evaluated once at import time** (`:116-128`). There is no element
instance, no `this`, no parameters — bindings written in the HTML render as literal text. The
pattern serves fully static shadow structure only; `mp-card.element.html` is a comment-only stub
that exists purely to trigger compilation of its sibling SCSS. `mp-code-snippet`'s template is
almost entirely dynamic, so it keeps its inline `html\`\`` in `render()` — matching 14 of the 15
components that use the `.element.*` pattern.

The SCSS half proceeds as asked, using the **styles-only** pattern (carousel is the precedent):

```
code-snippet/src/styles/code-snippet.styles.scss   →  code-snippet.styles.ts  (generated)
code-snippet/src/styles/index.ts                   →  hand-written re-export
_styles/hljs-theme.styles.scss                     →  hljs-theme.styles.ts    (generated, SHARED)
```

The token→colour map lives in `_styles/` — the workspace's established sharing mechanism, whose
own comment notes that referencing one `CSSResult` means Lit attaches a **single underlying
`CSSStyleSheet`** to every shadow root that uses it. That is the user's "declare the code-block
styles once" goal, satisfied structurally rather than by convention. Multiple `.styles.scss` per
component is already supported and in use (navbar ships four).

Generated files are gitignored (`.gitignore:61-66`) and must never be staged. **Re-run
`npx nx run mintplayer-web-components:codegen-wc` after every SCSS edit or the change is
invisible.**

## 11. Accessibility

- The code region keeps `role="region"` + an accessible name, now settable via `label` rather
  than only derived from the detected language.
- **Line anchors use a roving tabindex** — one tab stop for the whole listing, arrow keys to move
  between lines, Enter to activate. A file view with a focusable anchor per line would otherwise
  put 2 000 tab stops in a keyboard user's path; that is a release blocker, not a refinement.
  The keymap is announced on entry via the live announcer and documented on the demo page.
- The gutter is presentational; annotation meaning reaches AT through an `aria-label` on the row
  built from `lineLabel` + `description` — never colour alone.
- `activeLine` is an orthogonal state that composes *over* the annotation background (an outline,
  not a background swap), matching what CodeCoverage draws today.
- `lineLabel` and `copyLabel` are localisable; the remaining hard-coded English strings
  (`Copied!`, `Copied to clipboard`, `… code sample`) are routed through the same mechanism —
  a translation gap the current element already has.
- The existing 12 aria tests must stay green: they pin `button.copy`, `[role="status"]`, `.toast`,
  the `${language}` substitution, the 3 000 ms toast expiry, and the coupling of visible button
  text to its accessible name. None of them touch `<pre>`/`<code>` internals, so the row-based
  re-render is compatible by construction.
- New states get their own assertions (roving focus, active line, annotated-line naming) per the
  repo's `*.aria.spec.ts` rule.

**No-JS tier: none, unchanged, and now declared.** The element renders an empty `<pre>` with JS
off. Adding an SSR chrome is out of scope; the class comment must state the tier explicitly, which
today it does not.

## 12. Consumer migration

**CodeCoverage** replaces its hand-rolled renderer
(`Coverage/ClientApp/src/app/pages/file/file.component.*`). The mapping is mechanical — its
`RenderedLine[]` becomes `CodeLineAnnotation[]` — provided this PRD's surface covers the eight
requirements its code actually has and the handoff under-specified:

1. two gutter labels + a per-line tooltip → `label`, `secondaryLabel`, `description`;
2. active line composing over the annotation background → `activeLine` as an outline;
3. anchors that preserve a `path` query param and change only the fragment → `lineHref`;
4. fragment-only re-scroll with no re-render, **including re-scrolling to the line already
   active** → `scrollToLine(n)` method, not only a reactive property;
5. empty-text mode (full gutter, no source) → annotations may name lines beyond `code`'s extent;
6. CRLF normalized before splitting → the element does it, not the consumer;
7. a no-annotation status that renders as an ordinary row → simply absent from `annotations`;
8. `hits: 0` must render → `label` is used when present, never when truthy.

Note CodeCoverage would take highlight.js as a **new dependency** — it is not installed there
today. That is a consumer-side cost worth stating plainly in the handoff reply.

**Demo apps**: `[codeToCopy]` → `[code]` across 332 usages, plus new demo sections for line
numbers, annotations and theming, with the keymap documented (live demo *before* the snippet, per
house convention).

## 13. Riders in this PR

1. **Purge `ngx-highlightjs`** — remove the root dependency (`package.json:51`), the
   `provideHighlightOptions` block (`app.config.ts:39-42`), the `HighlightModule` usage on
   `advanced/copy` (which sits on the same page as two normal `<bs-code-snippet>`), the duplicate
   `a11y-dark.scss` theme, and the stale prose claiming the component "uses ngx-highlightjs"
   (`code-snippet.component.html:5-7`). This is G4's other half: today the demo ships the full
   library *in addition to* the WC's copy.
2. **Wrapper gaps**: Angular host-attribute passthrough; React `events` block; React/Vue
   `./code-snippet` subpath exports.
3. **`bs-progress-bar` host class — REPORTED BUG IS NOT REAL.** Measured in jsdom against the
   lib's own vitest config: with `class="mt-3"` and `[striped]`, the host resolves to
   `mt-3 consumer-static bg-warning progress-bar progress-bar-striped`; `ngClass`, `[class.x]`,
   template `[class]` and imperative `classList.add` all survive, and a `color` change reconciles
   (`bg-warning` removed, consumer classes intact). Angular compiles `[class]` to `ɵɵclassMap`,
   which writes only the keys it owns through a precedence stack in which a consumer's static
   `class` sits **three tiers above** a component host binding. No fix is needed and none will be
   made. We add **one assertion** to `progress-bar.component.spec.ts` to pin the guarantee, and
   reply to the handoff correcting the claim.
   - Genuinely turned up by the same sweep, and **carried as follow-ups, not fixed here**:
     `button-type.directive.ts:8` binds host `[class]` to a **plain mutable field** written from
     an `effect()` (the failure mode CLAUDE.md documents — unverified, flagged as a lead), and two
     *directives* both binding host `[class]` on one element (`<div bsUserAgent [md]="6">`) is the
     one place clobbering is actually possible (probe inconclusive under jsdom).
4. **`bsShellTopbar` — does not exist, and neither does the TODO the handoff quotes** (zero hits
   repo-wide for `ShellTopbar` or `promote to` in that sense). `<div slot="topbar">` already works
   through the wrapper's `<ng-content>`; a directive would be the same five lines as
   `BsShellSidebarDirective` and buys only typo-safety. **Out of scope** — separate issue,
   needs its own demo coverage since the Angular demo never exercises the topbar slot.
5. **Sass `@use` migration — out of scope.** 140 active `@import`s across 25 files vs 5 `@use`
   (all `sass:` built-ins). The consumer-visible one is `_bootstrap.scss` (14 statements),
   shipped raw and evaluated by the *consumer's* Sass — which is why they see the warnings. But
   ~24 component stylesheets rely on `@import` leaking Bootstrap globals, so migration needs a
   `@use`-based config entry point. Its own PRD.

## 14. Risks & spikes

Spikes are cheap and the user has explicitly authorised as many as are useful. Five are gating.
**S1–S3 have been run; results below.**

| # | Spike / risk | Assertion | Result |
|---|---|---|---|
| **S1** | `light-dark()` over an inherited `color-scheme` | (a) dark page → dark block; (b) **light page while the OS prefers dark → light block** (the `color-scheme: normal` case Bootstrap leaves unset — primary assertion, §8); (c) `theme="light\|dark"` overrides both; (d) runtime ancestor flip repaints with no component JS | **PASS (Chromium)** — see §14.1 |
| **S2** | Line-splitting against **real** hljs output | Spans crossing many lines, nesting across a break, entities never double-escaped, empty lines, text round-trip | **PASS** — see §14.2 |
| **S3** | Alias extraction across **all 36** common grammars | Register each against real `lib/core`; `tsx`→typescript, `html`→xml, `js`→javascript | **PASS** — 36/36, 0 failures, 68 aliases → **104 map keys** |
| **S4** | Bundler resolution matrix, extended to **webpack** | The esbuild/rollup/vite matrix in §9.3 is measured; webpack is not. Decides whether the README's install note is sufficient |
| **S5** | Row-based rendering vs today's `<pre>` on real demo pages | Line-height, wrapping, horizontal scroll and drag-select-copy output must match or beat the current blob across the three demo apps |
| R6 | Async highlighting flashes on 332 demo snippets | Paint escaped plain text immediately, upgrade in place. §9.2 |
| R7 | e2e `dock-keyboard.spec.ts:84-104` reads the `.code` **property** off the inner element | `code` keeps its name; do not rename |
| R8 | Bundle regression from a stray static import | `check-code-snippet-bundle-size.mjs`, CI-enforced. §9.4 |
| R9 | 2 000 focusable line anchors destroy keyboard navigation | Roving tabindex, one tab stop. §11 |
| R10 | Lazy loading breaks the ng demo's global `hljs` stub (`test-setup.ts:19-31`) | Stub the loader map instead; update in the same milestone |
| R11 | Light palette loses the attr/number distinction and may fail contrast | Choose values and compute ratios; do not transcribe. §8 |

### 14.1 S1 result — PASS in Chromium; Firefox/WebKit deferred to CI

Spike page: `docs/prd/_spike-code-theme.html` (six probes, run under both
`prefers-color-scheme: dark` and `light`). Measured in Chromium via the Playwright MCP:

| probe | case | computed `color-scheme` | resolved | expected |
|---|---|---|---|---|
| p1 | `data-bs-theme=dark` ancestor | `dark` | dark | dark ✅ |
| **p2** | `data-bs-theme=light` (Bootstrap sets nothing) | **`normal`** | **light** | light ✅ |
| **p3** | no theme attribute at all | **`normal`** | **light** | light ✅ |
| p4 | `theme="light"` inside a dark page | `light only` | light | light ✅ |
| p5 | `theme="dark"` inside a light page | `dark only` | dark | dark ✅ |
| p6 | ancestor flipped to dark at runtime | `dark` | dark | dark ✅ |

**Identical results under `prefers-color-scheme: dark` and `light`** — which is the whole point:
p2/p3 stay light while the OS asks for dark, confirming `light-dark()` treats the initial
`normal` as light rather than consulting the media query. The mechanism is adopted as specified;
the `--mp-code-scheme` fallback is **not** needed.

**Not verified in Firefox or WebKit.** The locally installed engine builds predate the installed
Playwright driver (protocol mismatch on `newPage`), and downloading matching browsers was
declined. Residual risk is low — `light-dark()` is Baseline (Chrome 123+, Firefox 120+, Safari
17.5+), `color-scheme` inheritance is long-standing, and `normal`→light is spec-defined — but it
is **unmeasured in two of three engines**. Mitigation: M8 adds a theming assertion to the shared
e2e suite, which CI runs across all three engines, so the gap closes on the first CI run rather
than being carried as an assumption.

### 14.2 S2 result — PASS

The scanner in §7, run against real hljs 11.11.1 output. Every sample produced exactly one row
per source line, every row balanced, and `rows.map(stripTags).join('\n')` reproduced the source
byte-for-byte:

| sample | rows | balanced | text round-trip | had a span crossing a newline |
|---|---|---|---|---|
| typescript (multi-line block comment) | 7/7 | ✅ | ✅ | **yes** |
| json | 4/4 | ✅ | ✅ | no |
| xml (with `&amp;`) | 3/3 | ✅ | ✅ | no |
| csharp | 4/4 | ✅ | ✅ | no |
| markdown (embedded ts fence) | 7/7 | ✅ | ✅ | **yes** |

Plus: a 4-line block comment → 5 balanced rows, each carrying `hljs-comment`; entities escaped
exactly once (`&amp;`, never `&amp;amp;`); empty lines preserved as empty rows.

**Correction to the earlier research note:** `getLanguage('js')` misses only when *typescript
alone* is registered. `javascript` is itself one of the 36 common grammars, so with the full map
`js` resolves correctly. The alias handling is still required — `tsx`→typescript and `html`→xml
are real and load-bearing (51 usages each).

## 15. Decisions (resolved 2026-08-11)

1. **Line numbers on the demo site: ON for multi-line snippets, OFF for one-liners.** Applied as
   part of M8 rather than left to each page author, so the demo site reads consistently. A
   one-liner install command gains nothing from a `1` in its gutter; anything a reader might
   discuss line-by-line does.
2. **CodeCoverage ships highlight.js.** Confirmed acceptable, so the viewer targets the
   highlighted path as its primary design rather than treating unhighlighted rows as a co-equal
   mode. The plain-text render remains as the first-paint state (§9.2) and therefore still works
   as a graceful degradation if a chunk fails — it just isn't a supported configuration.
3. **No element rename** — see §4.3. Reopened with the breaking-API justification available and
   still declined, on the grounds that the two names are synonyms.

Remaining implementation choice, not a user question: the loader map covers the 36 `lib/common`
grammars **plus aliases**, with `registerLanguage` as the escape hatch — not all 192 (§9.1).
