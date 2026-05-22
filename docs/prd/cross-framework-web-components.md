# PRD: Cross-framework web components — extract `@mintplayer/web-components`, add React + Vue wrappers

## Problem

This workspace currently houses 41 Lit-based web components under `libs/mintplayer-ng-bootstrap/**/web-components/`, every one of them paired with an Angular wrapper directive/component in a sibling folder. They are reachable from Angular hosts through `@mintplayer/ng-bootstrap`, but **only from Angular hosts**.

The user wants the same WCs consumable from React and Vue applications, each with idiomatic typed wrappers (autocomplete on props, native event names, `v-model` on inputs, etc.), without forking the WC source. To make that real, the WC source has to leave `libs/mintplayer-ng-bootstrap/` — an Angular-flavoured ng-packagr project — and live in a **framework-agnostic TypeScript library** that all three wrapper libs (Angular / React / Vue) depend on.

### Reversal of a prior decision

`docs/prd/wc-libs-as-ng-bootstrap-sub-entrypoints.md` (landed earlier this year) consolidated four standalone `-wc` libs *into* `@mintplayer/ng-bootstrap` as sub-entrypoints, on the explicit premise that "this workspace targets Angular only." That premise no longer holds: the user is now adding React + Vue demo apps and wrapper libraries to this workspace. The architectural call flips — what was the right answer under an Angular-only constraint is the wrong answer once cross-framework consumers exist. This PRD reopens the WC-extraction question with the new constraint in hand.

The three stub libs left over from that consolidation (`libs/mp-scheduler-wc/`, `libs/mp-splitter-wc/`, `libs/mp-tab-control-wc/` — each containing only an auto-generated `*.styles.ts` file) are orphaned scaffolding and get removed by this work.

## Goals

1. **A new framework-agnostic library `libs/mintplayer-web-components/`** published as `@mintplayer/web-components`. Contains every Lit WC class currently in either of the two existing locations:
   - **Layout A** — `libs/mintplayer-ng-bootstrap/<feature>/src/lib/web-components/*.element.ts` (the older `.element.ts` pattern): calendar, card (10), datepicker, datetime-picker, dock, multi-range, otp-input, query-builder (4), ribbon (~18), tile-manager, timepicker (2). ~40 element files.
   - **Layout B** — `libs/mintplayer-ng-bootstrap/web-components/<entry>/src/components/*.ts` (the newer consolidated pattern landed by the prior PRD): checkbox, datatable, file-manager, pagination, radio, scheduler, splitter, tab-control (2), toggle-button, treeview, plus helper libs a11y, overlay, scheduler-core. ~10 element files + 3 helper libs.

   The new lib unifies both into a single layout. Zero Angular / React / Vue imports.

2. **~25 logical sub-entrypoints** (one per component family — `card`, `ribbon`, `scheduler`, `dock`, `tile-manager`, `query-builder`, `tab-control`, `timepicker`, `checkbox`, `radio`, `datatable`, `file-manager`, `pagination`, `treeview`, `toggle-button`, `code-snippet`, `calendar`, `datepicker`, `datetime-picker`, `multi-range`, `otp-input`, `splitter`, plus helper entries `a11y`, `overlay`, `scheduler-core`). Each sub-entrypoint exports its element classes and side-effect-registers them. Consumers get tree-shaking by importing the entry they need (`@mintplayer/web-components/ribbon`). Exact final count confirmed by a Phase-1 walk.
3. **`@mintplayer/ng-bootstrap` keeps its current public API** but its Angular wrappers import the WC classes from `@mintplayer/web-components/<entry>` instead of from sibling `./web-components/` folders. ng-bootstrap stops bundling the WC source — it becomes a thin Angular adapter layer over the shared WC lib.
4. **A new `@mintplayer/react-bootstrap` library** at `libs/mintplayer-react-bootstrap/` (Nx React lib, Vite bundler, publishable). One hand-written typed React wrapper per WC, using `@lit/react`'s `createComponent`. Authored the same way ng-bootstrap's Angular wrappers are authored — by hand, checked into source, no codegen.
5. **A new `@mintplayer/vue-bootstrap` library** at `libs/mintplayer-vue-bootstrap/` (Nx Vue lib, Vite bundler, publishable). One hand-written Vue 3.5 SFC adapter per WC, exposing typed props via `defineProps`, re-emitting events with camelCase names, and bridging input WCs to `defineModel()` so `v-model` works natively.
6. **A new `apps/react-bootstrap-demo/`** mirroring every WC-backed route from `apps/ng-bootstrap-demo/` (the Angular-only routes — reactive forms, scrollspy, parallax, etc. — stay Angular-only).
7. **A new `apps/vue-bootstrap-demo/`** with the same route coverage as the React demo.
8. **Cross-framework navigation across all three demos.** Each demo's shell shows three brand-mark links (Angular shield, React atom, Vue triangle) pointing at the other two framework demos by name. Same look-and-feel across all three.
9. **`<bs-code-snippet>` migrated to a WC.** Currently a pure-Angular `code-snippet.component.ts` at `libs/mintplayer-ng-bootstrap/code-snippet/`. Becomes a new WC `<mp-code-snippet>` in `libs/mintplayer-web-components/code-snippet/`, consumed by all three demos so each can render its own framework-flavoured source code in a uniform UI.
10. **`codegen-wc` target moves** from `libs/mintplayer-ng-bootstrap/project.json` to `libs/mintplayer-web-components/project.json`. `mintplayer-ng-bootstrap`'s `build` target's `dependsOn` collapses from `["^build", "codegen-wc"]` to `["^build"]`, because the WC lib is now an upstream `^build` dependency.
11. **The three stub `-wc` libraries** (`libs/mp-scheduler-wc/`, `libs/mp-splitter-wc/`, `libs/mp-tab-control-wc/`) and their project.json / package.json / tsconfig entries are removed — confirmed: they each contain only an auto-generated `src/styles/*.styles.ts` file, no real source. Their `*.styles.ts` outputs are no longer needed (the consolidated codegen-wc target in the new lib emits styles next to each WC source).
12. **`tsconfig.base.json` path mappings** updated to expose `@mintplayer/web-components` and `@mintplayer/web-components/*`, plus the two new wrapper packages. Old `@mintplayer/scheduler-wc`, `@mintplayer/splitter`, `@mintplayer/tab-control-wc` entries dropped.
13. **`docker-compose.yml` extended** to serve `react-bootstrap-demo` and `vue-bootstrap-demo` alongside the existing Angular demo + ASP.NET Core API, behind Traefik at `react.bootstrap.mintplayer.com` and `vue.bootstrap.mintplayer.com`.
14. **All file moves use `git mv`** so `git log --follow` and `git blame` keep working across the relocation.

### Non-goals

- **No runtime API change to any existing WC.** Tag names, attributes, properties, events, ARIA semantics, keyboard contracts — all unchanged for the ~49 existing WCs. Only the source location and the npm publish identity changes.
- **No deprecation of the current `@mintplayer/ng-bootstrap` public API.** Every existing Angular import (`@mintplayer/ng-bootstrap/card`, `@mintplayer/ng-bootstrap/ribbon`, etc.) keeps resolving to the same wrappers. Internally the wrappers' imports change; externally consumers see nothing.
- **No new WCs other than `<mp-code-snippet>`.** The code-snippet migration converts an existing Angular-only component to a WC; this is not net-new functionality, it's a relocation needed for cross-framework demo parity. All other WC additions are out of scope.
- **No SSR-strategy changes.** Whatever SSR posture each WC has today (Lit + ngc compatibility) carries forward unchanged.
- **No backward-compatibility shims for the orphan `-wc` package names on npm.** The previously-published `@mintplayer/scheduler-wc`, `@mintplayer/splitter`, `@mintplayer/tab-control-wc`, `@mintplayer/scheduler-core` packages stay at their last-published versions on npm. New versions only ship under the new names. Per `feedback_breaking_changes_ok` — BC is not a default constraint.
- **The React/Vue demos do not need to cover Angular-specific routes.** Reactive forms, CDK drag-drop, Angular Router-specific behaviours, etc. stay in `ng-bootstrap-demo` only.
- **No codegen of framework wrappers from a Custom Elements Manifest.** Earlier draft floated this; user preference is to author wrappers the same way the existing Angular wrappers are authored — by hand, one wrapper file per WC, checked into source.

## Current state

The repo is **bifurcated** today — WC source lives in two different patterns depending on which PRD touched it last. Any consolidation has to handle both.

### Layout A — older `*.element.ts` files under feature folders

| Feature folder | WC files | Notes |
|---|---|---|
| `libs/mintplayer-ng-bootstrap/calendar/src/lib/web-components/` | `mp-calendar.element.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/card/src/lib/web-components/` | `mp-card.element.ts` + 9 part components (body, header, footer, title, subtitle, text, img, link, group) | 10 elements |
| `libs/mintplayer-ng-bootstrap/datepicker/src/lib/web-components/` | `mp-datepicker.element.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/datetime-picker/src/lib/web-components/` | `mp-datetime-picker.element.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/` | `mint-dock-manager.element.ts` | 1 element (~3985 LoC) |
| `libs/mintplayer-ng-bootstrap/multi-range/src/lib/web-components/` | `mint-multi-range.element.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/otp-input/src/lib/web-components/` | `mint-otp-input.element.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/query-builder/src/lib/web-components/` | 4 elements (builder, condition, group, subquery) | 4 elements |
| `libs/mintplayer-ng-bootstrap/ribbon/src/lib/web-components/` | 5 main + 13 items under `items/` | ~18 elements |
| `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/web-components/` | `mint-tile-manager.element.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/timepicker/src/lib/web-components/` | `mp-timepicker.element.ts`, `mp-time-list.element.ts` | 2 elements |

