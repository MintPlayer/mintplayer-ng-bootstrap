# Plan — `mp-carousel` web component migration (v2)

Companion PRD: `docs/prd/carousel-wc.md` (read it first; this file is the execution order).
Branch: `feat/carousel-wc` → targets `master`, squash-merge.

## Executive summary

Rebuild the carousel as `<mp-carousel>` (Lit) on a new two-piece `swiper-core`, with a
radio-driven interactive no-JS tier generated as DSD chrome, full APG ARIA, ng/react/vue
wrappers, demo pages and e2e in all three apps — and delete `@mintplayer/ng-swiper` (relocating
`observe-size` into `@mintplayer/ng-bootstrap`). Phase 0 is a hard spike gate on slide
projection / DSD handover; the PRD's architecture section is provisional until it passes.

## Problem statement

- **Current:** carousel = Angular-only component over `@mintplayer/ng-swiper`; two mutually
  exclusive templates (JS + `isServerSide` radio fork); no React/Vue support; zero e2e; noscript
  tier keyboard-dead and SSR-dependent; ng-swiper has no other swipe consumers.
- **Expected:** one Lit WC, one template, one index state (the checked radio), height contract
  preserved (horizontal/fade = current slide, vertical = max slide), interactive no-JS in the
  shadow, ARIA ≥ master, wrappers in all three frameworks, ng-swiper gone.

## Technical analysis — files to create / modify / delete

### Create

| Path | Content |
|---|---|
| `libs/mintplayer-web-components/swiper-core/{index.ts, src/index.ts}` | barrels (both required for Vite discovery) |
| `swiper-core/src/models/*.ts` | intents, host contracts, types (`offsetRatio`, keymap table) |
| `swiper-core/src/pointer-arbiter.ts` (+ `.spec.ts`) | salvaged input half of the old SwipeEngine (3px dominance lock, tap-vs-swipe, preventDefault protocol) |
| `swiper-core/src/index-machine.ts` (+ `.spec.ts`) | index/transition machine: wrap clamping inside, `offsetRatio` out, configurable duration, reduced-motion→0, `runAnimation` handle contract |
| `swiper-core/src/wheel-arbiter.d-notes.md` or interface stub | wheel arbiter **interface only** (implemented with fullpage) |
| `libs/mintplayer-web-components/carousel/{index.ts, src/index.ts}` | barrels |
| `carousel/src/components/{index.ts, mp-carousel.ts}` | the element |
| `carousel/src/styles/{index.ts, carousel.styles.scss}` | Bootstrap partials + hand-declared utilities (§SCSS below) |
| `carousel/src/types/{index.ts, carousel.ts}` | event details, mode/orientation types |
| `carousel/src/components/mp-carousel.aria.spec.ts` (+ behavior specs) | vitest |
| `carousel/ssr/{index.ts, inject-mp-carousel-dsd.ts}` | injector (counts light-DOM children, splices radios/labels/per-index rules — pending S2) |
| `tools/lit-ssr-utils/gen-carousel-chrome.mjs` | chrome generator (from built dist element) |
| `libs/mintplayer-ng-bootstrap/observe-size/{index.ts, ng-package.json, src/…}` | relocated `BsObserveSizeDirective` + `Size` + spec; selector/exportAs stay `bsObserveSize` |
| `libs/mintplayer-ng-bootstrap/carousel/src/carousel/…` | rewritten `bs-carousel` wrapper (attr-bridging; `afterNextRender` dynamic import) |
| `libs/mintplayer-react-bootstrap/carousel/{index.ts, src/index.ts, src/BsCarousel.tsx}` | `createComponent` + forwardRef facade |
| `libs/mintplayer-vue-bootstrap/carousel/{index.ts, src/index.ts, src/BsCarousel.vue}` | SFC wrapper |
| `apps/react-bootstrap-demo/src/app/pages/CarouselPage.tsx` | demo page (`section[data-demo]` hooks) |
| `apps/vue-bootstrap-demo/src/views/CarouselView.vue` | demo page |
| `apps/{ng,react,vue}-bootstrap-demo(-e2e)/…/carousel.spec.ts` + `carousel-nojs.spec.ts` | e2e (shared assertion factory) |
| `docs/prd/_spike-carousel-*` | throwaway spikes (deleted before merge) |

