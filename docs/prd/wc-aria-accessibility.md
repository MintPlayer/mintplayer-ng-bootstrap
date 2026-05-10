# PRD: ARIA & accessibility — Lit web components (splitter, dock, scheduler, tile-manager)

**Status:** Proposal
**Author:** Pieterjan (audit by 4-agent ARIA team)
**Date:** 2026-05-10
**Library:** `@mintplayer/ng-bootstrap` web-component layer + nested WCs in `dock/` and `tile-manager/`
**Standards target:** [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/) + [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/), conformance to **WCAG 2.2 AA**.
**Companion PRD:** [`aria-accessibility-audit.md`](./aria-accessibility-audit.md) — covers the Angular component layer; this PRD is the WC-layer follow-up.

---

## 1. Motivation

The Angular component layer is finishing its ARIA pass on branch `feat/aria-accessibility` (see companion PRD §1–§5). The Lit web-component layer — `mp-splitter`, `mint-dock-manager`, `mp-scheduler`, `mint-tile-manager` — was deliberately scoped out of the Angular audit because each WC needs deeper, pattern-specific work that doesn't fit in a "1-PR per Angular component" rhythm.

These four components are the most layout-driven, drag-driven, and pointer-dependent things the library ships. They're also the most likely to be reused outside Angular (per the standing rule: *new components default to a Lit WC + Angular wrapper*). If they ship inaccessible, every downstream framework adopter inherits the gap.

A library that's sold as "Bootstrap drop-in with deep components" needs each of these to clear APG conformance for its pattern. Right now they don't — three of the four have **zero ARIA** on the interactive parts, and the fourth (tile-manager, post `ca7a0c9d`) is a partial start.

## 2. Goals / non-goals

**Goals**

- **G1.** Every interactive surface (gutters, dividers, tabs, drop joysticks, event blocks, tiles) is reachable, operable, and labelled for screen readers + keyboard-only users.
- **G2.** Every drag-driven interaction has a **keyboard alternative** that delivers the same outcome (per APG drag-and-drop guidance). The pattern is consistent across components: focus the item → enter *move/resize mode* → arrow keys nudge → Enter commits → Escape cancels → live region narrates each step.
- **G3.** Every state change a sighted user perceives (split resized, pane moved, event nudged, tile reflowed) is exposed to assistive tech via a polite live region. Live announcer logic is shared, not re-implemented per component.
- **G4.** `prefers-reduced-motion: reduce` is honoured for layout reflow, drag preview, and any auto-pan.
- **G5.** Each WC implements one named APG pattern fully (Window Splitter; Tabs + Window Splitter + DnD-keyboard-alt for dock; Grid for scheduler; Grid-or-Region for tile-manager) — required attributes verbatim, recommended where they meaningfully help.
- **G6.** ARIA work lives in the Lit WC, not the Angular wrapper. Wrappers stay thin.

**Non-goals**

- WCAG AAA. AA is the bar.
- Re-architecting the WCs to share a base class. Each component implements its own pattern; the only shared primitive introduced here is the live announcer (§7).
- A `BsRovingFocusDirective` inside the Lit WCs. The Angular roving-focus directive can't run there — each WC implements its own roving-focus loop, kept small and inline.
- Backwards-compatibility shims for current consumers. If a tile-manager consumer was relying on every tile being `tabindex="0"`, they get the new roving-focus model after this lands. Document, don't shim. (See memory: *BC is not a default constraint*.)

## 3. Scope

**In scope:**

- `libs/mintplayer-ng-bootstrap/web-components/splitter/` — `mp-splitter`
- `libs/mintplayer-ng-bootstrap/web-components/tab-control/` — `mp-tab-control` (already mostly compliant; one gap on tab-panels)
- `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/` — `mint-dock-manager`
- `libs/mintplayer-ng-bootstrap/web-components/scheduler/` + `scheduler-core/` — `mp-scheduler`
- `libs/mintplayer-ng-bootstrap/tile-manager/src/lib/web-components/` — `mint-tile-manager`

**Out of scope:**

- The Angular wrapper layer for these (`bs-dock-manager`, `bs-tile-manager`, `bs-scheduler`, `bs-splitter` if it exists). Wrappers will need template tweaks only if a label/id needs to be forwarded; track those in the per-component checklists, not as a separate workstream.
- `mint-multi-range`, which already shipped with full APG slider conformance (commit `75315da`).
- `mp-tab-control`'s tab-switching keyboard model — already complete (see audit notes); only the missing tab-panel role/labelledby is in scope.

