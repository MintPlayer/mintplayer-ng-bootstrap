# Product Requirements Document: Overlay Controller — CDK-parity Positioning

**Issue**: TBD (no GitHub issue yet)
**Title**: Vanilla-TS / Lit overlay primitive with scroll-aware positioning
**Status**: Draft — awaiting approval
**Created**: 2026-05-14
**Last Updated**: 2026-05-14

---

## Overview

Replace the static `OverlayController` (`libs/mintplayer-ng-bootstrap/web-components/a11y/src/overlay-controller.ts`) with a richer, framework-agnostic positioning primitive that mirrors the relevant behaviour of Angular CDK's `FlexibleConnectedPositionStrategy` + `scrollStrategies.reposition()` — but as **pure vanilla TS / Lit code with zero `@angular/cdk` dependency** so the WC layer stays framework-agnostic.

The current controller positions once at open time. Once any scrollable ancestor (or the page itself) scrolls, the overlay loses its anchor and either floats away or lands outside the viewport. The new primitive must:

- **(a) Track the anchor on scroll/resize** so the overlay stays glued to its trigger.
- **(b) Always stay fully visible on-screen** — clamp + flip vertically.
- **(c) Accept multiple candidate position pairs** and pick the first one that fits (origin corner × overlay corner alignment).
- **(d) Remain visible even when the anchor scrolls off-screen** — pin to viewport edge as a sticky fallback.

Same release migrates the Lit consumers that need scroll-awareness (`mp-datepicker`, `mp-timepicker`, `mp-datetime-picker`, `mp-ribbon-group` popup, `mp-ribbon-tab` overflow chevron) onto the new API. The Angular `bsDropdown` directive continues to use Angular CDK — no migration there; this PRD is exclusively about the WC layer.

The user-visible motivation: the new datetime picker's popup goes off-screen at the bottom of the demo page, and ribbon dropdowns lose their anchor when the page scrolls past the tab strip.

---

## Goals & Objectives

### Primary Goals

- Match Angular CDK's `flexibleConnectedTo` + `withPositions` + `scrollStrategies.reposition` *behaviour* in a vanilla-TS class usable from any Lit element.
- Land sticky-anchor fallback (goal d) — a feature **CDK does not directly provide**, but which the user needs for the ribbon (dropdown remains visible after the tab strip scrolls past the viewport).
- Design the cleanest API for the task. No backwards-compatibility constraints (per [[feedback_breaking_changes_ok]]) — consumers update their imports and call sites in the same release. Document breaking changes in release notes; carry no shims.
- No new third-party dependencies. No `@angular/cdk` import in the Lit layer.

### Success Metrics

- Opening any Lit popup, then scrolling the page, keeps the overlay glued to its trigger (or pinned to viewport edge once the trigger leaves the viewport).
- Datetime-picker popups never clip off-screen, regardless of trigger position on the page or device viewport size.
- Ribbon group popups + Simplified overflow chevron remain interactive when the ribbon is in a scrollable container that scrolls past the viewport.
- All existing Lit-overlay vitest specs continue to pass without modification (import paths excepted — those flip from `…/a11y` to `…/overlay`).
- New positioning specs cover the four behavioural goals end-to-end.
- New `@mintplayer/ng-bootstrap/web-components/overlay` entry < 4 kB gzipped on its own.
- `@mintplayer/ng-bootstrap/web-components/a11y` entry size *shrinks* by the size of the removed `OverlayController` — a consumer using only the live-announcer no longer pays for positioning code.
- The two entry points are independently importable (verified via `nx build` producing separate FESM bundles).

---

## Non-Goals / Out of Scope

- **Migrating the Angular `bsDropdown` directive** off Angular CDK. It already uses CDK correctly; converting it to the new primitive is out of scope.
- **Replacing CDK's `Overlay` injectable** (the portal/host system). The new primitive is positioning-only — it does not create stacking-context layers, manage backdrops, or own DOM ownership beyond positioning.
- **Animation / transition orchestration**. The primitive sets `top`/`left` on the panel; opening/closing animations remain the host's responsibility.
- **Tooltip / popover hover semantics**. Mouseover/leave delays are consumer concerns.
- **Focus trap inside the panel**. Out of scope (already covered by separate `BsOverlayStackService` + per-component focus management).
- **KeyTips badges**: explicitly stay on the simpler static-position model. They are activated by Alt, render once, and don't need scroll tracking.

