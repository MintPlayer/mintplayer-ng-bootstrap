# PRD: Post-review fixes for `feat/aria-accessibility` (PR #327)

**Status:** Draft — to be handled on this branch before merge
**Author:** Pieterjan (with review input from Claude + gemini-code-assist bot on PR #327)
**Date:** 2026-05-10
**Library:** `@mintplayer/ng-bootstrap/a11y`, `@mintplayer/ng-bootstrap/dropdown`, `@mintplayer/ng-bootstrap/popover`, `@mintplayer/ng-bootstrap/tooltip`, `@mintplayer/ng-bootstrap/priority-nav`, `@mintplayer/ng-bootstrap/modal`
**Branch context:** lands directly on `feat/aria-accessibility` — these are review findings on PR #327, not a separate workstream. Folded into the same PR per the project rule that follow-up work stays in the current PR.

---

## 1. Why now

PR #327 touches 240 files and adds the `@mintplayer/ng-bootstrap/a11y` entry point (`BsRovingFocus`, `bsCombobox`, `BsOverlayFocus`, `BsLiveAnnouncerService`). Three issues in those new primitives — and one cross-cutting bug they exposed — surfaced during review:

1. **Arrow / Home / End keyboard handlers swallow events when `Alt`/`Ctrl`/`Meta` is held.** Browsers and the OS reserve those modifier+arrow combinations for navigation (back/forward, word-by-word, workspace switch). A roving-focus or combobox that consumes them breaks the user's expected shortcuts. Flagged on `BsRovingFocusDirective.onKeydown` (`roving-focus.directive.ts:70`) and `BsComboboxDirective.onKeydown` (`combobox.directive.ts:61`) by gemini-code-assist; independently confirmed in the manual review.
2. **`BsOverlayFocus.focusFirstTabbable` reimplements a tabbable selector** instead of using CDK's `InteractivityChecker`. CDK already ships the canonical implementation, and the local copy will drift over time as CDK fixes edge cases (form controls inside disabled fieldsets, `inert` ancestors, etc.).
3. **Global `Escape` listeners across overlays don't coordinate with each other.** A popover under a modal closes both on a single Escape; a tooltip behind a dropdown menu closes when the dropdown should be closing first. Flagged on `popover.directive.ts:onEscape` by gemini-code-assist, but the bug is library-wide — `popover`, `tooltip`, `priority-nav`, `dropdown-menu`, and `modal` all bind `(document:keydown.escape)` (or equivalent host listener) and consume it unconditionally. The fix is one shared overlay-stack service and a `topOfStack === me` guard on every Escape handler.

All three are small, concrete fixes. They belong in PR #327 itself — the primitives ship in this PR, so any contract gaps should be closed before users start adopting them. The overlay-stack work is bigger than the other two, but it's the right shape for the bug and folding it into this PR keeps the cross-cutting fix in the same PR as the new a11y entry point that hosts it.

## 2. Goal

Close the three contract gaps surfaced on PR #327 so the branch ships with primitives that behave correctly under modifier-key combinations, inherit CDK's tabbable definition, and don't fight each other for Escape.

After this PRD lands:

- `BsRovingFocus` and `bsCombobox` keyboard handlers no-op when `Alt`/`Ctrl`/`Meta` is held, leaving the event for the browser/OS.
- `BsOverlayFocus` delegates "first tabbable" detection to CDK's `InteractivityChecker.isFocusable` + tree walk.
- A single `BsOverlayStackService` in `@mintplayer/ng-bootstrap/a11y` tracks open overlays in a LIFO stack; `popover`, `tooltip`, `priority-nav`, `dropdown-menu`, and `modal` all push on open / release on close and gate their Escape handler on `stack.isTop(myId)`.
- Unit tests assert all three behaviours so future edits can't regress them.

## 3. Scope

**In scope:**

- `BsRovingFocusDirective.onKeydown` — early-return when `event.altKey || event.ctrlKey || event.metaKey`. Applies to all six handled keys (Arrow{Up,Down,Left,Right}, Home, End). `Shift` is **not** in the guard list — Shift+Arrow is a legitimate range-extension chord some consumers may want, and no browser/OS shortcut conflicts with Shift+Arrow on the keys we handle.
- `BsComboboxDirective.onKeydown` — same guard, but **scoped to non-Tab keys**. Tab handling already uses `event.shiftKey` for shift-tab, and Ctrl+Tab / Alt+Tab don't reach JS in any browser, so leaving Tab unguarded is safe and necessary.
- Unit tests for both directives — assert that pressing Alt+ArrowDown does not move the active item and does not call `preventDefault`. Tests live in the existing `roving-focus.spec.ts` and a new combobox spec (no combobox unit-spec exists today; we add one focused on this surface).
- `BsOverlayFocusDirective.focusFirstTabbable` — replace the hand-rolled selector with CDK's `InteractivityChecker`-driven tree walk. The change is implementation-only; the input contract (`initialFocus: 'first' | 'self' | 'none' | HTMLElement`) is unchanged. Existing `overlay-focus.spec.ts` continues to apply.
- **New `BsOverlayStackService`** under `@mintplayer/ng-bootstrap/a11y/overlay-stack`. Surface kept minimal: `push(): symbol`, `release(token: symbol): void`, `isTop(token: symbol): boolean`, `peek(): symbol | null`. LIFO; release of a non-top token is allowed (an inner overlay closing on its own without Escape). Re-exported from the `a11y` barrel. Provided in `'root'`.
- **Wire all five overlays** to the stack:
  - `popover.directive.ts` — push when `isVisible` flips to true, release when it flips to false (existing `effect`); guard `onEscape` on `stack.isTop(myToken)`.
  - `tooltip.directive.ts` — same pattern around show/hide.
  - `priority-nav.component.ts` — push/release around the overflow-menu open state.
  - `dropdown-menu.directive.ts` — push/release tied to the dropdown's `isOpen` signal.
  - `modal-host.component.ts` — push when `isOpen` flips to true, release on false; guard the host `keydown` Escape branch on `stack.isTop(myToken)`.
- Unit tests for the service (push/release ordering, `isTop` correctness, release-non-top no-op) and one integration test per nesting case the bug actually manifests in: popover-under-modal Escape closes only the modal; tooltip-under-popover Escape closes only the popover.

**Out of scope (deliberate):**

- **Offcanvas in the stack.** `bs-offcanvas` doesn't currently bind a global Escape — its dismiss path is the close-button + outside-click. Adding it to the stack now would be speculative wiring; it can join when it grows an Escape handler.
- **Context-menu in the stack.** Same reason — no global Escape today.
- **`BsLiveAnnouncerService` per-source dedupe key.** The current global `last-message` dedupe is correct for the announcement model the library actually uses (one component announces at a time per logical region). Adding per-source keys is speculative.
- **axe-core CI gate.** Already tracked under `project_aria_outstanding_followups.md`; not a regression in PR #327.
- **NVDA / VoiceOver manual smoke results.** The PR's test plan calls these out as a manual pre-merge check; they're not code changes.

## 4. Plan

Four commits, all on `feat/aria-accessibility`:

1. **`fix(a11y): ignore modifier+key chords in BsRovingFocus and bsCombobox`**
   - Edit `roving-focus.directive.ts:onKeydown` — add the guard at the top.
   - Edit `combobox.directive.ts:onKeydown` — add the guard, scoped to non-Tab keys.
   - Update `roving-focus.spec.ts` — one new test asserting Alt+ArrowDown is ignored. (Re-uses the existing fixture; no new harness.)
   - Add `combobox.directive.spec.ts` — small fixture, asserts Alt+ArrowDown / Ctrl+Home / Meta+End are ignored, and that plain ArrowDown still opens the popup. Sized to match the existing per-directive spec convention.

2. **`refactor(a11y): use CDK InteractivityChecker in BsOverlayFocus`**
   - Edit `overlay-focus.directive.ts` — inject `InteractivityChecker`, replace `focusFirstTabbable` with a tree walk that uses `isFocusable(el) && isTabbable(el)`.
   - Existing `overlay-focus.spec.ts` should pass unchanged. Add one test for the case CDK handles that the local selector didn't (e.g. a button inside a `<fieldset disabled>` should be skipped).

3. **`feat(a11y): BsOverlayStackService + Escape-stack guard on overlays`**
   - New file `libs/mintplayer-ng-bootstrap/a11y/src/overlay-stack/overlay-stack.service.ts` — `BsOverlayStackService` with the four-method surface from §3. Class-level JSDoc explains *why* it exists (cross-overlay Escape coordination) and *what it does not promise* (visual z-order — the stack tracks logical open-order, not what CDK paints on top).
   - New file `overlay-stack.spec.ts` — push/release/isTop/peek correctness, release-non-top is a no-op, deep nesting (3+ overlays) preserves order.
   - Re-export from `a11y/src/index.ts`.
   - Edit `popover.directive.ts` — inject the service, allocate a token in the `isVisible` effect (push on true, release on false), gate `onEscape` on `isTop`.
   - Edit `tooltip.directive.ts`, `priority-nav.component.ts`, `dropdown-menu.directive.ts`, `modal-host.component.ts` — same pattern.
   - Add one integration test per nesting bug from §3 (popover-under-modal, tooltip-under-popover) — TestBed harness with both overlays open, dispatch a `keydown.escape`, assert only the top closed.

4. **`docs(prd): close aria-review-fixes after PR #327 review`**
   - Mark this PRD's status as **Implemented** with the resolving commit SHAs.
   - Update `aria-accessibility-audit.md` §13 (audit closing log) with a one-liner pointing at this PRD so the trail is captured in the index.
   - Update `project_aria_outstanding_followups.md` in memory — strike the popover-Escape entry now that it's resolved.

Vitest must stay green at 696 (or higher, with the new tests adding to the count). No CHANGELOG entry — this is intra-PR review polish, not a user-facing change.

## 5. Risks

- **The combobox modifier-key guard could disable a chord some consumer relies on.** Audit: typeahead, select2, multiselect, searchbox are the four current consumers. None of them documents an Alt/Ctrl/Meta+arrow contract; all four use plain arrow keys for navigation. Risk: low.
- **CDK `InteractivityChecker` has a slightly different definition of "tabbable" than the local selector.** The two known divergences (form controls in disabled fieldsets, elements with `inert` ancestor) are *more correct* in CDK — an element the local selector reported as tabbable but CDK skips would have been a focus-trap initial-focus bug anyway. Risk: low; behaviour change is in the right direction.
- **The overlay-stack push/release pairing must not desync.** A push without a matching release leaks a frame and breaks Escape for everything after it. Mitigation: push/release live in the same `effect` reading the open signal, so the framework guarantees they pair on dispose. Tests assert the stack is empty after every overlay teardown.
- **Token-based identity (`symbol`) means a directive that opens twice in quick succession allocates two tokens.** That's the right behaviour — the second open is a fresh frame; the first frame's release on close still works because we keep the previous token in a local variable and release it before allocating the next. Confirmed by the deep-nesting unit test.
- **The stack tracks logical open-order, not visual z-order.** A consumer who manually reorders overlays in the DOM could see Escape close a logically-deeper-but-visually-on-top overlay. We don't support that case today; documented in the service's class-level JSDoc.
- **Adding a guard at the top of `onKeydown` after the switch statement runs would be a no-op.** Mitigation: guard is the first statement; reviewer must confirm placement.

## 6. Done criteria

- `Alt+ArrowDown` on a `bsRovingFocus` host moves the browser back (default), does not change `activeIndex`.
- `Ctrl+Home` on a `bsCombobox` input does **not** call `focusFirst` on the dropdown; lets the input's caret jump (default).
- `BsOverlayFocus` initial-focus on a modal containing a `<fieldset disabled><button>X</button></fieldset><button>Y</button>` lands on `Y`, not `X`.
- A popover open inside a modal: pressing Escape closes the popover, the modal stays open. Pressing Escape again closes the modal.
- A tooltip showing on a button inside an open popover: pressing Escape closes the tooltip (it's the top of the stack). Pressing Escape again closes the popover. This matches the APG tooltip pattern, which calls for Escape to dismiss the tooltip even when other actions are pending.
- The overlay stack is empty (`peek() === null`) after every test's teardown — no leaked frames.
- New tests cover all the above scenarios; vitest stays green.
- This PRD's status flips to **Implemented**; `aria-accessibility-audit.md` §13 logs the resolution; the popover-Escape line in `project_aria_outstanding_followups.md` is removed.