## 4. Methodology

4 parallel research agents (one per component) each reported, with file:line refs:

- Render path (WC class, render template, sub-templates, Angular wrapper)
- Current `role` / `aria-*` / `tabindex` state — static and dynamic
- Keyboard support today — what's wired, what isn't
- Gaps vs. the matching APG pattern
- Live regions / announcements
- Severity classification per concern
- Remediation outline + open questions

Findings are consolidated below by component. Cross-cutting concerns (live announcer, move-mode interaction model) are pulled out into §7.

## 5. Findings — by component

### 5.1 `mp-splitter` — **Critical**

The divider is a semantic black hole. **Zero ARIA, zero keyboard support, zero `tabindex`** on the dynamically-created `.divider` divs.

| Aspect | Current state | File:line |
|---|---|---|
| Divider role | None | `mp-splitter.ts:215–221` |
| Divider keyboard | None — pointer-only | `input/input-handler.ts:31–79` |
| `aria-orientation` | None | — |
| `aria-valuenow` / `min` / `max` | None | — |
| `aria-controls` to adjacent panels | None; panels have no IDs | `mp-splitter.ts:199–212` |
| `aria-label` | None | — |
| `tabindex="0"` on dividers | Missing | — |

**Precedent:** `BsResizeGlyphDirective` (`libs/mintplayer-ng-bootstrap/resizable/src/lib/components/resizable.component.ts:14–17`, `247–282`, commit `94d314c5`) already implements APG Window Splitter for an Angular glyph — same role/label/orientation/keyboard. Mirror that here.

**Severity: Critical.** Splitter is invisible and inoperable to keyboard + SR users. Violates WCAG 2.1.1 (Keyboard) and 4.1.2 (Name, Role, Value).

### 5.2 `mint-dock-manager` — mixed: 1 Critical, 4 Major

The tab-switching surface is **fully accessible** (`mp-tab-control` does the heavy lifting — APG Tabs pattern complete, including roving tabindex + ArrowLeft/Right/Home/End). Everything else is broken.

| Concern | Current state | File:line |
|---|---|---|
| **Tab panels** | Missing `role="tabpanel"` + `aria-labelledby` on the content wrapper | `mp-tab-control.ts:172–178` |
| **Splitter dividers** | Inherits all of `mp-splitter`'s gaps (§5.1) | — |
| **Intersection handles** (2D split crossings) | `role="separator"` + generic `aria-label` set, but no `aria-orientation`, no `aria-valuenow/min/max`, no keyboard handler | `mint-dock-manager.element.ts:737–757` |
| **Drop joysticks** | `<button type="button">` with `aria-label="Dock to top/left/center/right/bottom"` — **good** | template lines 13–58 |
| **Floating panes** | `<div>` wrappers — no `role="dialog"`, no `aria-label`, no close button, no keyboard equivalents for any interaction | `mint-dock-manager.element.ts:534–560` |
| **Floating-pane resizers** (8 per pane) | Bare `<div>` — no role, no orientation, pointer-only | `mint-dock-manager.element.ts:583–625` |
| **Drag-to-move panes** (tab→float, dock→dock) | **Pointer-only. No keyboard alternative.** | `mint-dock-manager.element.ts:1093–1260, 1536–1558` |
| **Live region** | None. Layout changes (`dispatchLayoutChanged` at lines 1296, 1358, 1472, 1600) are silent to AT | — |

**Severity:**
- **Critical** — drag-to-move keyboard alternative (move-mode); blocks blind/keyboard-only users entirely.
- **Major** — tab-panel roles, divider keyboard/ARIA (covered by §5.1 fix to `mp-splitter`), floating-pane semantics (role + label + close button), live region for layout changes.
- **Minor** — pane-host `role="region"` + `aria-label` (only when pane content is document-like).

### 5.3 `mp-scheduler` — **Critical** across the board

The timeline is **invisible to AT** except for the header buttons. No grid roles, no event labels, no keyboard alternative to drag, no live region.