---

## Reference Material

| Component | Layer | Current strategy | Scroll-aware? | Multi-position? |
|-----------|-------|------------------|---------------|-----------------|
| `bsDropdown` / menu | Angular | CDK `FlexibleConnectedPositionStrategy` | ✓ (`reposition`) | ✓ |
| `bsPopover`, `bsTooltip`, `bsContextMenu` | Angular | CDK `FlexibleConnectedPositionStrategy` | ✓ | ✓ |
| `mp-datepicker` | Lit | Current `OverlayController` | ✗ | ✗ |
| `mp-timepicker` | Lit | Current `OverlayController` | ✗ | ✗ |
| `mp-datetime-picker` (×2) | Lit | Current `OverlayController` | ✗ | ✗ |
| `mp-ribbon-group` popup | Lit | Inline ad-hoc positioning | ✗ | ✗ |
| `mp-ribbon-tab` overflow chevron | Lit | Current `OverlayController` | ✗ | ✗ |
| `mp-ribbon` KeyTips | Lit | Inline (intentionally static) | n/a | n/a |

The Angular consumers are healthy — no churn needed.

---

## Architecture

### New secondary entry point

The new primitive lives in its own secondary entry point so that consumers that only need overlay positioning don't pull in the `LiveAnnouncerController` (and vice versa). This keeps the WC layer tree-shakeable: a Lit element importing `mp-datepicker` should not transitively drag in the live-announcer code path, and an element using just the announcer shouldn't pull in scroll-listener wiring.

```
libs/mintplayer-ng-bootstrap/web-components/overlay/      NEW
├── index.ts                                              re-exports from src
├── ng-package.js                                         secondary-entry boilerplate
└── src/
    ├── index.ts                                          exports OverlayController + types
    ├── overlay-controller.ts                             the new primitive
    └── overlay-controller.spec.ts                        unit tests
```

Import path: `@mintplayer/ng-bootstrap/web-components/overlay`.

The existing `OverlayController` at `libs/mintplayer-ng-bootstrap/web-components/a11y/src/overlay-controller.ts` is **deleted**. The new class lives only at the new entry path — no re-export shim from `web-components/a11y`. The `web-components/a11y` entry stays focused on `LiveAnnouncerController` and any future a11y-only primitives.

### File moves / removals