**Layout A total: ~40 element classes.** Each `.element.ts` has sibling `.element.html` + `.element.scss` that the `codegen-wc` script compiles into `.element.template.ts` (Lit `html` + `unsafeCSS()`).

### Layout B — newer consolidated sub-entrypoints under `web-components/`

| Sub-entrypoint | WC files | Notes |
|---|---|---|
| `libs/mintplayer-ng-bootstrap/web-components/a11y/` | (helper lib — live-announcer, no WC) | Library code consumed by other WCs |
| `libs/mintplayer-ng-bootstrap/web-components/checkbox/src/components/` | `mp-checkbox.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/web-components/datatable/src/components/` | `mp-datatable.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/web-components/file-manager/src/components/` | `mp-file-manager.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/web-components/overlay/` | (helper lib — overlay primitives, no WC) | Library code |
| `libs/mintplayer-ng-bootstrap/web-components/pagination/src/components/` | `mp-pagination.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/web-components/radio/src/components/` | `mp-radio.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/web-components/scheduler/src/components/` | `mp-scheduler.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/web-components/scheduler-core/` | (helper lib — services, models, utils consumed by mp-scheduler) | Library code |
| `libs/mintplayer-ng-bootstrap/web-components/splitter/src/components/` | `mp-splitter.ts` | 1 element |
| `libs/mintplayer-ng-bootstrap/web-components/tab-control/src/components/` | `mp-tab-control.ts`, `mp-tab-page.ts` | 2 elements |
| `libs/mintplayer-ng-bootstrap/web-components/toggle-button/` | (verify during Phase 1 — entry exists, WC count to confirm) | |
| `libs/mintplayer-ng-bootstrap/web-components/treeview/` | (verify during Phase 1 — entry exists, WC count to confirm) | |

**Layout B total: ~10 element classes + 3 helper libs.** Each folder already has `index.ts` + `ng-package.js` + `src/` — sub-entrypoint shape per the prior PRD.

### Combined inventory

**~49 element classes + 3 helper libs**, currently spanning 22 source folders across the two layouts. The migration consolidates these into one location with one layout convention.

### Targets, scripts, and stubs

| File / target | Role |
|---|---|
| `libs/mintplayer-ng-bootstrap/project.json:9-24` | `codegen-wc` target — `node tools/scripts/build-web-components.mjs libs/mintplayer-ng-bootstrap` |
| `libs/mintplayer-ng-bootstrap/project.json:25-54` | `build` target — `@nx/angular:package`; `dependsOn: ["^build", "codegen-wc"]` |
| `tools/scripts/build-web-components.mjs` | libRoot-parameterised codegen script. Already accepts multiple roots. Hard-codes only its own location relative to `repoRoot`. Walks `**/*.element.html` + `**/*.styles.scss`. Embeds compiled CSS via `unsafeCSS()`. Idempotent. |
| `libs/mp-scheduler-wc/`, `libs/mp-splitter-wc/`, `libs/mp-tab-control-wc/` | **Confirmed empty stubs.** Each contains only an auto-generated `src/styles/*.styles.ts` file. No real source. Three orphan project.json + package.json + tsconfig sets. |
| `libs/mintplayer-ng-bootstrap/code-snippet/src/code-snippet.component.{ts,html,scss}` | Pure Angular component today. No WC backing. In scope for migration to `<mp-code-snippet>`. |
| `libs/mintplayer-ng-bootstrap/package.json` | `name: "@mintplayer/ng-bootstrap"`. Peer-dep set includes Angular 21, RxJS, Bootstrap 5.3, Lit 3.3, `@lit/context`. `exports` field only exposes `./bootstrap.scss`. Sub-entrypoints discovered by ng-packagr's `**/ng-package.json` glob. |
| `libs/mintplayer-ng-bootstrap/ng-package.json` | Primary entrypoint config (`dest: "../../dist/libs/mintplayer-ng-bootstrap"`, `entryFile: src/index.ts`). |
| `libs/mintplayer-ng-bootstrap/ng-package.secondary.cjs` | Shared sub-entrypoint config (Sass loadPaths, Bootstrap deprecation silencing). |
| `tsconfig.base.json:22-23` | `@mintplayer/ng-bootstrap` + `@mintplayer/ng-bootstrap/*` path mappings. |
| `apps/ng-bootstrap-demo/src/app/pages/enterprise/enterprise.routes.ts` | 9 Enterprise-section routes (datatables, file-manager, scheduler, dock, tile-manager, ribbon, query-builder, otp-input, plus shell). |
| `apps/ng-bootstrap-demo/src/app/pages/{basic,advanced,overlays,...}` | ~80 demo routes total. The WC-backed subset spans every section — card, calendar, datepicker, timepicker, splitter, tab-control, multi-range, query-builder, plus all 9 Enterprise routes. |
| `docker-compose.yml` | Hosts ASP.NET Core API + Angular demo behind Traefik. Extension target for the React + Vue demos (Goal 13). |
| `.github/workflows/publish-master.yml` | Currently has a single publish step for `@mintplayer/ng-bootstrap`; the three stub-lib publish steps from before the consolidation are already gone. |

No standalone `mp-scheduler-core` package remains; it lives at `libs/mintplayer-ng-bootstrap/web-components/scheduler-core/` (helper lib for mp-scheduler).

## Architectural decisions and trade-offs

### Decision 1 — Package name and lib path

**Recommendation: `@mintplayer/web-components` at `libs/mintplayer-web-components/`.** Confirmed by the user; the alternatives (`@mintplayer/bootstrap-wc`, `@mintplayer/wc`) are explicit non-choices.

Rationale: most explicit, leaves room to host non-Bootstrap-themed WCs later under the same scope, and `bootstrap` already lives in the wrapper package names (`@mintplayer/ng-bootstrap`, `@mintplayer/react-bootstrap`, `@mintplayer/vue-bootstrap`) which is where the styling commitment belongs.

### Decision 2 — Sub-entrypoint granularity (~18 entries, per logical group)

**Recommendation: one sub-entrypoint per logical component family**, mirroring how ng-bootstrap already groups things. Concretely (verify exact list during Phase 1 — counts are inventory-derived):

```text
libs/mintplayer-web-components/
├── calendar/             (mp-calendar)
├── card/                 (mp-card, mp-card-body, mp-card-header, mp-card-footer,
│                          mp-card-title, mp-card-subtitle, mp-card-text,
│                          mp-card-img, mp-card-link, mp-card-group)
├── datepicker/           (mp-datepicker)
├── datetime-picker/      (mp-datetime-picker)
├── dock/                 (mint-dock-manager, mint-tile-manager)
├── multi-range/          (mint-multi-range)
├── otp-input/            (mint-otp-input)
├── query-builder/        (mp-query-builder, mp-query-condition, mp-query-group,
│                          mp-query-subquery)
├── ribbon/               (mp-ribbon + mp-ribbon-tab + mp-ribbon-group +
│                          mp-ribbon-contextual-tab-set + mp-quick-access-toolbar +
│                          13 ribbon items)
├── scheduler/            (mp-scheduler)
├── splitter/             (mp-splitter)
├── tab-control/          (mp-tab-control, mp-tab-page)
├── timepicker/           (mp-timepicker, mp-time-list)
└── … (~5 more from the inventory's "etc." tail —
     pagination/datatable/checkbox/radio/file-manager/overlay/a11y —
     to be confirmed during Phase 1 walk)
```

Each sub-entrypoint folder contains:

```text
libs/mintplayer-web-components/<entry>/
├── package.json          # { "name": "@mintplayer/web-components/<entry>",
│                            "main": "./dist/index.cjs.js",
│                            "module": "./dist/index.esm.js",
│                            "types": "./dist/index.d.ts",
│                            "sideEffects": true }
├── src/
│   ├── index.ts          # re-exports + customElements.define() side-effects
│   ├── <component>.element.ts
│   ├── <component>.element.html        # source for codegen
│   ├── <component>.element.scss        # source for codegen
│   ├── <component>.element.template.ts # AUTO-GENERATED
│   └── (state managers, helpers — internal)
```

**Why per-group over per-class (41 entries):** card has 10 elements that are useless individually (a `<mp-card-body>` outside a `<mp-card>` is meaningless); ribbon has 18 elements that ship together. Forcing 41 separate entry points triples the boilerplate (package.json + index.ts per entry) and produces an `exports` map dominated by paths nobody will type. Per-group keeps tree-shaking working (each element file is still a separate ESM module within the entry, so unused element files drop) while keeping the public surface small.

**Why per-group over single entry:** the dock + scheduler + ribbon each pull in tens of KB of compiled CSS; a single root entry forces every consumer to pay for every element's styles even if they only use `<mp-card>`. The group boundary is the natural granularity for tree-shaking.

`sideEffects: true` on each sub-entrypoint's `package.json` is **required** — every `*.element.ts` calls `customElements.define()` at module load, and bundlers will drop those calls under `sideEffects: false`. (Alternative: a `sideEffects` array listing element files explicitly, more precise tree-shaking but more maintenance.)

### Decision 3 — Build tooling for the WC lib

**Recommendation: `@nx/vite:build` in library mode with multi-entry config**, generated via `nx g @nx/js:library libs/mintplayer-web-components --bundler=vite --publishable --importPath=@mintplayer/web-components`.