| Aspect | Current state | File:line |
|---|---|---|
| Header nav buttons (prev/next/today/view) | Native `<button>` with `title` — **partial: titles aren't always picked up; needs `aria-label`** | `mp-scheduler.ts:316–370` |
| View-switcher active state | `.active` class only — no `aria-pressed` / `aria-current` | `mp-scheduler.ts:357–364` |
| Timeline grid container | No `role="grid"`, no label | `views/timeline-view.ts:24–111` |
| Resource rows | No `role="row"`, no `aria-rowindex` | `views/timeline-view.ts:115` |
| Resource header column | No `role="rowheader"` | `views/timeline-view.ts:122–136` |
| Time-axis headers | No `role="columnheader"` | `views/timeline-view.ts:82–87` |
| Time-slot cells | No `role="gridcell"`, no `tabindex` | `views/timeline-view.ts:150–158` |
| Event blocks | Bare `<div>`. **Not focusable. No label. No role.** Text content = title only | `views/timeline-view.ts:243–289` |
| Selected-event styling | `.selected` class — no `aria-selected` / `aria-current` | — |
| Keyboard event-move | None — all drag is pointer-only | `input/input-handler.ts:113–150` |
| Live region | None | — |
| Day/view shortcuts (T/Y/M/W/D) | Wired but **undiscoverable** — no announced help text | `mp-scheduler.ts:655–704` |
| Resource-group expand/collapse | `aria-expanded` not set on group header | `views/timeline-view.ts:126–129` |
| `prefers-reduced-motion` | Not honoured for auto-pan / drag preview | `styles/scheduler.styles.ts` |

**Other views:** Same gaps in `week-view.ts`, `day-view.ts`, `month-view.ts`, `year-view.ts` — fix once in a shared helper, apply across all renderers.

**Severity: Critical** for grid roles, event labels, and DnD-keyboard-alt; **Major** for live region, view-switcher state, group `aria-expanded`; **Minor** for reduced-motion.

### 5.4 `mint-tile-manager` — partially started, 6 Major gaps

The recent commit `ca7a0c9d` ("perf(tile-manager): cache layout metrics; tighten packer hot paths; fix ARIA grid hierarchy") shipped the foundation: `role="grid"` on the container, `role="row"` wrapper, `role="gridcell"` + `tabindex="0"` on each tile, a polite live region, Space-to-enter-move-mode + arrow-keys + Shift-resize + Enter/Escape, and `prefers-reduced-motion` honoured. That's substantial — but six gaps remain.

| Aspect | Current state | File:line |
|---|---|---|
| Grid container `aria-label` | Optional consumer-provided; **no fallback** when unset | `mint-tile-manager.element.ts:141` |
| Tile grid coords | No `aria-rowindex` / `aria-colindex` / `aria-rowspan` / `aria-colspan` (despite `role="grid"`) | `mint-tile-manager.element.ts:170–203` |
| Tile keyboard hint | No `aria-describedby` to a hidden instructions string ("Space to move, Shift+arrow to resize…") | same |
| Live region role | `aria-live="polite"` only — no explicit `role="status"` | `mint-tile-manager.element.ts:150` |
| Roving tabindex | All tiles `tabindex="0"`; no Home/End/ArrowUp/Down between tiles | `mint-tile-manager.element.ts:173, 813–894` |
| Discoverability of move mode | No visual or announced cue that **Space** activates move mode on Tab-into-board | — |
| Drag-begin / drag-blocked announcements | Pointer drag emits no live message; only commit does | `mint-tile-manager.element.ts:532, 613, 689` |

**Pattern decision (resolved §10 Q1):** switch to `role="region"` with managed focus and `role="button"` on tiles. The grid hierarchy `ca7a0c9d` shipped is walked back — dynamic dimensions don't fit a static grid contract well, and the region pattern reads cleaner for a freeform tile board.

**Severity: Major** across all six.

## 6. Cross-cutting findings

### 6.1 Drag-and-drop keyboard alternative — shared interaction model

Three of four WCs (dock, scheduler, tile-manager) have pointer-only drag. The shared keymap is **`M` to enter move/resize mode**, arrow keys nudge, Enter commits, Escape cancels, live region narrates each step. Tile-manager already implements the model (it shipped using Space — Phase 3 retrofits it to `M` to align library-wide; see §10 Q2 decision). Concretely:

| Component | Trigger | Arrows | Shift+arrows | Enter | Escape |
|---|---|---|---|---|---|
| `mp-splitter` divider | Focused divider (Tab) | resize ±10% | resize ±1% (fine) | (commit live; no separate "enter mode") | revert to drag-start size |
| `mint-tile-manager` tile | `M` on focused tile | move 1 cell | resize 1 cell | commit | cancel |
| `mint-dock-manager` tab/pane | `M` on focused tab header | cycle through drop targets (dock zones + floating windows) | — | commit move | cancel |
| `mp-scheduler` event block | `M` on focused event | nudge by `slotDuration` along time axis; up/down = next resource row | — | commit | revert to original time |

Splitter is the simplest (no separate "mode" — focus + arrows immediately resize, like the existing `BsResizeGlyphDirective`). Dock is the most complex (move targets are a list, not a 2D grid). Tile-manager is the precedent for the modal pattern.

### 6.2 Live announcer — share the primitive

All four WCs need a polite live region. The Angular layer already has `BsLiveAnnouncer` (per companion PRD §11). For the Lit WCs, introduce a small shared helper:

- **File:** `libs/mintplayer-ng-bootstrap/web-components/a11y/src/live-announcer.ts` (new entry point)
- **API:** `createLiveAnnouncer(host: HTMLElement): { announce(msg: string): void; dispose(): void }`
- **Implementation:** appends a visually-hidden `<div role="status" aria-live="polite" aria-atomic="true">` to the host's shadow root; debounces identical messages; clears after 1s so the same message can re-announce.

Each WC instantiates one in `connectedCallback`, disposes in `disconnectedCallback`. No service injection, no Angular DI dependency.

### 6.3 Shadow DOM and `aria-controls` / `aria-labelledby`

ID references **do** cross the shadow boundary in spec, but real-world SR support is uneven. Three rules of thumb that came out of the audits:

1. **Same-tree references work everywhere.** Both ends in the same shadow root → reliable.
2. **Light → shadow references work in modern browsers** (e.g. tab header in light DOM `aria-labelledby` of a tabpanel in shadow DOM). Test with NVDA.
3. **Shadow → light references are the brittle case** (`aria-controls` from a shadow divider to a light-DOM panel). Avoid this — assign the panels stable IDs and keep the reference within shadow, or re-emit the panel into shadow as a slotted host.

For `mp-splitter`: panels are projected via named slots (`slot="panel-${index}"`). The divider lives in shadow; the panels live in light. Use a host-level data attribute (`data-panel-ids="..."`) or a public getter so dividers can resolve adjacent panel IDs without crossing the boundary in `aria-controls`.

### 6.4 `prefers-reduced-motion`

Tile-manager already honours it (template.ts:190–197). The other three don't:
- `mp-splitter` — drag preview is JS-driven, no transition; check no animation is added later
- `mint-dock-manager` — pane reflow / floating drag, no reduced-motion guards
- `mp-scheduler` — auto-pan during drag-near-edge, no guard

Single-line CSS guard in each `*.styles.ts` is enough.

## 7. Plan — phased rollout

Each phase ships as one PR. Within each phase, audits + tests land with the implementation.

### Phase 0 — Shared primitives (1 PR)
- **0.1** Add `libs/mintplayer-ng-bootstrap/web-components/a11y/` entry point with `createLiveAnnouncer()` (§6.2).
- **0.2** Document the move-mode interaction model in `docs/prd/wc-aria-accessibility.md` §6.1 (this file). Reference from each component's audit.

### Phase 1 — `mp-splitter` (1 PR)
- **1.1** `mp-splitter.ts:215–221` divider creation: emit `role="separator"`, `aria-orientation`, `aria-label`, `tabindex="0"`. ([precedent](../../libs/mintplayer-ng-bootstrap/resizable/src/lib/components/resizable.component.ts))
- **1.2** `mp-splitter.ts:199–212` panel wrappers: assign deterministic IDs (`{instanceId}-panel-{i}`); expose adjacent-pair IDs to dividers via a host-level data attribute (§6.3).
- **1.3** Track current/min/max sizes per divider; mirror to `aria-valuenow/min/max` as **percent of container** (§10 Q3) live during drag (subscribe `stateManager.previewSizes`, divide by container size each frame).
- **1.4** New `input-handler.ts` keydown branch — Arrow keys ±10% (Shift = ±1%), Home/End to min/max, modelled on `BsResizeGlyphDirective.onKeydown` (`resizable.component.ts:247–282`).
- **1.5** Vitest: `mp-splitter.a11y.spec.ts` — assert role/label/orientation, focus, and that ArrowLeft on horizontal-orientation shrinks left panel by 10px.