- **Delete**: `libs/mintplayer-ng-bootstrap/web-components/a11y/src/overlay-controller.ts`.
- **Delete**: `libs/mintplayer-ng-bootstrap/ribbon/src/lib/web-components/overlay-controller.ts` (the ribbon's internal copy — superseded by the shared entry).
- **Update**: `libs/mintplayer-ng-bootstrap/web-components/a11y/src/index.ts` drops the `OverlayController` exports (keeps `LiveAnnouncerController`).
- **Add**: `libs/mintplayer-ng-bootstrap/web-components/overlay/` package as described above.

### Consumer import updates

Each affected consumer changes its import from
```ts
import { OverlayController } from '@mintplayer/ng-bootstrap/web-components/a11y';
```
to
```ts
import { OverlayController } from '@mintplayer/ng-bootstrap/web-components/overlay';
```
Same semantics on construction (additive options); only the source path changes. Affected files:

- `libs/mintplayer-ng-bootstrap/datepicker/src/lib/web-components/mp-datepicker.element.ts`
- `libs/mintplayer-ng-bootstrap/timepicker/src/lib/web-components/mp-timepicker.element.ts`
- `libs/mintplayer-ng-bootstrap/datetime-picker/src/lib/web-components/mp-datetime-picker.element.ts`
- `libs/mintplayer-ng-bootstrap/ribbon/src/lib/web-components/mp-ribbon-tab.element.ts`
- `libs/mintplayer-ng-bootstrap/ribbon/src/lib/web-components/mp-ribbon-group.element.ts` (new consumer post-migration, plus the inline-positioning replacement)
- `libs/mintplayer-ng-bootstrap/ribbon/src/lib/web-components/mp-ribbon.element.ts` (if any KeyTips path lands on the new entry)
- Any Vitest specs that import the controller directly (e.g., `overlay-controller.spec.ts` files).

### Public API surface

```ts
export type OverlayOriginX = 'start' | 'center' | 'end';
export type OverlayOriginY = 'top' | 'center' | 'bottom';

export interface OverlayPosition {
  /** Which X corner of the anchor to align from. */
  originX: OverlayOriginX;
  /** Which Y corner of the anchor to align from. */
  originY: OverlayOriginY;
  /** Which X corner of the overlay panel to align to. */
  overlayX: OverlayOriginX;
  /** Which Y corner of the overlay panel to align to. */
  overlayY: OverlayOriginY;
  /** Optional pixel offset, applied after corner alignment. */
  offsetX?: number;
  offsetY?: number;
}

export type ScrollStrategy =
  | 'reposition'   // re-position on every scroll (default; CDK parity)
  | 'block'        // block scrolling on host scrollparents while open
  | 'close'        // close on any scroll
  | 'noop';        // ignore scroll — escape hatch for cases that explicitly don't want repositioning

export interface OverlayControllerOptions {
  /**
   * Element(s) the overlay positions itself against. Pass an array for
   * fallback anchors; the controller walks them in order and uses the first
   * non-null one. Intentionally distinct from `trigger`: in many UIs the
   * natural anchor is a wrapper (e.g. a `.input-group`) while the trigger
   * that opens the overlay is just the button inside it.
   */
  anchor: () => HTMLElement | HTMLElement[] | null;
  panel: () => HTMLElement | null;
  /**
   * The interactive control that opens the overlay (typically a `<button>`).
   * Used for keyboard focus-return on close. Defaults to the active anchor
   * when unset — set this explicitly when `anchor` is a non-focusable wrapper.
   */
  trigger?: () => HTMLElement | null;
  /**
   * Ordered list of position candidates. The first one that produces a
   * panel rect fully inside the viewport (after `viewportMargin`) is used.
   * Default: [{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
   *           { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' }]
   * (the existing "below or above" behaviour).
   */
  positions?: OverlayPosition[];
  /** Pixel margin between the panel and the viewport edges. Default: 8. */
  viewportMargin?: number;
  /** How to react when scroll happens while the panel is open. Default: 'reposition'. */
  scrollStrategy?: ScrollStrategy;
  /**
   * When `true`, if the anchor scrolls outside the viewport, the panel
   * remains pinned to the nearest viewport edge instead of disappearing.
   * Default: `false` (CDK behaviour). Enable for ribbon-group popups.
   */
  stickyOnAnchorOffscreen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export class OverlayController implements ReactiveController {
  constructor(host: ReactiveControllerHost & HTMLElement, options: OverlayControllerOptions);

  /* unchanged statics — preserves Esc-stack compatibility */
  static pushFrame(): symbol;
  static releaseFrame(token: symbol): void;
  static isFrameTop(token: symbol): boolean;

  get isOpen(): boolean;
  open(): Promise<void>;
  close(returnFocus?: boolean): void;
  toggle(): Promise<void>;

  /** Manually trigger a reposition. Mostly internal; exposed for tests. */
  position(): void;
}
```

### Behaviour

#### 1. Position selection algorithm

On every position call (open, scroll, resize):

1. Resolve `trigger()` — if it returns an array, walk anchors in order; the first non-null one wins. (The "multiple candidate anchors" feature.)
2. Walk `positions` in order. For each candidate:
   a. Compute the panel's target rect by combining the anchor corner (per `originX/originY`) with the overlay corner (per `overlayX/overlayY`), plus `offsetX/offsetY`.
   b. Measure the panel's natural size (`getBoundingClientRect()`).
   c. Check: would the panel's resulting rect fit inside the viewport (minus `viewportMargin`)? If yes — apply and return.
3. If no candidate fits, apply the **last** candidate and clamp horizontally + vertically (CDK's "push" behaviour: pin to the closest viewport edge, prefer the original side).

#### 2. Scroll tracking (`scrollStrategy: 'reposition'`)

While open, attach `scroll` listeners (capture-phase, passive) on:
- `window` (page scroll).
- Every ancestor of the anchor that has `overflow: auto | scroll | hidden` (computed via `getComputedStyle`).

On any scroll event, call `position()`.

Listeners attach in `open()`, detach in `close()`. Memory-clean.

#### 3. Sticky-anchor-offscreen fallback (`stickyOnAnchorOffscreen: true`)

When the anchor's `getBoundingClientRect()` shows it is entirely outside the viewport:
- Skip the normal position algorithm.
- Clamp the panel to the **closest viewport edge** the anchor was last seen near.
- Maintain the panel's previous size and (left, top) as much as possible, just bumping it back inside the viewport.
- When the anchor re-enters the viewport, resume normal positioning.

This is the new behaviour CDK does not provide. Ribbon group popups will use this so they remain interactive even when the user has scrolled the tab strip out of view.

#### 4. Resize handling

Same scroll-strategy logic also fires on `window.resize` (debounced via `requestAnimationFrame`).

### Defaults & required options

- `anchor` (required). Accepts `HTMLElement | HTMLElement[] | null`; the element(s) the overlay positions against. Array form picks the first non-null.
- `panel` (required).
- `trigger` (optional). The interactive control (button) that opens the overlay. Used for keyboard focus-return on close. Defaults to the active anchor when unset.
- `positions` (optional). Default: `[{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' }, { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' }]` — drop below, flip above if it doesn't fit.
- `viewportMargin` (optional). Default: `8` px.
- `scrollStrategy` (optional). Default: `'reposition'`.
- `stickyOnAnchorOffscreen` (optional). Default: `false` (CDK parity). Set `true` for the ribbon group popup.

The `anchor` vs `trigger` distinction is load-bearing: a Bootstrap input-group + button picker wants the popup to align with the input's left edge (anchor = input-group div) but focus on close to return to the button (trigger = button). Conflating them caused the popup to float disconnected from the field.

---

## Functional Requirements

### Must Have (P0)

- [ ] **FR-0** — New secondary entry point `@mintplayer/ng-bootstrap/web-components/overlay` created (mirrors the `web-components/a11y` layout: `index.ts` + `ng-package.js` + `src/`). The old `OverlayController` is removed from `web-components/a11y` (not re-exported as a shim). `web-components/a11y` retains only the `LiveAnnouncerController` and related a11y primitives.
- [ ] **FR-1** — `OverlayPosition` + `ScrollStrategy` types exported from `@mintplayer/ng-bootstrap/web-components/overlay`.
- [ ] **FR-2** — `OverlayControllerOptions` accepts `trigger: () => HTMLElement | HTMLElement[] | null`. Array form picks the first non-null anchor.
- [ ] **FR-3** — `positions: OverlayPosition[]` option, walked in order. First-fitting candidate wins.
- [ ] **FR-4** — Default position list: `[{ originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' }, { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' }]` — drop below, flip above on overflow.
- [ ] **FR-5** — `viewportMargin` (default 8 px).
- [ ] **FR-6** — Scroll strategies implemented: `'reposition'` (default), `'block'`, `'close'`, `'noop'`.
- [ ] **FR-7** — Scroll listeners attach to `window` + every scrollable ancestor of the anchor on `open()`, detach on `close()`. No leaks.
- [ ] **FR-8** — Resize listener (debounced via rAF) repositions panel.
- [ ] **FR-9** — `stickyOnAnchorOffscreen: true` keeps the panel pinned to viewport edge when the anchor is fully out of viewport.
- [ ] **FR-10** — Static `pushFrame` / `releaseFrame` / `isFrameTop` API unchanged. Esc-stack semantics preserved.
- [ ] **FR-11** — `close(returnFocus)` returns focus to the **active** anchor (the one currently used for positioning), not necessarily the first in the array.
- [ ] **FR-12** — Outside-mousedown closes the panel (existing behaviour, preserved).
- [ ] **FR-13** — Vitest spec coverage for: each position candidate firing, scroll-tracking, viewport-clamp + flip, sticky offscreen fallback, multi-anchor selection.

### Migration FRs (P0)

Migration is done in the same release as the new entry point. Each consumer updates its import and call site in one commit. The new class's signature is free to be redesigned for clarity — there is no constraint to keep the old shape.

- [ ] **FR-M1** — `mp-datepicker` import swap. Validate via existing spec.
- [ ] **FR-M2** — `mp-timepicker` import swap. Validate via existing spec.
- [ ] **FR-M3** — `mp-datetime-picker` import swap (both `OverlayController` instances). Both popups gain scroll-tracking automatically via the new default `scrollStrategy: 'reposition'`.
- [ ] **FR-M4** — `mp-ribbon-tab` overflow chevron import swap.
- [ ] **FR-M5** — `mp-ribbon-group` popup migrates from its inline positioning logic to the new controller (a larger change than the others — it has its own inline `positionPopup()` method). Sets `stickyOnAnchorOffscreen: true` so the popup stays visible when the ribbon scrolls past the viewport. Existing Esc-stack behaviour preserved (`pushFrame`/`releaseFrame`/`isFrameTop` statics are now on the new entry's class).
- [ ] **FR-M6** — `libs/mintplayer-ng-bootstrap/ribbon/src/lib/web-components/overlay-controller.ts` (the ribbon's inline copy) is deleted. Any spec that imported from it switches to `@mintplayer/ng-bootstrap/web-components/overlay`.
- [ ] **FR-M7** — All existing Vitest specs across the affected packages pass.

### Should Have (P1)

- [ ] **FR-14** — `withFlexibleDimensions` analogue: when no candidate fully fits, optionally shrink the panel to fit (`maxHeight` / `maxWidth`). Off by default; opt-in via option.
- [ ] **FR-15** — Programmatic API to update positions live: `setPositions(positions)` recomputes on next open. Useful for orientation changes.
- [ ] **FR-16** — `position` event fired on the host whenever positioning runs, with detail = `{ usedPosition: OverlayPosition, anchor: HTMLElement, panel: DOMRect }`. Useful for tests and animation hooks.

### Could Have (P2)

- [ ] **FR-17** — Arrow-bubble positioning hook: expose the chosen position's "alignment side" so consumers can render a directional arrow.
- [ ] **FR-18** — Position-change observer API for IntersectionObserver-based optimization (skip scroll handlers when overlay is not visible).
- [ ] **FR-19** — Position-pair preset library (`OverlayPositions.belowStart`, `.belowEnd`, `.aboveStart`, `.cornerMenu`, etc.) for documentation/discoverability.

### Will Not Have (deferred)

- Migration of Angular CDK consumers (`bsDropdown`, `bsPopover`, `bsTooltip`, `bsContextMenu`). They're already correct.
- Backdrop / mask rendering. Out of scope.
- Animation orchestration. Host responsibility.
- Focus trap inside the panel. Existing `BsOverlayStackService` covers it for Angular; the WC layer leaves it to the host.

---

## Non-Functional Requirements

- **No new third-party dependencies**. Pure vanilla TS + DOM APIs (`getBoundingClientRect`, `getComputedStyle`, `requestAnimationFrame`, `window.addEventListener`).
- **SSR-safe**. Guard against `document` / `window` access during construction. Defer all DOM reads to `open()` / `position()` (called only in browser).
- **Bundle size**: < 4 kB gzipped addition to `@mintplayer/ng-bootstrap/web-components/a11y`.
- **Performance**: scroll handlers must use passive listeners + rAF batching. No layout thrashing.
- **Browser support**: matches library policy (latest 2 of Chrome, Firefox, Safari, Edge).

---

## Risks & Trade-offs

1. **Scroll listener overhead** — attaching to every scrollable ancestor can be costly on deep DOM trees. Mitigation: rAF-debounce position recompute; use passive listeners; document `scrollStrategy: 'noop'` as the escape hatch.

2. **Sticky-offscreen fallback is novel** — CDK doesn't have this. We risk implementing something idiosyncratic. Mitigation: gate behind `stickyOnAnchorOffscreen: true` (opt-in); document the expected behaviour clearly; cover with dedicated spec.

4. **Cross-shadow-DOM anchoring** — if the anchor lives in one shadow root and the panel in another, `getBoundingClientRect` still works (viewport-relative), but scroll-ancestor discovery needs to traverse `composedPath()`. Mitigation: walk via shadowRoot.host and parentElement; existing CDK does this; our impl follows the same playbook.

5. **Ribbon-group popup migration regression** — `mp-ribbon-group` currently has its own inline positioning + Esc-stack frame; migrating to the new controller could perturb its behaviour. Mitigation: dedicated regression spec covering the existing keyboard model (Tab into popup, Esc closes, etc.).

6. **Multi-anchor semantics may surprise consumers** — array `trigger()` is new; consumers might mis-think it means "show one panel per anchor". Mitigation: type docs + a clear example in the README.

---

## Open Questions

1. **Default scroll strategy on the ribbon's inline group popup** — should it be `'reposition'` (always follow) or `'close'` (close on scroll, matching some desktop ribbons)? *Recommendation: `'reposition'` + `stickyOnAnchorOffscreen: true` to match the user's stated requirement.*

2. **Should we expose CDK-style position labels** (`'top-start'`, `'bottom-end'`) as syntactic sugar in addition to the granular `originX/originY/overlayX/overlayY`? *Recommendation: not in v1. Granular form is unambiguous; sugar can come later.*

3. **What happens when `trigger()` array is empty** — close the panel? Keep it at last-known position? *Recommendation: close, with a `console.warn`. Reflects "no valid anchor" as a config error.*

4. **Should `stickyOnAnchorOffscreen` also affect horizontal scrolling** (anchor scrolled out left/right)? *Recommendation: yes, treated symmetrically. Simpler mental model.*

---

## Test Strategy

- **Vitest** — unit specs for: position-pair selection (each candidate firing), scroll-tracking (mock scroll events, assert reposition), viewport-clamp, vertical-flip, sticky-offscreen (mock anchor scrolled away), multi-anchor selection (first non-null wins), `scrollStrategy: 'close'` (closes on scroll), `scrollStrategy: 'block'` (prevents host scroll).
- **Existing specs as regression gates** — every Lit-overlay consumer's existing spec MUST pass without modification.
- **Playwright e2e** — a follow-up spec scrolling the datetime-picker demo down + opening the picker at the bottom, asserting the popup stays in viewport. (User-reported bug as the acceptance test.)

---

## Milestones

1. **M0 — Create the new secondary entry point** (FR-0). Add `libs/mintplayer-ng-bootstrap/web-components/overlay/{index.ts, ng-package.js, src/index.ts, src/overlay-controller.ts}`. Verify it builds as its own FESM bundle.
2. **M1 — Type definitions + scaffold** (FR-1, FR-2). Land `OverlayPosition`, `ScrollStrategy`, `OverlayControllerOptions` types; trivial unit-test of construction.
3. **M2 — Position-pair selection algorithm** (FR-3, FR-4, FR-5). First-fitting candidate wins; viewport-clamp; vertical flip. Vitest coverage.
4. **M3 — Scroll + resize tracking** (FR-6, FR-7, FR-8). Listener wiring for all four strategies; rAF batching.
5. **M4 — Sticky-anchor-offscreen fallback** (FR-9). Dedicated spec for anchor scrolled away.
6. **M5 — Multi-anchor candidate selection** (FR-11). Array `trigger()` walks; close + focus-return targets active anchor.
7. **M6 — Migrate Lit consumers** (FR-M1 through FR-M7). One commit per consumer; existing specs as regression gates. `mp-ribbon-group` is the biggest piece (migrate off its inline positioning).
8. **M7 — Remove old `OverlayController` from `web-components/a11y`** + delete the ribbon's inline copy. Verify no remaining imports.
9. **M8 — User-bug e2e** — Playwright test for the reported "datetime-picker at bottom of page" scenario.
10. **M9 — P1 items** (FR-14, FR-15, FR-16) if cheap; else deferred.

---

## References

- Investigation report (this PRD's premise): generated 2026-05-14, in conversation thread.
- Existing controller: `libs/mintplayer-ng-bootstrap/web-components/a11y/src/overlay-controller.ts`
- Angular CDK overlay docs: https://material.angular.io/cdk/overlay/overview
- CDK position pair examples in repo: `libs/mintplayer-ng-bootstrap/dropdown/src/dropdown-menu/dropdown-menu.directive.ts`, `libs/mintplayer-ng-bootstrap/context-menu/src/context-menu.directive.ts`
- Affected Lit consumers:
  - `libs/mintplayer-ng-bootstrap/datepicker/src/lib/web-components/mp-datepicker.element.ts`
  - `libs/mintplayer-ng-bootstrap/timepicker/src/lib/web-components/mp-timepicker.element.ts`
  - `libs/mintplayer-ng-bootstrap/datetime-picker/src/lib/web-components/mp-datetime-picker.element.ts`
  - `libs/mintplayer-ng-bootstrap/ribbon/src/lib/web-components/mp-ribbon-group.element.ts`
  - `libs/mintplayer-ng-bootstrap/ribbon/src/lib/web-components/mp-ribbon-tab.element.ts`
- User-reported bug: datetime-picker popup at bottom of demo page clips off-screen; ribbon dropdowns lose anchor on page scroll.