ng-packagr is Angular-specific and not appropriate for a framework-agnostic Lit lib. The pure-TS options are:
- `@nx/js:tsc` — what the legacy `-wc` libs used. Outputs unbundled per-file `.js` + `.d.ts`. No bundling, no per-entry packaging. Works but requires hand-maintaining `package.json` exports map for every entry.
- `@nx/vite:build` in library mode — bundles per entry, generates `.d.ts` via vite-plugin-dts, emits both ESM and CJS. Multi-entry config sets `build.lib.entry` to a map of entry name → source file.
- `@nx/rollup:rollup` — what `@nx/react:library --publishable` historically defaulted to. Still works but Nx documentation points new libraries at Vite since Nx 19.

Vite wins: it's already the recommended bundler for the React/Vue libs, keeping one bundler across all three wrapper libs + the WC lib means one mental model. The `vite.config.ts` for the WC lib explicitly lists every sub-entrypoint as a library entry:

```ts
build: {
  lib: {
    entry: {
      'card/index': resolve(__dirname, 'card/src/index.ts'),
      'ribbon/index': resolve(__dirname, 'ribbon/src/index.ts'),
      'scheduler/index': resolve(__dirname, 'scheduler/src/index.ts'),
      // … one per sub-entrypoint
    },
    formats: ['es', 'cjs'],
  },
  rollupOptions: {
    external: ['lit', '@lit/context', 'tslib'],
  },
}
```

The root `package.json`'s `exports` field maps each entry to its built output:

```json
{
  "name": "@mintplayer/web-components",
  "exports": {
    "./card": { "import": "./dist/card/index.mjs", "require": "./dist/card/index.cjs", "types": "./dist/card/index.d.ts" },
    "./ribbon": { "import": "./dist/ribbon/index.mjs", ... },
    "./scheduler": { ... }
  },
  "sideEffects": true,
  "peerDependencies": { "lit": "^3.3.0", "@lit/context": "..." }
}
```

Verify Vite emits the right structure during the Phase 1 smoke build before committing to per-entry `package.json` files.

### Decision 4 — codegen-wc relocation

**Recommendation: move the `codegen-wc` target verbatim** from `libs/mintplayer-ng-bootstrap/project.json` to `libs/mintplayer-web-components/project.json`. The script is already libRoot-parameterised (`node tools/scripts/build-web-components.mjs libs/mintplayer-web-components`).

`mintplayer-ng-bootstrap`'s build target's `dependsOn` becomes `["^build"]` — codegen-wc no longer runs against ng-bootstrap because no `*.element.ts` files live there anymore.

`mintplayer-web-components`'s build target's `dependsOn` becomes `["codegen-wc"]` — the WC lib needs codegen to run before Vite bundles, because Vite's entry points import the generated `*.element.template.ts` files.

The Nx project graph after these moves:

```
mintplayer-web-components:codegen-wc
   ↓
mintplayer-web-components:build
   ↓                    ↓                    ↓
ng-bootstrap:build  react-bootstrap:build  vue-bootstrap:build
   ↓                    ↓                    ↓
ng-bootstrap-demo:  react-bootstrap-demo:  vue-bootstrap-demo:
   build                build                  build
```

No SCSS or codegen complications: the script walks `<libRoot>/**/*.element.html` + `<libRoot>/**/*.styles.scss`, so the new directory structure is invisible to it.

### Decision 5 — React wrapper strategy

**Recommendation: hand-written wrappers, one `.tsx` file per WC**, following the same authoring pattern `@mintplayer/ng-bootstrap` uses for its Angular wrappers — each wrapper is normal source code, written and maintained by hand, no codegen step. Use `@lit/react`'s `createComponent` as the typed-wrapper helper inside each file.

Why `createComponent` (the helper, not a generator):
- React 19's native custom-element support (props vs attributes, event-listener attachment) works for *consuming* a WC in JSX, but TypeScript doesn't know `<mp-card>` from any other element — no type checking, no autocomplete on props, no typed event detail.
- `createComponent` returns a typed `React.FC` that surfaces the WC's `@property` declarations with full autocomplete and reflects `EventName<CustomEvent<MyDetail>>` event names as camelCase `onMyEvent` handlers.
- It's a runtime utility from `@lit/react`, not a build-time codegen — same as how `bs-button` is a hand-written Angular component that uses the `@Input()` decorator from `@angular/core`.

Why hand-write instead of generating from a Custom Elements Manifest:
- The Angular wrappers in `@mintplayer/ng-bootstrap` are already hand-written; the React wrappers should match that maintenance model. One authoring style across all three wrapper libs is easier to teach and review than "Angular: hand, React/Vue: generated."
- Generated wrappers either ship at-publish (diff-less, surprises consumers) or check-in stale (the whole point of codegen evaporates the moment you have to edit the output by hand).
- Per the user's response on this PRD's open questions: "the framework-transformation to the web-components should probably happen the same way the angular library does."

The React lib structure mirrors the WC lib's sub-entrypoint shape one-for-one, with **one `.tsx` per WC class** (per user's open-question response on granularity — the ribbon family thus gets ~18 separate `.tsx` files):

```text
libs/mintplayer-react-bootstrap/
├── card/src/{index.ts, BsCard.tsx, BsCardBody.tsx, BsCardHeader.tsx, ...}     # 10 files
├── ribbon/src/{index.ts, BsRibbon.tsx, BsRibbonTab.tsx, BsRibbonButton.tsx, ...}  # ~18 files
├── scheduler/src/{index.ts, BsScheduler.tsx}
└── …
```

Each `<entry>/src/index.ts` re-exports the typed React components. Each `.tsx` file follows the same skeleton:

```tsx
// libs/mintplayer-react-bootstrap/card/src/BsCard.tsx
import * as React from 'react';
import { createComponent } from '@lit/react';
import { MpCardElement } from '@mintplayer/web-components/card';

export const BsCard = createComponent({
  react: React,
  tagName: 'mp-card',
  elementClass: MpCardElement,
  events: { /* per-WC event map, hand-curated */ },
});
```

The first import has the side-effect of registering `<mp-card>` via `customElements.define()` at module load. Tree-shaking is preserved because each `.tsx` is a separate ESM module; consumers only import the components they use.

Peer deps on the React lib's package.json: `react ^19`, `react-dom ^19`, `@mintplayer/web-components` (same major), `@lit/react`. No regular `dependencies` — wrappers don't ship the WC code.

### Decision 6 — Vue wrapper strategy

**Recommendation: one SFC `.vue` adapter per WC**, exposing typed props via `defineProps`, re-emitting events with camelCase names, and using `defineModel()` to provide native `v-model` support for input-style WCs (calendar, datepicker, datetime-picker, timepicker, otp-input, multi-range, query-builder root).

Why per-component SFC adapters (vs. pass-through + `isCustomElement` config):

| Concern | Pass-through | SFC adapter |
|---|---|---|
| Typed props in templates | No — falls back to attribute strings | Yes — `defineProps<...>()` gives full autocomplete |
| Event binding | `@my-event` only (kebab-case, native) | `@my-event` *and* `@myEvent` (re-emitted) |
| `v-model` support | None — consumers wire `:value` + `@change` manually | Native — `defineModel()` per input WC |
| Complex-prop binding | `.prop` modifier required (`:foo.prop="..."`) | Adapter forwards via setter; consumers write `:foo` |
| Bundle cost per consumer | Zero adapter code | ~200B gzipped per wrapper |
| Author time per WC | Zero (just a Vite config + README snippet) | ~30-60 LoC per WC |

Author time is the only real cost; everything else flips toward the adapter approach. The user explicitly picked "SFC adapter per WC with v-model support" — this PRD honours that.

SFC structure (typical input WC):

```vue
<!-- libs/mintplayer-vue-bootstrap/datepicker/src/BsDatepicker.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue';
import '@mintplayer/web-components/datepicker';

const props = defineProps<{
  min?: Date;
  max?: Date;
  format?: string;
}>();

const modelValue = defineModel<Date | null>();

const el = ref<HTMLElement>();

watch(modelValue, (v) => {
  if (el.value) (el.value as any).value = v;
});

const onChange = (e: Event) => {
  modelValue.value = (e.target as any).value;
};
</script>

<template>
  <mp-datepicker
    ref="el"
    :min.prop="min"
    :max.prop="max"
    :format="format"
    @change="onChange"
  />
</template>
```

Display-only WCs (card family, ribbon items, dock chrome) get a much lighter adapter — just `defineProps` + template forwarding, no `defineModel`.

Vue lib structure mirrors the WC lib:

```text
libs/mintplayer-vue-bootstrap/
├── card/src/{index.ts, BsCard.vue, BsCardBody.vue, ...}
├── datepicker/src/{index.ts, BsDatepicker.vue}
└── …
```

Peer deps: `vue ^3.5`, `@mintplayer/web-components`. No regular `dependencies`.

### Decision 7 — ng-bootstrap migration to consume `@mintplayer/web-components`

**Recommendation: keep every existing `bs-*` Angular wrapper in place; only change their import paths.**

For each WC, the Angular wrapper currently does something like:

```ts
// libs/mintplayer-ng-bootstrap/card/src/lib/card/card.component.ts
import '../web-components/mp-card.element';   // relative side-effect import
```

This becomes:

```ts
import '@mintplayer/web-components/card';   // sub-entrypoint side-effect import
```

The Angular wrapper files themselves don't move. Only their imports change. `libs/mintplayer-ng-bootstrap/`'s tree loses the `**/web-components/` subfolders entirely (those move to `libs/mintplayer-web-components/`).

ng-bootstrap's `package.json` gets `@mintplayer/web-components` added to `peerDependencies` (same major version range as ng-bootstrap itself).

ng-bootstrap's `project.json` `build` target drops the `codegen-wc` dependency from its `dependsOn` (the WC lib owns that target now). Implicit Nx-graph dependency via `import` statements handles the build ordering.