### Modify

| Path | Change |
|---|---|
| `libs/mintplayer-web-components/project.json` | add `codegen-carousel-chrome`; extend `codegen-ssr-chrome` dependsOn + echo string |
| `apps/ng-bootstrap-demo/server.ts` | compose `injectMpCarouselDsd` into the injector chain |
| `apps/react-bootstrap-demo/src/entry-server.tsx` | same |
| `apps/vue-bootstrap-demo/src/entry-server.ts` | same |
| `apps/ng-bootstrap-demo/src/app/pages/basic/carousel/*` | rewrite demo onto WC-backed `bs-carousel`; plain `<img>` children; add a second-carousel section (no-JS independence); update `dedent` snippets |
| `apps/ng-bootstrap-demo/src/app/app.component.html` | drop the swiper nav entry |
| `apps/react-bootstrap-demo/src/app/app.tsx` + `shell/AppShell.tsx` | route + `SECTIONS` entry |
| `apps/vue-bootstrap-demo/src/router/index.ts` + `app/App.vue` | route + `SECTIONS` entry |
| `libs/mintplayer-ng-bootstrap/priority-nav/**` + `sticky-footer/**` | import path → `@mintplayer/ng-bootstrap/observe-size` (4 sites incl. spec) |
| `tsconfig.base.json` | remove `@mintplayer/ng-swiper(/*)` mappings (lines ~47-52) |
| `libs/mintplayer-ng-bootstrap/package.json` | drop `@mintplayer/ng-swiper` peerDep; version bump |
| `libs/{mintplayer-web-components,mintplayer-react-bootstrap,mintplayer-vue-bootstrap}/package.json` | version bumps (all four in the final commit, navbar precedent) |
| `CLAUDE.md` | corrections: generated `*.styles.ts`/`*.element.template.ts` are gitignored, not committed; WC-side `ng-package.js` shims are inert |

### Delete

| Path | Reason |
|---|---|
| `libs/mintplayer-ng-swiper/` (entire lib) | dead once the carousel is a WC; npm-deprecate at release |
| `libs/mintplayer-ng-bootstrap/carousel/src/{carousel-image,carousel-img,carousel-play-pause}/` | slides are plain light DOM; fetchpriority + default play/pause move into the WC |
| legacy `carousel.component.{html,scss}` two-branch template + swiper-bound component body | replaced by the thin wrapper |
| `apps/ng-bootstrap-demo/src/app/pages/additional-samples/swiper/` + route | demos the deleted package |
| untracked ghosts `libs/mintplayer-web-components/{carousel,accordion,dropdown}/` | orphaned generated artifacts of the abandoned branch (read `carousel.styles.ts` once as reference, then remove) |

### SCSS inventory (utilities to hand-declare in `carousel.styles.scss`)

Bootstrap config partials + `bootstrap/scss/carousel` (only the rules actually used —
controls/indicators; the WC owns its own item/track rules). Reboot basics
(`box-sizing`, `:host { display: block }`). Utilities from master's templates that don't cross
the shadow boundary: `d-grid`, `d-none`→`visually-hidden` (clip pattern), `d-flex`, `flex-row`,
`flex-column`, `h-100`, `align-items-center`, `w-100`, `position-relative`, `cursor-pointer`,
`mx-auto`-equivalent (own `max-width: 500px; margin-inline: auto` — demos must not need inline
styles). Indicators: `flex: 0 0 auto` (Firefox shrink). PTR defence: `touch-action` per
orientation + `overscroll-behavior: contain` on track and viewport. No backticks in css
comments.

## Implementation plan

### Phase 0 — spikes (GATE; throwaway; Chromium + Firefox)

