# `@angular/animations` deprecation — analysis before deciding

Status: **Decided 2026-08-10 — option A, stay on `@angular/animations` for now.** Nothing
implemented, deliberately. Written while upgrading to Angular 22.0.8
(see [nx23-dependency-upgrade.md](./nx23-dependency-upgrade.md)), where `npm ci` began
warning:

> `@angular/animations@22.0.8`: @angular/animations is deprecated. Use `animate.enter` and
> `animate.leave` instead. https://v22.angular.dev/guide/animations

**This is not a codemod, and that is the whole point of this document.** It looks like a
dependency chore and is actually a breaking redesign of a published package's public API. The
decision belongs to a human; the evidence is below so it can be made without re-deriving it.

## The blast radius, measured

7 files import `@angular/animations`; 13 `animations: [...]` sites; 9 files import
`@mintplayer/ng-animations`.

| Where | What |
|---|---|
| `libs/mintplayer-ng-animations/src/lib/*.animation.ts` (6 files) | the published package — this **is** its entire product |
| `libs/mintplayer-ng-bootstrap/{alert,modal,offcanvas,popover,tooltip}` | 5 shipped components consuming those triggers |
| `libs/mintplayer-ng-bootstrap/offcanvas/.../offcanvas-push.directive.ts` | imports `@angular/animations` directly |
| `apps/ng-bootstrap-demo/pages/animations/*`, `additional-samples/collapse` | 4 demo pages |

## Why it is not mechanical

`@mintplayer/ng-animations` (published, v22.0.0) exports exactly six
`AnimationTriggerMetadata` objects. Consumers write:

```ts
@Component({ animations: [FadeInOutAnimation] })   // then [@fadeInOut]="{ value: '', params: { duration: '300ms' } }"
```

```ts
export const FadeInOutAnimation = trigger('fadeInOut', [
  transition(':enter', [style({ opacity: 0 }), animate('{{ duration }}', style({ opacity: 1 }))],
             { params: { duration: '500ms' } }),
  transition(':leave', [animate('{{ duration }}', style({ opacity: 0 }))],
             { params: { duration: '500ms' } }),
]);
```

`animate.enter` / `animate.leave` are **template-level, CSS-class-driven** bindings:

```html
<div animate.enter="fade-in" animate.leave="fade-out">
```

The differences that matter:

1. **There is no object to export.** The new API has no `AnimationTriggerMetadata` equivalent, so
   a library cannot hand a consumer a reusable animation at all — the consumer writes CSS.
   Migrating therefore means **deleting the public API of a published package**, not rewriting it.
2. **Parameterisation disappears.** `{{ duration }}` with `params` has no counterpart; a consumer
   who currently passes `duration: '300ms'` per call site would need CSS custom properties or
   their own classes.
3. Every downstream consumer of `@mintplayer/ng-animations` breaks, not just this repo.

## The real question, and the answer

The question was not "how do we migrate the animations" but **"does `@mintplayer/ng-animations`
still have a reason to exist?"**

**It does.** `@mintplayer/ng-animations` is a set of reusable animations for *anywhere* — the
`@mintplayer/ng-bootstrap` components are one consumer among others, not the reason the package
exists. That reframes the trade-off: the new API cannot express a *portable, parameterised*
animation at all (no exportable object, no `{{ duration }}`), so migrating would not modernise the
package, it would **remove its product** and push every consumer back to hand-written CSS. The
synthetic-animations API is the only one that currently delivers what this package is for, so we
keep it.

Three options were considered:

| Option | Shape | Cost |
|---|---|---|
| **A. Do nothing yet** ✅ **chosen** | `@angular/animations` is deprecated, **not removed**; it works in v22 with no announced removal date | zero; revisit when a removal version is announced |
| **B. Deprecate `@mintplayer/ng-animations`** | ship the animations as a documented CSS snippet/stylesheet; the five bootstrap components use `animate.enter`/`animate.leave` internally | breaking for the package's consumers; needs a migration note per animation |
| **C. Rewrite as a stylesheet package** | publish `.css`/`.scss` classes (`.mp-fade-in-out` …) that pair with `animate.enter` | keeps a shipping artifact and a migration path, but it is a different product with a different API |

**A was chosen.** The deprecation warning is upstream noise, not a deadline: nothing breaks, the
package keeps its API, and consumers keep parameterised triggers. Revisit only when Angular
announces a removal version — and revisit as **C**, not B, since the package has an audience
beyond this workspace and would need a successor rather than a tombstone.

### What to watch for

- A named removal version in the Angular release notes (currently none).
- `@angular/animations` failing to install against a future `@angular/core` — the practical
  tripwire, since the peer range is what will break first.
- Any future `animate.enter` enhancement that adds parameterisation or an exportable descriptor;
  that would make C cheap and turn this from a downgrade into an actual migration.

## Precedent in this repo

- Breaking changes are acceptable and documented rather than shimmed
  ([`feedback_breaking_changes_ok`], and `scheduler-resize-glyphs-plan.md:239`: a breaking change
  rides a minor bump).
- A package whose purpose evaporates gets deprecated on npm, not hollowed out — see the
  `ng-swiper` removal in the carousel work.
- Which means: whichever option wins needs its own PRD, branch and release note, **not** a
  paragraph inside an unrelated PR.

## Also newly deprecated in Angular 22 — this one WAS done

`@angular/platform-browser-dynamic` → `@angular/platform-browser`. Small, mechanical, and
genuinely a codemod — unlike the above — so it landed in the same PR. See
[nx23-dependency-upgrade.md](./nx23-dependency-upgrade.md#angularplatform-browser-dynamic-removed).