### Decision 8 — Demo apps mirror all WC-backed routes

**Recommendation: generate `apps/react-bootstrap-demo/` and `apps/vue-bootstrap-demo/` via `nx g @nx/react:app` and `nx g @nx/vue:app`, both `--bundler=vite`. Mirror the route shape of `apps/ng-bootstrap-demo/` for every route whose primary subject is a WC.**

The user picked "All WC-backed routes" over the smaller "Enterprise section only" scope. Concrete inclusion rule:
- A route is **in scope** if its main demo subject is a component that has a WC backing.
- A route is **out of scope** if it demos Angular-specific behaviour (reactive forms, RxJS interop, Angular Router guards/animations, CDK drag-drop, scrollspy, parallax, NgTemplate). Those stay Angular-only.

Concrete WC-backed routes the demos must mirror (preliminary; verify during Phase 6 walk of `apps/ng-bootstrap-demo/src/app/pages/`):
- **Basic**: card, calendar, datepicker, timepicker, pagination, treeview, tab-control
- **Advanced**: splitter, otp-input, multi-range, query-builder, code-snippet (now a WC per Decision 14)
- **Overlays**: only the WC-backed ones — re-verify which overlays have WC implementations vs Angular-only
- **Enterprise**: all 9 (datatables, file-manager, scheduler, dock, tile-manager, ribbon, query-builder, otp-input, plus shell)

**React Router pick: React Router 7 in declarative library mode**, not Tanstack Router. Rationale: React Router 7 has the larger ecosystem and is closer to the route-array shape ng-bootstrap-demo uses with Angular Router — easier mechanical port. Tanstack's stronger type system isn't a meaningful win here since each demo route is a leaf page, not a deeply-typed loader graph. **Vue uses Vue Router 4.5** (current stable).

**Per `feedback_demo_before_snippet`**: each demo page renders the live demo first, then a code snippet below — via `<mp-code-snippet>`, the new WC built in Decision 14. All three demos share the same code-snippet renderer; only the snippet *content* differs per framework (TSX in the React demo, SFC in the Vue demo, Angular template in the Angular demo).

**Cross-framework navigation** (Goal 8): each demo's app shell exposes three brand-mark links to the sibling demos.

- **Placement**: top-right of the navbar, before any "GitHub repo" link. Always visible.
- **Marks**: official Angular shield, React atom, Vue triangle, each at 24×24 px. SVG, inline in the demo's source — not loaded from a CDN. The active framework's mark is rendered with a subtle highlight (filled background or coloured outline) so the user can tell where they are at a glance.
- **Targets**: `https://bootstrap.mintplayer.com`, `https://react.bootstrap.mintplayer.com`, `https://vue.bootstrap.mintplayer.com` (per Decision 15).
- **Path preservation**: each link tries to navigate to the same path on the target demo (`/enterprise/scheduler` in Angular → `/enterprise/scheduler` in React/Vue). Implementation: read `window.location.pathname`, append it to the target origin. If the target demo doesn't have that path (Angular-specific route), it 404s to its own home page — acceptable, the cross-link is a navigation aid not a contract.
- **Implementation effort**: ~50 LoC per demo for the nav-link component. Trivial; shared SVG marks can live in each demo's `assets/`.

### Decision 9 — Removal of stub `-wc` libraries

`libs/mp-scheduler-wc/`, `libs/mp-splitter-wc/`, `libs/mp-tab-control-wc/` are removed (`git rm -r`). Their generated `*.styles.ts` files were already redundant with the codegen output co-located beside the moved scheduler/splitter/tab-control sources.

Remove from:
- The three project.json + package.json + tsconfig.lib.json + vitest.config.ts file sets
- `tsconfig.base.json` path mappings (the `@mintplayer/scheduler-wc`, `@mintplayer/splitter`, `@mintplayer/tab-control-wc` entries — likely already absent post the prior PRD; double-check)
- `nx.json` if any project-specific config exists for them (likely none)
- The Nx project graph regenerates automatically once the project.json files are gone.

### Decision 10 — `tsconfig.base.json` path mappings

Add:
```jsonc
"@mintplayer/web-components": ["libs/mintplayer-web-components/src/index.ts"],
"@mintplayer/web-components/*": ["libs/mintplayer-web-components/*/src/index.ts"],
"@mintplayer/react-bootstrap": ["libs/mintplayer-react-bootstrap/src/index.ts"],
"@mintplayer/react-bootstrap/*": ["libs/mintplayer-react-bootstrap/*/src/index.ts"],
"@mintplayer/vue-bootstrap": ["libs/mintplayer-vue-bootstrap/src/index.ts"],
"@mintplayer/vue-bootstrap/*": ["libs/mintplayer-vue-bootstrap/*/src/index.ts"]
```

The wildcard pattern allows dev-time imports of `@mintplayer/web-components/ribbon` to resolve to `libs/mintplayer-web-components/ribbon/src/index.ts` without each entry needing its own `tsconfig` paths line.

Remove (if present):
- Any leftover `@mintplayer/scheduler-wc`, `@mintplayer/splitter`, `@mintplayer/tab-control-wc`, `@mintplayer/scheduler-core` lines.

### Decision 11 — `git mv` is mandatory

Every file move uses `git mv` (PowerShell users: `git mv` works inside the `git` CLI on Windows; do not use `Move-Item`). Git's rename detection is heuristic — large content edits in the same commit as a path change can break the rename association and scatter history. Discipline:

1. Run `git mv <old> <new>` for each file.
2. Commit the moves alone, no content edits.
3. Edit moved files in follow-up commits inside the same PR.

### Decision 12 — No Angular / React / Vue imports inside `libs/mintplayer-web-components/`

The new lib is framework-agnostic by contract. Per the existing `feedback_wc_no_angular_imports` memory, no Angular imports were allowed in `libs/mintplayer-ng-bootstrap/**/web-components/` either; we generalise that rule. Lint rule (`@nx/enforce-module-boundaries`): the `web-components` lib's `implicitDependencies` and `tags` must declare it as `scope:framework-agnostic`, and the rule rejects imports of `@angular/*`, `react`, `vue` from inside it.

### Decision 13 — Component-API contract stays "primitive emits semantic events; consumer mutates"

Per `feedback_wc_no_imposed_behavior`: WC primitives don't impose default behavior — drag/keyboard/click gestures update internal selection and emit semantic events; the consumer mutates the record store. This contract carries forward unchanged across the move. The Vue `v-model` adapter sits in the **Vue wrapper layer**, not in the WC — the WC continues to emit `change`-style events, and the SFC adapter is what bridges them into `update:modelValue`.

### Decision 14 — Migrate `<bs-code-snippet>` to a WC

Today `code-snippet` is Angular-only (`libs/mintplayer-ng-bootstrap/code-snippet/src/code-snippet.component.{ts,html,scss}`). The React and Vue demos can't reuse it — and if each demo invents its own snippet renderer (`react-syntax-highlighter` here, Shiki there, the existing Angular impl in the third), the three demos drift visually and have three independent code paths to maintain.

**Recommendation: build a new `<mp-code-snippet>` WC** in `libs/mintplayer-web-components/code-snippet/` and have all three framework wrappers consume it. One renderer, one styling, three thin wrappers.

Shape:
- `<mp-code-snippet language="tsx">…</mp-code-snippet>` — language as an attribute; source as default slot text content (so any markup is treated as literal text by the WC, which is what consumers want for showing code).
- Internal: same syntax-highlighting library the current Angular component uses (check `libs/mintplayer-ng-bootstrap/code-snippet/src/code-snippet.component.ts` during Phase 1 — probably Prism or Highlight.js). Lift it from the Angular component verbatim; only the rendering wrapper changes from Angular template to Lit.
- Copy-to-clipboard button, language label, line numbers — whatever the current Angular component does, ported to the WC's shadow DOM.
- Bootstrap styling via the same `:host { @import 'bootstrap/scss/root'; }` pattern other WCs already use.

The Angular wrapper at `libs/mintplayer-ng-bootstrap/code-snippet/` collapses to a thin shell that just renders `<mp-code-snippet>` and projects the host's input through. No behavioural change for existing Angular consumers — `<bs-code-snippet [language]="…">content</bs-code-snippet>` keeps working with the same template and inputs.

**Why this is in scope (vs. deferring to a separate PRD):** the demo apps' code snippets are the most visible "this works the same across all three frameworks" surface. If only Angular has the polished snippet UI and React/Vue use a stock library, the demos won't tell a unified story. Cost is ~1 day to port (small component, hand-written highlighter integration unchanged).

### Decision 15 — Ship a Custom Elements Manifest with `@mintplayer/web-components`

**Recommendation: add a `cem` Nx target to `libs/mintplayer-web-components/project.json` that emits `custom-elements.json` to the lib root, and wire it into the `build` target's `dependsOn` so it runs on every `nx build`.**

This is *not* the codegen-from-CEM workflow we rejected in Decision 5. Wrappers stay hand-written. This is shipping the manifest as a **documentation/IDE artefact** alongside the package — the same way ng-packagr ships type definitions you don't have to author.

What it buys (per the consumer-by-consumer table discussed during PRD review):
- **Vue Volar** picks it up automatically and provides attribute autocomplete in `<template>` for raw WC tags.
- **VS Code Lit plugin** uses it for `.html` files (including the codegen-wc source `.element.html` templates inside this repo).
- **Future Storybook docs** can render an API table per component with zero hand-maintenance.
- **External raw-HTML consumers** get autocomplete in their editor without installing any wrapper lib.
- **Static breaking-change detection** between published versions — a future-CI nice-to-have, cheap to add later once the manifest exists.
- **Angular Language Service** does not consume CEM as of 2026; no benefit for Angular wrapper authors. Acceptable — most of the cost is paid for Vue + raw-HTML consumers, who are the new audience.