Build under `docs/prd/_spike-carousel-*`; each answers yes/no + notes; delete before merge;
update PRD §5/§8 with outcomes. **No Phase 1+ work until S1 and S2 have a verdict.**

- **S1 projection:** manual slot assignment (`slotAssignment:'manual'` + `slot.assign()`) vs
  `slot="sN"` stamping; slide add/remove; `animation`/`orientation` hot-swap.
- **S2 DSD handover:** default-slot chrome with radios → upgrade to per-slide cells; no
  flash/duplication under (a) Angular non-hydrating path, (b) `lit-element-hydrate-support`
  (React/Vue shim); injector count-splicing vs pre-rendered count variants.
- **S3 wrap clones:** duplicate slot projection vs reorder-on-commit (no `cloneNode`).
- **S4 no-JS slide translate:** per-index `:checked → transform` rules, both orientations;
  fallback = crossfade for all modes (master parity).

**Gate review with the user: spike outcomes + any PRD architecture amendments before Phase 1.**

### Phase 1 — swiper-core

Models + pointer arbiter (port input half + spec from the old branch — `git show
origin/feat/carousel-web-component:libs/mintplayer-web-components/swiper-core/...` as reference,
salvage input logic only) + index machine (new: wrap inside, `offsetRatio`, duration config,
reduced-motion, keymap table) + wheel-arbiter interface stub. All vitest-covered before any DOM
work. Commit.

### Phase 2 — `mp-carousel` (JS path)

Element + styles per PRD §5.1–5.3 using the S1/S3 mechanism: per-slide cells, transform track,
grid-stack fade, one ResizeObserver over slotted slides, the two height custom properties,
autoplay/pause (single write path + `emit` flag), keyboard via the machine's keymap, full ARIA
(§7), `fetchpriority` stamping, `play-pause` slot with default button, engine re-init on
reconnect. vitest specs re-expressing master's contract (ARIA matrix, play/pause, aria-live) +
new height tests. `codegen-wc` after every SCSS edit. Commit per coherent slice.

### Phase 3 — no-JS tier + SSR

Radio machine in `render()` per PRD §5.4 (visually-hidden radios first among shadow siblings,
single indicator strip, modulo prev/next labels, `data-js` takeover, index read back from
`:checked`); `gen-carousel-chrome.mjs` + `codegen-carousel-chrome` target + aggregate wiring;
injector with hardened regex (no `[^>]*` breaking on `>` in attribute values) + child counting
per S2 verdict; compose into the three SSR entries. Verify by curling the SSR output of all
three demos with JS off.

### Phase 4 — wrappers + relocation + deletion

`observe-size` relocation (new entry, 4 import-site rewrites) → Angular wrapper rewrite (reclaim
`bs-carousel`, delete the three directives + template fork) → React + Vue wrappers → delete
`libs/mintplayer-ng-swiper` + tsconfig/peerDep references → delete the swiper demo page. Full
workspace build must be green at the end of this phase (`nx build` all four libs + three demos).

### Phase 5 — demos, e2e, docs