### Phase 2 — `mp-tab-control` tab-panel role (1 small PR)
- **2.1** `mp-tab-control.ts:172–178` — bind `role="tabpanel"` + `aria-labelledby="{tabId}-header-button"` on the active content wrapper.
- **2.2** Vitest assertion in existing `mp-tab-control.spec.ts`.

### Phase 3 — `mint-tile-manager` (1 PR)
Decision recorded (§10 Q1): switch from `role="grid"` to `role="region"` + `role="button"` tiles. Decision recorded (§10 Q2): retrofit move-mode key from Space to `M`.
- **3.1** `mint-tile-manager.element.ts:141` — replace `role="grid"` with `role="region"`; fallback `aria-label="Tile board"` when consumer doesn't pass `label`. Drop the `role="row"` wrapper (line 142, added in `ca7a0c9d`).
- **3.2** `mint-tile-manager.element.ts:170–203` — replace `role="gridcell"` on each tile with `role="button"`; tiles keep their consumer-provided `aria-label`. Remove host's `role="application"` set in `connectedCallback` (lines 271–274) — region pattern doesn't need it.
- **3.3** `mint-tile-manager.element.ts:150` — add `role="status"` to the live region.
- **3.4** Hidden `<div id="tile-instructions">` near the live region with the keymap text ("Press M to enter move mode. In move mode, arrow keys move, Shift+arrow resizes, Enter commits, Escape cancels."); tiles set `aria-describedby="tile-instructions"`.
- **3.5** Roving tabindex: track `focusedTileId` in element state; render only the focused tile with `tabindex="0"`, others `tabindex="-1"`. Wire ArrowUp/Down/Left/Right and Home/End in `onTileKeyDown` to move focus between tiles in row-major order **when not in move mode**. Inside move mode, arrows still control the active tile's position/size.
- **3.6** Retrofit move-mode trigger key from Space → `M` (`onTileKeyDown` at `mint-tile-manager.element.ts:813–841`). Update the live-region message at line 821 to reflect the new key. **Breaking change** — document in the changelog; per BC memory, no shim.
- **3.7** Pointer drag — call `liveAnnouncer.announce()` on drag-begin and on `blocked: true` reflow result (`element.ts:613, 689`).
- **3.8** Vitest: rewrite the role/keyboard assertions in `mint-tile-manager.element.spec.ts` for the region+button+M model.

### Phase 4 — `mint-dock-manager` non-DnD ARIA (1 PR)
- **4.1** Use the live announcer (Phase 0) to narrate `dispatchLayoutChanged` calls (lines 1296, 1358, 1472, 1600) — "Pane X moved to dock {zone}", "Floating pane X closed", "Split resized".
- **4.2** Floating pane wrapper (`element.ts:534–550`): `role="dialog"`, `aria-label` from `getFloatingWindowTitle()`, `aria-modal="false"`.
- **4.3** Add a real close button to `.dock-floating__chrome` (`element.ts:551–560`): `<button aria-label="Close pane: {title}">×</button>`. Native button = native keyboard.
- **4.4** Floating-pane resizers (`element.ts:583–625`): `role="separator"` + `aria-orientation` per side.
- **4.5** Intersection handles (`element.ts:737–757`) — extend role/label that already exist with `aria-orientation` (the cross-handle is bidirectional; emit `"horizontal"` or split into two co-located handles, one per axis).
- **4.6** Vitest: `mint-dock-manager.a11y.spec.ts` assertions for tab-panel role, floating dialog role, close button, live announcements.
- **NB.** Splitter ARIA on the dock's nested `<mp-splitter>` lands automatically with Phase 1; Phase 4 inherits it.

