# #460 + #461 — host scope on non-`mp-host` fronts, unset numeric inputs

Status: implemented (one PR for both issues). Both are compiler-output defects found while upgrading
MintPlayer.Spark to 22.33.0 (MintPlayer/MintPlayer.Spark#557).

## #460 — `bs-progress-bar` draws no fill

### Cause

S15 says the compiler stamps `data-mps="<scope>"` on every native element of a group's templates and on
the Angular/Lit host. The host stamp was only emitted through `hostBag`, and `hostBag` is only emitted
when the template root is marked `mp-host` (`model.host`). For any other template the runtimes fall
back to `core.host(props)`, which by S15 carries no scope. So a core that writes a host bag
(`progressBarCore.host` → `{ class: 'progress-bar-host' }`) got its class on the host but not the scope,
and every scoped-sheet rule on that host was dead:

| Group | Core host class | Dead rule |
|---|---|---|
| progress | `progress-bar-host` | `.progress-bar-host[data-mps=progress] { display: contents }` — host stays a 0px flex item, the bar's `width: 82%` resolves against 0px |
| accordion | `accordion-tab` | `.accordion-tab[data-mps=accordion] …` |
| dropdown | `dropdown-contents` | `.dropdown-contents[data-mps=dropdown] { display: contents }` |

### Why not just emit `hostBag`

Both runtimes read `hostBag` as "the template root IS the host": the core attaches to the host instead
of its first element child (`useCore` in `ng-bootstrap/machine/src/core.ts`, `CoreController` in
`web-components/machine/src/core-controller.ts`). Emitting a `hostBag` for a non-`mp-host` template would
move the core's root.

### Fix

- `@mintplayer/ui-core/component`: `scopedHost(host, scope)` — wraps `core.host` and adds
  `'data-mps': scope`; no `core.host`, no bag (a core that writes nothing on its host still gets nothing).
- Both runtimes take a new `hostScope` option and apply `options.hostBag ?? scopedHost(core.host, hostScope)`.
  The root rule is untouched.
- The compiler (Angular and Lit emitters) emits `hostScope: '<scope>'` for a styled group whose template
  is not `mp-host`. React and Vue render no host, so nothing changes there.

Core bags still carry no `data-mps` (`no-scope-in-compiled-bags` keeps holding): the scope comes from the
manifest, through the compiler, as for every other stamp.

## #461 — unset numeric inputs become NaN

### Cause

The Angular emitter's transform for every `kind: 'number'` input was `(v) => numberAttribute(v)`.
Angular's `numberAttribute(value, fallback = NaN)` returns NaN for `undefined`, `null` and `''`. A wrapper
has to bind the input (Angular cannot bind conditionally), so `[yMin]="undefined"` — "scale
automatically" — reached `sparklineCore` as NaN; `inputs.yMin ?? undefined` lets NaN through and the path
became `M 3 NaN L 97 NaN`. 15 of the 58 numeric inputs default to `null` (sparkline/trend bounds, trend
goal, carousel interval, dropdown max height, offcanvas size, scheduler first day/slot, tile-manager
stackBelow, timepicker min/max, code-snippet active line); the rest silently lost their numeric default
when bound to `undefined`.

### Fix

- The emitter now writes `(v) => (v == null || v === '' ? <default> : numberAttribute(v))` for every
  numeric input: unset means the manifest default, never NaN. The one `inputLine` serves components,
  directives, declarations and overlay directives.
- Defence in depth: `connectSparkline` treats a non-finite `yMin`/`yMax` as automatic (`trend` already
  did via `present()`).
- Other fronts: Lit's `type: Number` converter gives `null` for a missing attribute and property
  bindings skip it; Vue only type-checks; React passes through. None produce NaN for an unset value.

## Tests (red before, green after)

| Spec | Issue | Asserts |
|---|---|---|
| `component-compiler/src/components/input-line.spec.ts` | #461 | the emitted transform maps `undefined`/`null`/`''` to the default (`null`, `5`, `undefined`), numbers pass through |
| `ng-bootstrap/charts/sparkline/src/sparkline.spec.ts` | #461 | `[yMin]="undefined"` gives `yMin() === null`, no NaN in the path or the dot |
| `ui-core/charts/sparkline/src/sparkline.spec.ts` | #461 | NaN bounds scale like absent ones |
| `ng-bootstrap/progress-bar/src/progress-bar.spec.ts` (new) | #460 | `bs-progress-bar` host has `progress-bar-host` and `data-mps="progress"` |
| `web-components/progress-bar/src/mp-progress-bar.spec.ts` | #460 | the same on `mp-progress-bar` |