Demo pages in all three apps (demo-before-snippet; ng page keeps the mode/orientation selects —
the hot-swap stress case — and gains the two-carousel no-JS section; React `data-demo` sections;
Vue positional sections). e2e: `carousel.spec.ts` + `carousel-nojs.spec.ts` × 3 apps via a
shared assertion factory (readiness = deterministic shadow predicate, not `networkidle`; "click,
never focus"; no-JS assertions locator/native-state-based only). CLAUDE.md corrections. Final
version bumps. PRD status flipped to "as built" with spike outcomes recorded.

## Test scenarios

1. Four `animation`×`orientation` combos hot-swapped on one live instance (JS).
2. Height: horizontal/fade tracks current slide (incl. after image late-load); vertical pins to
   max and **can shrink** when the tallest slide is removed (anti-ratchet regression).
3. Touch swipe commits ≥ threshold, snaps back below it; interrupting mid-animation is clean.
4. Keyboard: orientation-aware arrows, Home/End; off-axis arrows scroll the page (no
   preventDefault); `keyboard-events=false` disables all and drops `aria-keyshortcuts`.
5. `wrap="false"` blocks buttons **and** keyboard **and** swipe at the edges (old branch bug).
6. Autoplay: rotates at `interval`; pauses via button (`aria-pressed`), `paused` attr, and
   `prefers-reduced-motion`; `aria-live` matrix (`off` rotating / `polite` otherwise).
7. ARIA tree: region/roledescription/label; per-slide group + "N of M"; clones hidden.
8. No-JS (per app): DSD attached; indicator + prev/next labels flip radios (`toBeChecked`),
   wrap-around at the ends; radiogroup arrow keys change slides; fade crossfades; slide
   translates (or documented S4 fallback); two carousels on one page independent.
9. Hydration/upgrade: no duplicated chrome after upgrade (React hydration spec pattern);
   no flash between DSD and upgraded render.
10. `slide-change` fires once per user navigation; `paused-change` only on user intent.
11. priority-nav + sticky-footer still green against relocated `observe-size`.
12. **Nested carousel** (horizontal `mp-carousel` slide inside a vertical one): inner claims
    horizontal strokes (direction lock + stopPropagation), vertical strokes bubble to the outer;
    inner arrow keys don't drive the outer (keydown-target guard); no-JS radio groups stay
    independent (shadow scoping). Demo section + e2e.

## Acceptance criteria

- [ ] Spikes S1–S4 concluded, PRD updated, gate review passed.
- [ ] All Phase 5 e2e green on Chromium + Firefox (+ WebKit where configured) in all three apps.
- [ ] vitest: swiper-core + mp-carousel suites green; master's ARIA/play-pause contract
      re-expressed and passing.
- [ ] `nx build` green: mintplayer-web-components, -ng-bootstrap, -react-bootstrap,
      -vue-bootstrap + all three demo builds (SSR included).
- [ ] No `@mintplayer/ng-swiper` reference anywhere in the workspace; observe-size consumers
      migrated.
- [ ] Code-duplication table (PRD §5.6) holds: one authored location per concern.
- [ ] Demo pages need no inline styles to center/size the carousel.
- [ ] npm deprecation message for `@mintplayer/ng-swiper` drafted (executed at release).

## Build & test commands

```bash
npx nx run mintplayer-web-components:codegen-wc        # after any .styles.scss edit
npx nx build mintplayer-web-components                 # runs codegen-wc + cem
npx nx run mintplayer-web-components:codegen-ssr-chrome
npx nx test mintplayer-web-components -- --pool=threads
npx nx build mintplayer-ng-bootstrap
npx nx build mintplayer-react-bootstrap && npx nx build mintplayer-vue-bootstrap
npx nx e2e ng-bootstrap-demo-e2e && npx nx e2e react-bootstrap-demo-e2e && npx nx e2e vue-bootstrap-demo-e2e
# Windows flakiness: NX_ISOLATE_PLUGINS=false NX_DAEMON=false
```

## Related files (read before coding)

- Old branch reference (do **not** cherry-pick wholesale):
  `git show origin/feat/carousel-web-component:libs/mintplayer-web-components/swiper-core/src/swipe-engine.ts`
  (+ spec, + `carousel/src/components/mp-carousel.ts` for the list of mistakes).
- Patterns on master: `libs/mintplayer-web-components/navbar/**` (chrome codegen, injector,
  `data-js`, `MpNavbarElement` DSD handoff base), `shell/**` (CSS lever + read-back),
  `tools/lit-ssr-utils/gen-navbar-chrome.mjs`.
- Legacy source of truth: `libs/mintplayer-ng-bootstrap/carousel/**`,
  `libs/mintplayer-ng-swiper/**` (esp. `swipe-container.directive.ts:153-178` — the height
  contract; `swipe.directive.ts` — PTR listener rationale; the noscript branch of
  `carousel.component.html:1-43` + `carousel.component.scss:20-64`).
