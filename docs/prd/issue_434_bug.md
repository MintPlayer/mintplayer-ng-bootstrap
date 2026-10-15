# Bug Report: Issue #434

**Issue**: #434
**Title**: fix(badge): `<bs-badge>` text is white on every colour, unreadable on warning, info and light
**Status**: Investigating
**Created**: 2026-10-15
**Last Updated**: 2026-10-15

---

## Summary

`<bs-badge>` paints its text white on every `type`, so warning, info and light badges fail WCAG AA. On body, white
and transparent badges the white text is invisible in light mode. The cause is that the component applies only a
background utility (`bg-{color}`) and never pairs it with a text colour. The fix swaps it for Bootstrap 5.3's
documented pairing, `text-bg-{color}`. Its text colour is the Sass `color-contrast()` result, a compile-time constant,
so a theme-coloured badge's text is the same in light and dark mode. `body` and `transparent` follow the theme instead,
because their background flips with it.

---

## Symptom

On every `Color`, the text inside `<bs-badge [type]="…">` uses Bootstrap's `--bs-badge-color: #fff`. Contrast, measured
against the compiled Bootstrap 5.3.8 styles: warning 1.63:1, info 1.96:1, light 1.05:1, and body, white and
transparent 1.00:1 in light mode. WCAG AA requires 4.5:1.

## Reproduction

1. Run the Angular demo and open `/basic/badge` (the warning badge) or `/enterprise/dock` (the info badge).
2. **Observed**: white text on a yellow or cyan background.
3. **Expected**: dark text that reads at 4.5:1 or better, with the same colour in light and dark mode.

**Frequency**: always
**Environment**: every consumer of `@mintplayer/ng-bootstrap` ≤ 22.24.0. It became visible downstream in
MintPlayer.Spark#515 once #432/#433 stopped bare `.badge` markup from picking up the card's leaked `.text-bg-*` copy.
**First observed**: by design since the badge used `bg-*`, and exposed by 22.24.0 (#433).

## Root-Cause Hypothesis

`BsBadgeComponent.colorClass` returns `bg-${Color[type]}`, which sets only `background-color`. Nothing sets the text
colour, so Bootstrap's `.badge { color: var(--bs-badge-color) }` (#fff) wins for every type.

### Supporting evidence
- `libs/mintplayer-ng-bootstrap/badge/src/badge.component.ts:22`: `colorClass = computed(() => \`bg-${this.colors[this.type()]}\`)`.
- `libs/mintplayer-ng-bootstrap/badge/src/badge.component.html:1`: the class lands on `<span class="badge">`.
- `libs/mintplayer-ng-bootstrap/badge/src/badge.component.scss`: imports only `badge`, which keeps `--bs-badge-color: #fff`.
- `node_modules/bootstrap/scss/helpers/_color-bg.scss`: `.text-bg-{color}` sets `color: color-contrast($value)`, a
  compile-time constant, plus a background from `var(--bs-{color}-rgb)`. Bootstrap's dark mode does not redefine
  `--bs-{color}-rgb`, so both declarations are mode-independent.
- `libs/mintplayer-ng-bootstrap/_bootstrap.scss:103` already imports `bootstrap/scss/helpers` globally, so the
  `.text-bg-*` rules exist on every consumer page.

### What would confirm
- A spec that asserts the `.badge` span carries `text-bg-warning` / `text-bg-info` / `text-bg-light` fails before the
  fix and passes after it. Session A measured 12 of 13 failing and then 13 of 13 passing.
- In the demo, `getComputedStyle(span).color` reads `rgb(0, 0, 0)` on warning, info and light, in both light and dark
  mode.

### What would refute
- If the computed text colour in dark mode differed from light mode on a theme-coloured badge, the `text-bg-*` rules
  would not be mode-independent. That would mean something redefines `--bs-{color}-rgb`, or a dark-mode rule overrides
  the colour.

### Alternative hypotheses considered
- The text colour is `!important`-overridden somewhere global. *Less likely:* a grep finds no badge text rule outside
  Bootstrap, and the handoff's compiled CSS shows plain `--bs-badge-color: #fff`.

---

## Fix Plan

- In `badge.component.ts`, map each type to a paired class string:
  - The 8 theme colours (primary, secondary, success, danger, warning, info, light, dark) → `text-bg-{color}`.
  - `body` → `bg-body text-body`, `white` → `bg-white text-black`, `transparent` → `bg-transparent text-reset`.
    `text-bg-*` doesn't exist for these. `body` and `transparent` follow the theme because their background flips with
    it (user decision).
- Don't re-ship `.text-bg-*` inside the badge's styles. `_bootstrap.scss` already provides it, and #433 removed exactly
  such a duplicate from the card.
- Keep the inputs (`type`, `unit`, `decorative`) and the template unchanged.
- Update the stale comment in `apps/ng-bootstrap-demo-e2e/e2e/card-global-styles.spec.ts:16`.
- Bump `libs/mintplayer-ng-bootstrap/package.json` from 22.24.0 to 22.25.0. Add a CHANGELOG `### Fixed` entry above
  the #432 entry.
- PR note: `text-bg-*` sets `color` with `!important`, so a consumer rule that recolours badge text now needs
  `!important` too.

Starting point: Session A's patch (`upstream_badge_fix.patch`, which `git apply --check` accepts against `c7aef914`).

## Regression Test Plan

- **Test name**: `BsBadgeComponent` colour pairing (in `badge.component.spec.ts`)
- **Given**: a host that binds `type` from a `signal()`. CLAUDE.md requires this, because a mutated plain field never
  propagates.
- **When**: `type` is set to each `Color` value.
- **Then**:
  - The `.badge` span carries `text-bg-{color}` for the 8 theme colours, `bg-body text-body` for body,
    `bg-white text-black` for white and `bg-transparent text-reset` for transparent.
  - It never carries a bare `bg-{color}` without a text pairing.
  - Without the fix, the warning, info and light cases fail.
- **Manual**: in the demo, on `/basic/badge` and `/enterprise/dock`, toggle light and dark mode. Theme-coloured badge
  text is identical in both modes, and black on warning, info and light.

---

## Open Questions

None.

---

## Related
- Issue #434. Precedent: #432/#433 (card global-style leak).
- Related files: `libs/mintplayer-ng-bootstrap/badge/src/badge.component.{ts,html,scss,spec.ts}`,
  `libs/mintplayer-ng-bootstrap/_bootstrap.scss`, `apps/ng-bootstrap-demo-e2e/e2e/card-global-styles.spec.ts`,
  `CHANGELOG.md`, `libs/mintplayer-ng-bootstrap/package.json`.
- See CLAUDE.md for: "Do not re-import a Bootstrap partial the page already ships", "Every document-level sheet goes
  through installLightStyles" (#432), and "In a wrapper spec, drive inputs from a signal()".