**Target shape** (`libs/mintplayer-web-components/project.json`):

```jsonc
{
  "cem": {
    "executor": "nx:run-commands",
    "inputs": [
      "{projectRoot}/**/*.element.ts",
      "{projectRoot}/**/src/**/*.ts",
      "!{projectRoot}/**/*.spec.ts",
      "!{projectRoot}/**/*.element.template.ts",
      "{projectRoot}/custom-elements-manifest.config.mjs"
    ],
    "outputs": ["{projectRoot}/custom-elements.json"],
    "cache": true,
    "options": {
      "cwd": "libs/mintplayer-web-components",
      "command": "custom-elements-manifest analyze --litelement"
    }
  },
  "build": {
    "executor": "@nx/vite:build",
    "dependsOn": ["codegen-wc", "cem"],
    "...": "..."
  }
}
```

The `--litelement` flag enables the analyser's LitElement plugin so `@property()` decorators, `@queryAssignedElements`, etc. are parsed without extra config. The analyser also reads JSDoc tags (`@summary`, `@fires`, `@slot`, `@csspart`, `@cssprop`) — these give richer manifest entries but are *optional*. Existing WCs without them still produce a valid (thinner) manifest.

**Config file** at `libs/mintplayer-web-components/custom-elements-manifest.config.mjs`:

```js
export default {
  globs: ['**/*.element.ts', '**/src/**/*.ts'],
  exclude: ['**/*.spec.ts', '**/*.element.template.ts'],
  outdir: '.',
  litelement: true,
};
```

**Package wiring** — `libs/mintplayer-web-components/package.json`:

```json
{
  "name": "@mintplayer/web-components",
  "customElements": "./custom-elements.json",
  "files": ["dist", "custom-elements.json", "**/package.json"]
}
```

The `"customElements"` field is the W3C-spec'd discovery field; Volar, Storybook's `@custom-elements-manifest/to-markdown`, and the VS Code Lit plugin all look it up automatically.