### Phase 5 — `mp-scheduler` grid + labels (1 PR)
- **5.1** Grid roles in `views/timeline-view.ts`: `role="grid"` + `aria-label` + `aria-rowcount` + `aria-colcount` on `.scheduler-timeline` (line 32); `role="row"` + `aria-rowindex` on resource rows (line 115); `role="rowheader"` on resource header (line 122); `role="columnheader"` on slot headers (line 82); `role="gridcell"` + `tabindex="-1"` on slots (line 150).
- **5.2** Event blocks (`views/timeline-view.ts:243–289`): `role="button"`, descriptive `aria-label` (`"{title}, {start}–{end} on {resource}, {date}"`), roving `tabindex` (selected event = 0, others = -1), `aria-current="true"` when selected.
- **5.3** Header view-switcher (`mp-scheduler.ts:357–364`): `aria-pressed="{active}"` on each view button.
- **5.4** Resource-group toggles (`views/timeline-view.ts:126–129`): wrap header in `<button>` with `aria-expanded`.
- **5.5** Live announcer for `event-update`/`event-create`/`event-delete`/`view-change` (`scheduler-event-emitter.ts:7–97`).
- **5.6** `prefers-reduced-motion` guard in `scheduler.styles.ts` for auto-pan.
- **5.7** Mirror the same role/label set in `views/{week,day,month,year}-view.ts`. Hoist the labelling helper to `views/base-view.ts` or a new `views/aria.ts`.
- **5.8** Vitest: `mp-scheduler.a11y.spec.ts` — assert grid roles, event labels, view-switcher pressed state.

### Phase 6 — `mp-scheduler` keyboard event-move (1 PR, separate from Phase 5)
- **6.1** Roving focus across grid cells: only one cell `tabindex="0"`; `mp-scheduler.ts:655–704` `handleKeyDown` handles ArrowLeft/Right/Up/Down between cells, Home/End row edges, Ctrl+Home/End grid edges. Reuse the cell-grid focus model in `mint-tile-manager` Phase 3 if it generalises.
- **6.2** Tab into board lands on first cell (or selected event if any).
- **6.3** `M` on focused event → enter move mode (set `data-move-mode` on event, announce keymap).
- **6.4** ArrowLeft/Right while in move mode → call `dragManager.nudgeEventTime(±slotDuration)`; live region announces new start time (verbose first nudge, terse afterwards).
- **6.5** Enter → commit via existing `handleDragComplete()` path (`mp-scheduler.ts:576–593`).
- **6.6** Escape → revert via existing drag-cancel path.
- **6.7** Resize and multi-day are out of scope for v1 (per audit recommendation Q4); document as v2 follow-ups.
- **6.8** Vitest: extend `mp-scheduler.a11y.spec.ts`.

### Phase 7 — `mint-dock-manager` move-mode for panes (1 PR, biggest)
- **7.1** Move-target enumeration: build the list of valid drop destinations (dock zones × stacks + each floating window). Hoist from the pointer drop-zone code (`element.ts:1223–1260`) so the same model serves both inputs.
- **7.2** Tab-header keymap: focused tab → `M` → enter move mode → arrow keys cycle the move-target list → live region narrates current target.
- **7.3** Enter commits via existing pane-move pipeline; Escape cancels.
- **7.4** Cross-cutting: pressing Escape during *any* drag (pointer or keyboard) cancels and announces.
- **7.5** Vitest + a Playwright smoke spec in `apps/ng-bootstrap-demo-e2e/` for the move-mode happy path.

### Phase 8 — Polish (1 PR)
- **8.1** `prefers-reduced-motion` guards across dock and scheduler.
- **8.2** `axe-core/playwright` run on the dock, scheduler, and tile-manager demo pages; capture baseline; fail CI on `critical`/`serious`.
- **8.3** Surface the keymap on the demo pages — this is part of the deliverable, not a nice-to-have. Each affected demo page (`apps/ng-bootstrap-demo/src/app/pages/advanced/{dock,tile-manager}/`, scheduler equivalent, splitter equivalent) gets a visible "Keyboard shortcuts" panel listing the keys for that component, e.g.:
  - **`M`** — enter move/resize mode (tile-manager, dock pane, scheduler event)
  - **Arrow keys** — move 1 unit (or resize with Shift) while in move mode; navigate between focused items otherwise
  - **Enter** — commit the move/resize
  - **Escape** — cancel and revert
  - **Tab / Shift+Tab** — move focus between tiles / events / panes / dividers
  - **Home / End** — first / last in row (grid components) or min / max (splitter)

  The keymap is also exposed in-component via the `aria-describedby` instructions string (see Phase 3.4, Phase 5.x, Phase 7.2), so SR users get the same content. The visible panel covers sighted keyboard users who don't read SR text.

## 8. Severity matrix