**Dev dependencies** — `npm install -D @custom-elements-manifest/analyzer`. One package, no plugins required since we ship a single root manifest covering all sub-entrypoints (consumers don't need per-entry manifests — the format already namespaces by tag name).

**Annotation discipline** (low-priority, future incremental work): touch each WC's `@property` declarations to add JSDoc `@summary` lines as you're already there for other reasons. Don't backfill in a dedicated pass. The manifest improves gradually as authors touch files.

### Decision 16 — Deployment via `docker-compose.yml`

**Recommendation: extend the existing `docker-compose.yml`** (which already runs the ASP.NET Core API + Angular demo behind Traefik) to add two new services for the React and Vue demos.

- **`react-bootstrap-demo` service**: built from a new `apps/react-bootstrap-demo/Dockerfile` (multi-stage: Node build → Nginx serve of the dist output). Traefik labels route `react.bootstrap.mintplayer.com` to it.
- **`vue-bootstrap-demo` service**: same shape, `vue.bootstrap.mintplayer.com`.
- **DNS**: the user adds A records for the two new subdomains pointing at the VPS. Out of band of this repo; record as a deploy-time checklist item.
- **Cert provisioning**: Traefik's existing Let's Encrypt resolver picks up the new hostnames automatically — no extra config beyond the per-service labels.
- **CI**: `appleboy/ssh-action` deploy step (per `project_deployment` memory) re-runs `docker-compose pull && docker-compose up -d` after publish. The three new images come up alongside the existing two.

Minimal `docker-compose.yml` excerpt (illustrative — final values filled in during Phase 8):

```yaml
services:
  react-bootstrap-demo:
    image: mintplayer/react-bootstrap-demo:latest
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.react-demo.rule=Host(`react.bootstrap.mintplayer.com`)"
      - "traefik.http.routers.react-demo.entrypoints=websecure"
      - "traefik.http.routers.react-demo.tls.certresolver=letsencrypt"
      - "traefik.http.services.react-demo.loadbalancer.server.port=80"
  vue-bootstrap-demo:
    image: mintplayer/vue-bootstrap-demo:latest
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.vue-demo.rule=Host(`vue.bootstrap.mintplayer.com`)"
      - "traefik.http.routers.vue-demo.entrypoints=websecure"
      - "traefik.http.routers.vue-demo.tls.certresolver=letsencrypt"
      - "traefik.http.services.vue-demo.loadbalancer.server.port=80"
```

This composes cleanly with the cross-framework nav links from Decision 8 — once all three subdomains resolve, the brand-mark links go from "broken in production" to "fully functional cross-demo nav."

## Proposed file layout (after migration)

```text
libs/
├── mintplayer-web-components/       ← NEW, framework-agnostic
│   ├── package.json                  # @mintplayer/web-components, peerDeps: lit, @lit/context
│   ├── project.json                  # codegen-wc + Vite build targets
│   ├── tsconfig.json
│   ├── tsconfig.lib.json
│   ├── vite.config.ts                # multi-entry library mode
│   ├── src/index.ts                  # optional root entry: empty or re-exports types only
│   ├── card/
│   │   ├── package.json              # sub-entrypoint metadata (sideEffects: true)
│   │   └── src/{index.ts, mp-card.element.ts, mp-card.element.html, mp-card.element.scss, mp-card.element.template.ts, ...}
│   ├── ribbon/
│   ├── scheduler/
│   ├── dock/
│   ├── … (~14 more)
│   └── …
├── mintplayer-ng-bootstrap/          ← EXISTING, slimmer
│   ├── card/                         # bs-* Angular wrappers; imports @mintplayer/web-components/card
│   ├── ribbon/
│   ├── dock/
│   ├── scheduler/
│   ├── … (all existing sub-entrypoints)
│   ├── (no more **/web-components/ subfolders)
│   ├── package.json                  # peerDeps now include @mintplayer/web-components
│   └── project.json                  # build no longer dependsOn codegen-wc
├── mintplayer-react-bootstrap/       ← NEW
│   ├── package.json                  # @mintplayer/react-bootstrap, peerDeps: react, @mintplayer/web-components, @lit/react
│   ├── project.json                  # Vite library build
│   ├── vite.config.ts                # multi-entry, same per-group entries as WC lib
│   ├── card/src/{index.ts, BsCard.tsx, BsCardBody.tsx, ...}
│   ├── ribbon/src/…
│   ├── scheduler/src/…
│   └── …
├── mintplayer-vue-bootstrap/         ← NEW
│   ├── package.json                  # @mintplayer/vue-bootstrap, peerDeps: vue, @mintplayer/web-components
│   ├── project.json                  # Vite library build with @vitejs/plugin-vue
│   ├── vite.config.ts
│   ├── card/src/{index.ts, BsCard.vue, BsCardBody.vue, ...}
│   ├── datepicker/src/{index.ts, BsDatepicker.vue}
│   └── …
└── (mp-scheduler-wc, mp-splitter-wc, mp-tab-control-wc — REMOVED)

apps/
├── ng-bootstrap-demo/                ← EXISTING, unchanged routes & shape
├── react-bootstrap-demo/             ← NEW (Nx React app, Vite)
│   ├── project.json
│   ├── vite.config.ts
│   ├── src/{main.tsx, app/, pages/{basic,advanced,overlays,enterprise}/...}
│   └── …
├── vue-bootstrap-demo/               ← NEW (Nx Vue app, Vite)
│   ├── project.json
│   ├── vite.config.ts
│   ├── src/{main.ts, app/, pages/{basic,advanced,overlays,enterprise}/...}
│   └── …
├── ng-bootstrap-demo-e2e/            ← unchanged
└── api/                              ← unchanged

tools/scripts/build-web-components.mjs    # unchanged; invoked with the new libRoot

tsconfig.base.json                         # path mappings updated per Decision 10
.github/workflows/publish-master.yml      # add three publish steps (see Phase 6)
```

## Phased plan

Each phase is a commit (or 2-3 commits when noted) inside one PR. Per the user's `feedback_branch_pr_permission` memory, do not create new branches or PRs without explicit permission — this PRD describes the work, branch creation happens when the user approves.

### Phase 0 — Pre-flight checks

1. **Smoke-verify `codegen-wc` against a different `libRoot`.** Run `node tools/scripts/build-web-components.mjs libs/mintplayer-web-components` (after creating the empty lib in Phase 1) and confirm it walks the new path correctly.
2. **Confirm Vue plugin name is `@nx/vue`** (vs. any renamed/split variant in Nx 21+). Run `nx list @nx/vue` to verify the generators exist; install if missing.
3. **Confirm `@lit/react` major version compatible with React 19.** As of May 2026 this is `@lit/react ^1`. Pin the exact version in the React lib's peerDeps.
4. **Walk the actual WC inventory** (both Layout A and Layout B from the *Current state* section) and produce a canonical list of element classes with their target sub-entrypoint name. This list becomes the authoritative input for Phase 1's `git mv` script and Phases 4/5's wrapper file enumeration.

Commit: `chore(prep): verify codegen-wc portability, Vue plugin, lit/react; canonical WC inventory`.

### Phase 1 — Scaffold `libs/mintplayer-web-components/` and move WC source

1. `nx g @nx/js:library libs/mintplayer-web-components --bundler=vite --publishable --importPath=@mintplayer/web-components`.
2. Add `codegen-wc` target to the new `project.json` (copy from `libs/mintplayer-ng-bootstrap/project.json:9-24`, change the libRoot argument).
3. Configure `vite.config.ts` for multi-entry library mode (entries added per sub-entrypoint as later steps populate them).
4. Write the root `package.json`'s `exports` map skeleton (entries added per sub-entrypoint as later steps populate them).
5. **Move Layout A sources** (the `.element.ts` files under feature folders). One `git mv` per source folder; no rename of files within the move:
   ```bash
   git mv libs/mintplayer-ng-bootstrap/calendar/src/lib/web-components       libs/mintplayer-web-components/calendar/src
   git mv libs/mintplayer-ng-bootstrap/card/src/lib/web-components           libs/mintplayer-web-components/card/src
   git mv libs/mintplayer-ng-bootstrap/datepicker/src/lib/web-components     libs/mintplayer-web-components/datepicker/src
   git mv libs/mintplayer-ng-bootstrap/datetime-picker/src/lib/web-components libs/mintplayer-web-components/datetime-picker/src
   git mv libs/mintplayer-ng-bootstrap/dock/src/lib/web-components           libs/mintplayer-web-components/dock/src
   git mv libs/mintplayer-ng-bootstrap/multi-range/src/lib/web-components    libs/mintplayer-web-components/multi-range/src
   git mv libs/mintplayer-ng-bootstrap/otp-input/src/lib/web-components      libs/mintplayer-web-components/otp-input/src
   git mv libs/mintplayer-ng-bootstrap/query-builder/src/lib/web-components  libs/mintplayer-web-components/query-builder/src
   git mv libs/mintplayer-ng-bootstrap/ribbon/src/lib/web-components         libs/mintplayer-web-components/ribbon/src
   git mv libs/mintplayer-ng-bootstrap/tile-manager/src/lib/web-components   libs/mintplayer-web-components/tile-manager/src
   git mv libs/mintplayer-ng-bootstrap/timepicker/src/lib/web-components     libs/mintplayer-web-components/timepicker/src
   ```
6. **Move Layout B sub-entrypoints** (already-consolidated WCs under `web-components/`). One `git mv` per sub-entrypoint:
   ```bash
   git mv libs/mintplayer-ng-bootstrap/web-components/a11y           libs/mintplayer-web-components/a11y
   git mv libs/mintplayer-ng-bootstrap/web-components/checkbox       libs/mintplayer-web-components/checkbox
   git mv libs/mintplayer-ng-bootstrap/web-components/datatable      libs/mintplayer-web-components/datatable
   git mv libs/mintplayer-ng-bootstrap/web-components/file-manager   libs/mintplayer-web-components/file-manager
   git mv libs/mintplayer-ng-bootstrap/web-components/overlay        libs/mintplayer-web-components/overlay
   git mv libs/mintplayer-ng-bootstrap/web-components/pagination     libs/mintplayer-web-components/pagination
   git mv libs/mintplayer-ng-bootstrap/web-components/radio          libs/mintplayer-web-components/radio
   git mv libs/mintplayer-ng-bootstrap/web-components/scheduler      libs/mintplayer-web-components/scheduler
   git mv libs/mintplayer-ng-bootstrap/web-components/scheduler-core libs/mintplayer-web-components/scheduler-core
   git mv libs/mintplayer-ng-bootstrap/web-components/splitter       libs/mintplayer-web-components/splitter
   git mv libs/mintplayer-ng-bootstrap/web-components/tab-control    libs/mintplayer-web-components/tab-control
   git mv libs/mintplayer-ng-bootstrap/web-components/toggle-button  libs/mintplayer-web-components/toggle-button
   git mv libs/mintplayer-ng-bootstrap/web-components/treeview       libs/mintplayer-web-components/treeview
   ```
7. Commit the moves alone (no content edits): `chore(wc-extract): relocate WC source into mintplayer-web-components (git mv, no content changes)`.
8. **Normalise the directory shape.** Layout A sources land at `libs/mintplayer-web-components/<entry>/src/` (mp-card.element.ts directly in `src/`); Layout B sources land at `libs/mintplayer-web-components/<entry>/src/components/<name>.ts`. Pick one convention — recommend Layout A's flatter shape (`src/<file>.ts`) since most WCs (~40 of ~49) already use it. For Layout B entries, run a second `git mv` to flatten: `git mv libs/mintplayer-web-components/scheduler/src/components/mp-scheduler.ts libs/mintplayer-web-components/scheduler/src/mp-scheduler.ts` and similar. Keep sub-folders for genuinely-internal modules (drag/, state/, views/) since those reflect real composition.
9. Add per-sub-entrypoint `package.json` files with `sideEffects: true` and `index.ts` files that re-export the moved sources.
10. **Migrate `<bs-code-snippet>` to `<mp-code-snippet>`** per Decision 14. Create `libs/mintplayer-web-components/code-snippet/src/mp-code-snippet.element.{ts,html,scss}`, port the highlighting/copy-to-clipboard logic from the existing Angular component. Run codegen-wc to produce the `.element.template.ts`.
11. Wire each sub-entrypoint's `index.ts` into the Vite multi-entry config.
12. **Wire the CEM target** per Decision 15: `npm install -D @custom-elements-manifest/analyzer`, create `libs/mintplayer-web-components/custom-elements-manifest.config.mjs`, add the `cem` target to `project.json`, and append `"cem"` to the `build.dependsOn` array. Smoke-run `nx run mintplayer-web-components:cem` and confirm `custom-elements.json` lands at the lib root with one entry per `@customElement` / `customElements.define` call. Add `"customElements": "./custom-elements.json"` + the file to `package.json`'s `files` array.
13. Run `nx build mintplayer-web-components`. Iterate until the build is clean and produces `dist/libs/mintplayer-web-components/<entry>/index.{mjs,cjs,d.ts}` per entry, plus `custom-elements.json` at the lib root.

Commit: `feat(wc): consolidate web components into @mintplayer/web-components with sub-entrypoints` (+ `feat(wc): add mp-code-snippet WC` as a separate commit if reviewers prefer).

### Phase 2 — Migrate `@mintplayer/ng-bootstrap` to import from `@mintplayer/web-components`

14. For each Angular wrapper, replace the relative `../web-components/<name>.element` (Layout A) or `../web-components/<name>` (Layout B) import with `@mintplayer/web-components/<entry>`.
15. Drop the `codegen-wc` step from `libs/mintplayer-ng-bootstrap/project.json`'s `build.dependsOn`.
16. Delete the `codegen-wc` target entry from `libs/mintplayer-ng-bootstrap/project.json` (it now lives in the new lib).
17. **Update `bs-code-snippet`** at `libs/mintplayer-ng-bootstrap/code-snippet/src/code-snippet.component.{ts,html}` to render `<mp-code-snippet>` instead of its current internal highlighter. Public Angular API (`[language]` input, slot content) stays the same.
18. Add `@mintplayer/web-components: "21.x"` (or whatever the new lib's first published version is) to `libs/mintplayer-ng-bootstrap/package.json`'s `peerDependencies`.
19. Update `tsconfig.base.json` path mappings per Decision 10.
20. Run `nx build mintplayer-ng-bootstrap` end-to-end. Run `nx serve ng-bootstrap-demo` and click through every Enterprise route + a sample of Basic / Advanced / Overlays routes. Visual diff against `master`.

Commit: `refactor(ng-bootstrap): consume WCs from @mintplayer/web-components`.

### Phase 3 — Remove stub `-wc` libraries

21. `git rm -r libs/mp-scheduler-wc libs/mp-splitter-wc libs/mp-tab-control-wc`.
22. Remove any remaining `tsconfig.base.json` path mappings or `nx.json` references for those projects.
23. Run `nx graph` to confirm the project graph no longer references the removed projects.

Commit: `chore: remove orphaned stub WC libraries`.

### Phase 4 — Generate `@mintplayer/react-bootstrap`

24. `nx g @nx/react:library libs/mintplayer-react-bootstrap --bundler=vite --publishable --importPath=@mintplayer/react-bootstrap --no-component`.
25. Add the same sub-entrypoint shape as the WC lib (one folder per logical group). Each folder gets `src/index.ts`, one `<BsComponent>.tsx` **per WC class** (per user preference; ribbon family gets ~18 files), and a sub-entrypoint `package.json`.
26. **Hand-author each wrapper** using the skeleton from Decision 5. Same authoring model ng-bootstrap uses for its Angular wrappers — every `.tsx` is normal source code, typed, lintable, checked into the repo. For each WC, look up its custom-event names from the source and populate the `events:` map with the correct `EventName<CustomEvent<DetailType>>` casts.
27. Set up Vite multi-entry config + root `package.json` `exports` map identical-shape to the WC lib.
28. Run `nx build mintplayer-react-bootstrap`. Confirm `dist/libs/mintplayer-react-bootstrap/<entry>/index.{mjs,cjs,d.ts}` per entry.

Commit: `feat(react-bootstrap): React 19 wrappers for @mintplayer/web-components`.

### Phase 5 — Generate `@mintplayer/vue-bootstrap`

29. `nx g @nx/vue:library libs/mintplayer-vue-bootstrap --bundler=vite --publishable --importPath=@mintplayer/vue-bootstrap`.
30. Same sub-entrypoint shape. Each folder gets `src/index.ts`, one `<BsComponent>.vue` per WC class, and a sub-entrypoint `package.json`.
31. Hand-author each SFC adapter (Decision 6 template). For input WCs, use `defineModel()` for `v-model` bridging.
32. Set up Vite config with `@vitejs/plugin-vue` + multi-entry build.
33. Run `nx build mintplayer-vue-bootstrap`. Confirm per-entry dist output.

Commit: `feat(vue-bootstrap): Vue 3.5 SFC adapters for @mintplayer/web-components`.

### Phase 6 — React demo app

34. `nx g @nx/react:app apps/react-bootstrap-demo --bundler=vite --routing`. Pick React Router 7 in declarative library mode per Decision 8.
35. **Build the app shell** with the cross-framework nav per Decision 8 — three brand-mark links (Angular shield, React atom, Vue triangle) at the top-right of the navbar, with the active framework highlighted.
36. Walk `apps/ng-bootstrap-demo/src/app/pages/` and identify every WC-backed route (Decision 8 inclusion rule). Recreate the route tree in React Router 7.
37. Port each WC-backed demo page to React. For each page: demo block first, then `<bs-code-snippet>` (React wrapper around `<mp-code-snippet>` from Decision 14). Use the same content/copy as the Angular demo where it makes sense; trim Angular-specific commentary.
38. Run `nx serve react-bootstrap-demo` and walk every route in the browser. Confirm WCs render, events fire, controlled-input pattern works.

Commit: `feat(react-bootstrap-demo): demo app mirroring WC-backed routes with cross-framework nav`.

### Phase 7 — Vue demo app

39. `nx g @nx/vue:app apps/vue-bootstrap-demo --bundler=vite --routing`. Pick Vue Router 4.5.
40. Build the same app shell (cross-framework nav, brand marks, active-framework highlight).
41. Same route walk as Phase 6, recreated in Vue Router.
42. Port each WC-backed demo page to Vue. Use the SFC adapter wrappers from `@mintplayer/vue-bootstrap`. Demo-first, then `<bs-code-snippet>` (Vue wrapper around `<mp-code-snippet>`).
43. Run `nx serve vue-bootstrap-demo` and walk every route. Verify `v-model` works on every input WC in the demo.

Commit: `feat(vue-bootstrap-demo): demo app mirroring WC-backed routes with cross-framework nav`.

### Phase 8 — CI + publishing + deployment

44. Update `.github/workflows/publish-master.yml` — add three new publish steps:
    - `@mintplayer/web-components` (must publish first; the wrapper libs depend on it)
    - `@mintplayer/react-bootstrap`
    - `@mintplayer/vue-bootstrap`
    Order matters; publish-master should serialise them via job-level `needs:`.
45. Add `nx build react-bootstrap-demo` and `nx build vue-bootstrap-demo` to the CI build step list (matching how `ng-bootstrap-demo` is built today).
46. **Create `apps/react-bootstrap-demo/Dockerfile`** (multi-stage: Node build → Nginx serve of dist output). Same for `apps/vue-bootstrap-demo/Dockerfile`.
47. **Extend `docker-compose.yml`** per Decision 16 — add `react-bootstrap-demo` and `vue-bootstrap-demo` services with Traefik labels for `react.bootstrap.mintplayer.com` and `vue.bootstrap.mintplayer.com`.
48. Add Docker image build + push steps to `publish-master.yml` for the two new images (mirroring the existing Angular demo image build step).
49. The `appleboy/ssh-action` deploy step on the VPS re-runs `docker-compose pull && docker-compose up -d` — picks up the two new services automatically.
50. Out-of-band checklist for the user: add A records for `react.bootstrap.mintplayer.com` and `vue.bootstrap.mintplayer.com` pointing at the VPS IP. Traefik handles cert provisioning automatically once DNS resolves.

Commit: `ci: publish @mintplayer/{web-components,react-bootstrap,vue-bootstrap} and deploy demos via docker-compose`.

### Phase 9 — Verify

51. End-to-end `nx run-many --target=build --all`. Every project builds clean.
52. `git log --follow` on a sample of moved files (one from Layout A, one from Layout B) shows the original history continuing across the move.
53. Visual smoke-test all three demos in three browser windows side by side. Spot-check that the same WC (e.g. `<mp-scheduler>`) renders identically inside Angular, React, and Vue. Click the brand-mark nav links to confirm cross-framework navigation works (path preserved when the target route exists).
54. Run any existing Playwright e2e tests (`apps/ng-bootstrap-demo-e2e/`). They should pass unchanged — the Angular demo's behaviour hasn't changed.
55. Once DNS + deploy are live: visit `https://react.bootstrap.mintplayer.com` and `https://vue.bootstrap.mintplayer.com` and walk the same routes against the production build.

## Risks

| Risk | Phase | Mitigation |
|---|---|---|
| Vite multi-entry library mode doesn't produce the per-entry `.d.ts` layout we need without help | 1 | Use `vite-plugin-dts` with `rollupTypes: true` per entry. Smoke-test with one entry before generating all. |
| `sideEffects: true` on every entry defeats tree-shaking *inside* the entry (consumers pay for unused element files) | 1, 4, 5 | Switch to an explicit `sideEffects` array (`["./dist/*.mjs"]`) per entry once the basic build is working, so bundlers can drop unused element files within an entry. Verify with a bundle-size snapshot in a downstream consumer. |
| `git mv` of deeply-nested `web-components/` subfolders breaks rename detection if the script in Phase 1 is interleaved with content edits | 1 | Strict commit discipline: one commit for `git mv` only, content edits in a separate commit per the [`git mv` is mandatory] decision. |
| Mixing Layout A (`*.element.ts` flat under feature folder) and Layout B (`*.ts` under `src/components/`) creates an inconsistent target layout | 1 | Phase 1 step 8 normalises to the flat Layout A shape for everyone — Layout B's deeper `src/components/<name>.ts` paths get a second `git mv` to flatten. Genuinely-internal modules (drag/, state/, views/) keep their subfolders since they reflect real composition. |
| Hand-writing ~49 React wrappers and ~49 Vue wrappers is a lot of repetitive work | 4, 5 | Each wrapper is ~10-30 LoC. The ribbon family (~18) and card family (~10) are the bulk; both have highly-regular per-element shapes that copy-paste cleanly. Estimated total: 1-2 days per framework. Worth the maintenance simplicity. |
| `@lit/react`'s `createComponent` and React 19's native custom-element handling collide (double event registration, prop-vs-attribute mismatch) | 4 | `createComponent` calls `addEventListener` for events declared in its `events:` map and otherwise leaves the element alone. React 19's native path triggers only for props/events not in the `createComponent` output. Smoke-test with one wrapper before authoring all. |
| Vue's `defineCustomElement` warning ("unknown component bs-...") fires in demo without `isCustomElement` config | 5, 7 | Configure `vite.config.ts` for the Vue demo with `@vitejs/plugin-vue({ template: { compilerOptions: { isCustomElement: tag => tag.startsWith('mp-') || tag.startsWith('mint-') } } })`. The SFC adapters wrap the WC tag so the warning shouldn't reach consumers, but the demo's own templates may use the WC tags directly. |
| Vue's `v-model` adapter for input WCs has subtle bidirectional-binding bugs (value gets out of sync on rapid updates) | 5, 7 | Use Vue 3.5's `defineModel()` (not the older `modelValue` + `update:modelValue` manual pattern); `defineModel` handles the bidirectional contract automatically. Test rapid programmatic updates with `watch` instrumentation in the demo. |
| Per-entry `package.json` files inside a single npm package cause confusion ("which package.json is authoritative?") | 1, 4, 5 | Document in the root `README.md`: the root `package.json` is what npm publishes; per-entry `package.json` files exist only for `sideEffects` granularity and `main`/`module`/`types` per-entry resolution. Equivalent to React Aria Components' shape. |
| The ng-bootstrap import-path change touches 41+ Angular wrappers in a single PR — review is heavy | 2 | Phase 2 is a mechanical change (relative import → sub-entrypoint import). Split into one commit per wrapper-folder if the PR diff is too noisy for review. |
| Demo-app route porting (Phases 6 + 7) is 30+ routes × 2 frameworks = 60+ pages of work | 6, 7 | Time-box per page (~30 min for simple wrapper demos, ~2 hrs for complex ones like dock or scheduler). Consider parallelisation: ship the React demo + Vue demo as separate follow-up PRs after Phases 1-5 land, if the combined PR is too large. The PRD describes the end state; PR sequencing is the user's call. |
| Bootstrap-in-Shadow-DOM CSS payload triples in the multi-framework world (three sets of compiled CSS — one per wrapper lib) | 1, 4, 5 | **Not a real concern.** The CSS lives inside the WCs (in `libs/mintplayer-web-components/`), not in the wrappers. The wrappers re-export the WC tag; the WC's shadow root carries the compiled Bootstrap CSS exactly once per consumer's page. Single payload regardless of which framework loads it. |
| Existing consumers of `@mintplayer/ng-bootstrap` see a new `peerDependency` and must `npm install @mintplayer/web-components` | 2, 8 | Document in `CHANGELOG.md` and the release notes as a breaking change (per `feedback_breaking_changes_ok`). The install is one extra `npm install` line, not a code change. |
| Old npm packages `@mintplayer/scheduler-wc`, `@mintplayer/splitter`, `@mintplayer/tab-control-wc` keep showing up in npm searches and confuse new users | — | Mark them deprecated on npm (`npm deprecate @mintplayer/scheduler-wc@\* "Use @mintplayer/web-components/scheduler instead"`). Manual step, not part of the workflow. |
| `apps/ng-bootstrap-demo-e2e/` Playwright tests reference `localhost` URLs that change if we run multiple demo apps simultaneously | 9 | The Angular demo's port doesn't change. The React and Vue demos run on different Vite ports. Each demo's e2e (if added later) is isolated. Out of scope for this PRD. |

## Open questions

*All seven previously-listed open questions have been resolved by the user.* The resolutions are folded into the decisions and phases above. For history:

1. ~~Single VPS deployment vs three deployments~~ → **Resolved (Decision 16):** extend `docker-compose.yml`; serve all three demos from the same VPS at `bootstrap.mintplayer.com`, `react.bootstrap.mintplayer.com`, `vue.bootstrap.mintplayer.com`.
2. ~~Sub-entrypoint count clarification~~ → **Partially resolved.** Phase 0 step 4 + Phase 1 walk produce the canonical inventory; current estimate is ~25 sub-entrypoints (~22 element-bearing + 3 helper). Final count confirmed during Phase 1.
3. ~~CEM analyser configuration~~ → **Resolved (Decisions 5 + 15):** no CEM-based codegen — wrappers are hand-written, same as the Angular wrappers. CEM JSON file *is* shipped alongside the package for IDE/docs tooling (Decision 15), produced by a `cem` Nx target wired into every `nx build`.
4. ~~Demo-app code-snippet rendering~~ → **Resolved (Decision 14):** migrate `<bs-code-snippet>` to a WC `<mp-code-snippet>`; all three demos consume the same WC through their respective framework wrapper.
5. ~~React demo router choice~~ → **Resolved (Decision 8):** React Router 7 in declarative library mode.
6. ~~Per-WC vs per-family React wrapper files~~ → **Resolved (Decision 5):** one `.tsx` file per WC class. Same shape applies to Vue (one `.vue` per WC).
7. ~~`scheduler-core` package fate~~ → **Resolved:** no separate `@mintplayer/scheduler-core` npm package. The `scheduler-core` helper code lives under `libs/mintplayer-web-components/scheduler-core/` and is exposed as `@mintplayer/web-components/scheduler-core` for any external consumer that needs the types/services directly. Verify during Phase 1 that the Angular scheduler wrapper imports from `@mintplayer/web-components/scheduler-core` instead of any old `@mintplayer/scheduler-core` path.

### Remaining open question

8. **Toggle-button + treeview WC counts.** Layout B has folders for both but the Phase-0 inventory walk needs to confirm exactly which element classes live there (didn't grep clean). Resolved before Phase 1 step 9 (per-sub-entrypoint `package.json` files).

## Acceptance criteria

### Phase 1 — WC lib scaffolding + source migration

- [ ] `libs/mintplayer-web-components/` exists with `package.json` (`@mintplayer/web-components`), `project.json` (codegen-wc + Vite build), `vite.config.ts` (multi-entry library mode), and ~25 sub-entrypoint folders.
- [ ] Every Layout A `*.element.ts` file (~40) and every Layout B `*.ts` element file (~10) has moved into `libs/mintplayer-web-components/<entry>/src/` via `git mv`. `git log --follow` on a sample from each layout shows continuous history.
- [ ] Directory shape is normalised — Layout B's `src/components/<name>.ts` files are flattened to `src/<name>.ts` (Phase 1 step 8).
- [ ] `<mp-code-snippet>` WC exists at `libs/mintplayer-web-components/code-snippet/src/mp-code-snippet.element.{ts,html,scss}` with feature parity to the current `bs-code-snippet` Angular component (language label, copy-to-clipboard, line numbers, highlighting).
- [ ] `nx build mintplayer-web-components` produces per-entry `dist/libs/mintplayer-web-components/<entry>/index.{mjs,cjs,d.ts}`.
- [ ] `codegen-wc` runs against the new lib root and produces the same `*.element.template.ts` content it produced before for unchanged WCs (verified by byte-diff against pre-move output).

### Phase 2 — ng-bootstrap consumes the WC lib

- [ ] Every Angular wrapper in `libs/mintplayer-ng-bootstrap/` imports its WC from `@mintplayer/web-components/<entry>`, not from a relative `./web-components/` path.
- [ ] `libs/mintplayer-ng-bootstrap/**/web-components/` folders (both Layout A subfolders and the Layout B `web-components/` parent) do not exist.
- [ ] `libs/mintplayer-ng-bootstrap/project.json`'s `build` target's `dependsOn` is `["^build"]` (codegen-wc removed).
- [ ] `bs-code-snippet` renders `<mp-code-snippet>` internally; its public Angular API is unchanged.
- [ ] `nx serve ng-bootstrap-demo` works. Visual smoke test of every Enterprise route + a sample of other routes shows no regression vs `master`.

### Phase 3 — Stub libs removed

- [ ] `libs/mp-scheduler-wc/`, `libs/mp-splitter-wc/`, `libs/mp-tab-control-wc/` do not exist.
- [ ] `nx graph` does not reference the removed projects.

### Phase 4 — React wrappers

- [ ] `libs/mintplayer-react-bootstrap/` exists with the same sub-entrypoint shape as the WC lib.
- [ ] Every WC has a corresponding hand-written React wrapper file (one `.tsx` per WC class) using `@lit/react createComponent`. No codegen — wrappers are normal source code, parallel to ng-bootstrap's Angular wrappers.
- [ ] `nx build mintplayer-react-bootstrap` produces per-entry dist output.
- [ ] A standalone consumer (a one-page test app) can `import { BsScheduler } from '@mintplayer/react-bootstrap/scheduler'` and render it with full TypeScript autocomplete on props and events.

### Phase 5 — Vue wrappers

- [ ] `libs/mintplayer-vue-bootstrap/` exists with the same sub-entrypoint shape.
- [ ] Every WC has a corresponding `.vue` SFC adapter. Input-style WCs (calendar, datepicker, datetime-picker, timepicker, otp-input, multi-range, query-builder root) use `defineModel()` for `v-model` support.
- [ ] `nx build mintplayer-vue-bootstrap` produces per-entry dist output.
- [ ] A standalone consumer (a one-page test app) can `<bs-datepicker v-model="myDate" />` and the binding works bidirectionally.

### Phase 6 — React demo app

- [ ] `apps/react-bootstrap-demo/` exists. `nx serve react-bootstrap-demo` boots.
- [ ] App shell shows the three cross-framework brand-mark links (Angular shield, React atom, Vue triangle); the React mark is highlighted as the active framework.
- [ ] Every WC-backed route from `apps/ng-bootstrap-demo/` (per Decision 8 inclusion rule) has a parallel route in the React demo.
- [ ] Each demo page renders the live WC first, then a `<bs-code-snippet>` (React wrapper around `<mp-code-snippet>`).
- [ ] Visual side-by-side with the Angular demo: same WC renders identically.

### Phase 7 — Vue demo app

- [ ] `apps/vue-bootstrap-demo/` exists. `nx serve vue-bootstrap-demo` boots.
- [ ] App shell shows the three cross-framework brand-mark links; the Vue mark is highlighted as the active framework.
- [ ] Same route coverage as the React demo.
- [ ] `v-model` works on every input WC in the demo (verified by typing/picking and watching the bound state update).
- [ ] Visual side-by-side with the Angular and React demos: same WC renders identically across all three.

### Phase 8 — CI + publishing + deployment

- [ ] `publish-master.yml` publishes `@mintplayer/web-components` → `@mintplayer/react-bootstrap` + `@mintplayer/vue-bootstrap` + `@mintplayer/ng-bootstrap` in correct dependency order.
- [ ] CI builds all three demo apps on every push to `master`.
- [ ] `apps/react-bootstrap-demo/Dockerfile` and `apps/vue-bootstrap-demo/Dockerfile` exist and produce minimal-footprint Nginx images.
- [ ] `docker-compose.yml` includes the two new services with Traefik labels for `react.bootstrap.mintplayer.com` and `vue.bootstrap.mintplayer.com`.
- [ ] After DNS is configured (out-of-band user action), both subdomains resolve and serve HTTPS via Traefik's existing Let's Encrypt resolver.
- [ ] Cross-framework brand-mark links work end-to-end in production: clicking the Vue mark from the Angular demo lands on the corresponding Vue route at `vue.bootstrap.mintplayer.com/...`.

### Phase 9 — Full verify

- [ ] `nx run-many --target=build --all` succeeds.
- [ ] `nx run-many --target=test --all` succeeds (existing tests; no new test infrastructure required for this PRD).
- [ ] `nx run-many --target=lint --all` succeeds, including the new `@nx/enforce-module-boundaries` rule that bans framework imports from `libs/mintplayer-web-components/`.
- [ ] `git log --follow` on any moved file produces continuous history across the relocation.
- [ ] CHANGELOG entry for `@mintplayer/ng-bootstrap` documents the new `peerDependency` on `@mintplayer/web-components` as a breaking change for consumers.

## Appendix — Why this reverses the prior consolidation PRD

`docs/prd/wc-libs-as-ng-bootstrap-sub-entrypoints.md` made the right call under its constraint:

> Unlike the sibling `mintplayer-ng-video-player` workspace (which targets Angular / React / Vue and *needs* framework-agnostic standalone packages), this workspace targets **Angular only**. There is therefore no value in keeping the WCs as separate npm packages for non-Angular consumers …

That constraint just dissolved. With React + Vue consumers added, the WC source has to leave the Angular project — exactly what the prior PRD undid. The two PRDs aren't contradictory; they reflect a real change in scope. The prior PRD's `git mv` work simplifies *this* PRD: the WC source is already grouped under three `libs/mintplayer-ng-bootstrap/web-components/{scheduler,splitter,tab-control}/` directories instead of scattered across four sibling libs at `libs/`, so the move-out step starts from a cleaner baseline.

This PRD's structural decisions (per-group sub-entrypoints, `sideEffects: true`, Vite multi-entry build, etc.) were not viable under ng-packagr; they become straightforward in a pure-TS lib. Net: we lose ~6 months of "consolidation simplicity" and gain cross-framework reach. The user's call.