| Component | Critical | Major | Minor |
|---|---|---|---|
| `mp-splitter` | role/label/keyboard on dividers | — | reduced-motion when transitions land |
| `mp-tab-control` | — | tab-panel role + labelledby | — |
| `mint-dock-manager` | DnD keyboard alternative (panes) | tab-panel inherits; floating-pane semantics; live region; intersection-handle valuenow | pane-host region label |
| `mp-scheduler` | grid roles; event labels + focusability; DnD keyboard alternative (events) | live region; view-switcher pressed; group expanded | reduced-motion auto-pan |
| `mint-tile-manager` | — | grid coord attrs; instructions describedby; live-region role; roving tabindex; move-mode discoverability; drag-begin announcements | role-choice settled |

## 9. Test strategy

Mirroring the companion PRD §7:

- **Unit (Vitest 4)** — per-component `*.a11y.spec.ts` next to existing specs. Assert the *exact* attribute set after `connectedCallback` + after each user interaction. Positive presence, not just "no axe violations".
- **Integration (Vitest, jsdom)** — fire keyboard events, assert state transitions (move mode in → arrow → commit → out) and live-region content.
- **E2E (Playwright + `@axe-core/playwright`)** — extend the existing `apps/ng-bootstrap-demo-e2e/` specs for dock, scheduler, tile-manager, splitter demo pages. Fail on `critical`/`serious` violations.
- **Manual SR pass** — NVDA/Firefox + JAWS/Chrome on Windows, VoiceOver/Safari on macOS, once per phase. Documented in PR descriptions.

## 10. Open questions

All seven resolved 2026-05-10 ahead of implementation.

1. **Tile-manager: `role="grid"` vs. `role="region"`?**
   - **Decision: `role="region"`.** Walk back the grid hierarchy `ca7a0c9d` shipped. Tiles become `role="button"`; the row wrapper and `role="application"` are dropped. Cleaner for a dynamic, freeform layout where grid dimensions drift under user interaction.

2. **Dock move-mode trigger key — Space, `M`, or `Enter`?**
   - **Decision: `M`.** Mnemonic for "move", aligns with APG examples. Tile-manager (which shipped using Space in `ca7a0c9d`) is retrofitted to `M` in Phase 3 step 3.6 — breaking change, no shim. `M` is the single library-wide trigger across tile-manager, dock, scheduler.

3. **Splitter `aria-valuenow` in pixels or percent?**
   - **Decision: percent of container.** More intuitive for SR users ("50%"); arrow steps are 10% (Shift = 1%). Conversion happens once per drag-preview frame — negligible cost.

4. **Scheduler keyboard nudge granularity?**
   - **Decision: `options.slotDuration`.** Matches the visual snap users learn from drag. Already exposed at `mp-scheduler.ts:156–159`.

5. **Scheduler full grid vs. region+buttons?**
   - **Decision: full `role="grid"`.** Worth the ~200 LOC cost for the AT experience on a complex widget.

6. **Move-mode in the WC or the Angular wrapper?**
   - **Decision: Lit WC.** Keymap lives where the DOM lives. Wrappers stay thin. Layout-change reactions flow through CustomEvents.

7. **Cross-shadow `aria-controls` reliability** (§6.3).
   - **Decision: auto-generate panel IDs internally.** `mp-splitter` assigns deterministic IDs (`{instanceId}-panel-{i}`) to its slot wrappers and exposes the divider→panel adjacency via a host-level data attribute. Zero consumer burden.

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Move-mode keymap collides with consumer keyboard handlers | All keys handled in capture phase only when focus is on a controlled element (tile/event/tab). Browser default actions explicitly preventDefault'd only when a mode is active. |
| Roving tabindex breaks existing consumers relying on every tile/event being individually tab-focusable | Document as a breaking change in the PR; add a `legacyTabindex` opt-out only if a consumer raises it. (Memory: BC is not a default constraint.) |
| Live region spam during fast drag | Debounce at the announcer (200ms tail-coalesce); skip if consecutive messages are equal. |
| `prefers-reduced-motion` regression on already-shipped tile-manager | Existing CSS branch covers it; new code lands in CSS, not JS, so the existing guard applies. |
| SR support for cross-shadow `aria-labelledby` | Restrict to same-tree references (§6.3) when ambiguous; verify in NVDA + JAWS pass before each phase merges. |

## 12. Out-of-scope follow-ups (not blocking this PRD)

- Scheduler keyboard event-resize (audit Q4) — v2.
- Scheduler multi-day event keyboard model — v2.
- Dock floating-pane modal trapping for "keep focus inside" — only if consumer demand surfaces.
- A shared `@mintplayer/wc-a11y` package extracted from §6.2's helper — defer until a third WC consumer appears.
