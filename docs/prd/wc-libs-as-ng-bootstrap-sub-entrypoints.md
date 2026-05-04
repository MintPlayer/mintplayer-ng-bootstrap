# PRD: Consolidate web-component libs as `@mintplayer/ng-bootstrap` sub-entrypoints

## Problem

Four standalone Lit web-component libraries currently live as **siblings** to `libs/mintplayer-ng-bootstrap/`:

| Path | npm name | Status |
|---|---|---|
| `libs/mp-scheduler-core/` | `@mintplayer/scheduler-core` | published `1.1.0` |
| `libs/mp-scheduler-wc/` | `@mintplayer/scheduler-wc` | published `2.0.0` |
| `libs/mp-splitter-wc/` | `@mintplayer/splitter` | published `2.0.0` |
| `libs/mp-tab-control-wc/` | `@mintplayer/tab-control-wc` | **unpublished** — orphaned in the workflow |

Two concrete issues:

1. **`mp-tab-control-wc` has no publish step** in `.github/workflows/publish-master.yml` (steps for `mp-scheduler-core` / `mp-scheduler-wc` / `mp-splitter-wc` exist at lines 228–283; `mp-tab-control-wc` is absent). Pushing to `master` builds it but never publishes.
2. **The folder layout is inconsistent.** `libs/mintplayer-ng-bootstrap/dock/` already contains its WC source inline (`mint-dock-manager.element.ts`, built via ng-packagr). The other WCs live outside, with a different naming convention (`mp-*-wc` vs `mintplayer-*`), and are built by `@nx/js:tsc`. There is no clean "WC vs Angular" boundary in the repo today — just two ad-hoc layouts.

The user wants all WCs grouped under `libs/mintplayer-ng-bootstrap/web-components/` as **sub-entrypoints of `@mintplayer/ng-bootstrap`**, so a single publish covers them, a single `ng-bootstrap` install delivers them, and the repo layout reflects the architectural relationship.

**Workspace scope context:** unlike the sibling `mintplayer-ng-video-player` workspace (which targets Angular / React / Vue and *needs* framework-agnostic standalone packages), this workspace targets **Angular only**. There is therefore no value in keeping the WCs as separate npm packages for non-Angular consumers — every realistic consumer of these WCs in this workspace is an Angular host that already has `@mintplayer/ng-bootstrap` installed. Folding the WCs into ng-bootstrap removes the orphaned-publish problem and reflects how the libs are actually consumed.

The blocking question for this PRD: **does ng-packagr support nested sub-entrypoint folders** (`web-components/scheduler` rather than just `scheduler`), or do entrypoints have to sit directly under the primary entrypoint root?

## Goal

1. Each existing standalone WC lib becomes a sub-entrypoint of `@mintplayer/ng-bootstrap`, importable as `@mintplayer/ng-bootstrap/web-components/<name>`.
2. The four libs (`mp-scheduler-core`, `mp-scheduler-wc`, `mp-splitter-wc`, `mp-tab-control-wc`) are moved under `libs/mintplayer-ng-bootstrap/web-components/` using `git mv` so history is preserved.
3. A single `nx build mintplayer-ng-bootstrap` produces the full bundle including all WC sub-entrypoints. The four standalone publish steps in `publish-master.yml` collapse into the existing ng-bootstrap publish.
4. `tsconfig.base.json` path mappings, the demo app's imports, and the `scheduler/` + `tab-control/` Angular wrappers update to the new sub-entrypoint paths in the same PR. No dangling references to the old `@mintplayer/scheduler-wc` / `@mintplayer/splitter` / `@mintplayer/tab-control-wc` names inside the repo.
5. The codegen-wc pipeline (`tools/scripts/build-web-components.mjs`) keeps working unchanged on the new paths — it already walks `*.element.html` / `*.styles.scss` recursively, so the deeper folder is invisible to it.

### Non-goals

- **No runtime API change** to any WC. `mp-splitter`, `mp-scheduler`, `mp-tab-control`, `mp-dock-manager` keep their tag names, attributes, events, and behaviour. Only their build/publish identity changes.
- **No source-code refactor.** Files move; their contents do not.
- **No deprecation of the old npm packages.** `@mintplayer/scheduler-core@1.1.0`, `@mintplayer/scheduler-wc@2.0.0`, `@mintplayer/splitter@2.0.0` stay published on npm at the versions they're at. They simply will not receive new versions from this repo. (See "Open question 1" — whether to publish a final version under the old names that re-exports from the new path is left for the user to decide.)
- **The dock WC stays where it is.** `libs/mintplayer-ng-bootstrap/dock/src/lib/web-components/mint-dock-manager.element.ts` is already a sub-entrypoint and is already inside `mintplayer-ng-bootstrap`. This PRD does not relocate it; the dock sub-entrypoint stays one level deep (not under `web-components/`) because the dock is an Angular wrapper *plus* a WC, while `scheduler` / `tab-control` / `splitter` are pure WCs (no Angular sources). The `web-components/` folder is for the pure-WC libs only.
- **No visual or behavioural changes** to the demo app.

## Research finding — does ng-packagr support nested sub-entrypoints?

**Yes.** ng-packagr discovers secondary entrypoints with the glob `**/ng-package.json` relative to the primary entrypoint root. The `**` matches any depth. The published subpath equals the entrypoint's relative path from the primary, so:

```
libs/mintplayer-ng-bootstrap/web-components/scheduler/ng-package.json
                                   ↓
@mintplayer/ng-bootstrap/web-components/scheduler
```

This is confirmed by ng-packagr's `discover-packages.ts` (`findSecondaryPackagesPaths` uses the recursive glob).

**Caveat:** there is no precedent for depth-2 sub-entrypoints in this repo. All ~87 existing sub-entrypoints sit exactly one level deep (`accordion/`, `button/`, …, `dock/`). The `web-components/` parent folder is a first.

A flat alternative — `libs/mintplayer-ng-bootstrap/scheduler-wc/`, `splitter-wc/`, `tab-control-wc/` directly under the primary, no `web-components/` parent — also works and matches existing convention. The user has expressed a clear preference for the nested form (semantic grouping), so the recommendation below follows that.

## Current state (key files)

| File | Role |
|---|---|
| `libs/mp-scheduler-core/{package.json,project.json,tsconfig.lib.json,src/}` | Standalone Nx lib, `@nx/js:tsc` build |
| `libs/mp-scheduler-wc/{…}` | Standalone Nx lib, `@nx/js:tsc` build, `codegen-wc` target, depends on `@mintplayer/scheduler-core` |
| `libs/mp-splitter-wc/{…}` | Standalone Nx lib, `@nx/js:tsc` build, `codegen-wc` target |
| `libs/mp-tab-control-wc/{…}` | Standalone Nx lib, `@nx/js:tsc` build, `codegen-wc` target — **no publish step** |
| `libs/mintplayer-ng-bootstrap/dock/` | Existing depth-1 sub-entrypoint, ng-packagr build, contains a WC inline |
| `libs/mintplayer-ng-bootstrap/scheduler/src/components/scheduler/scheduler.component.ts:29` | Angular wrapper that imports `@mintplayer/scheduler-wc` and `@mintplayer/scheduler-core` |
| `libs/mintplayer-ng-bootstrap/tab-control/src/tab-control/tab-control.component.ts:4-5` | Angular wrapper that imports `@mintplayer/tab-control-wc` |
| `apps/ng-bootstrap-demo/src/app/pages/advanced/splitter/splitter.component.ts:4` | Demo consumer of `@mintplayer/splitter` |
| `tsconfig.base.json:38-41` | Path mappings for the four WC libs |
| `libs/mintplayer-ng-bootstrap/package.json:30-33` | `peerDependencies` lists `@mintplayer/scheduler-core`, `@mintplayer/scheduler-wc`, `@mintplayer/splitter`, `@mintplayer/tab-control-wc` |
| `.github/workflows/publish-master.yml` lines 228-283 | Three publish steps for the WC libs (tab-control-wc absent) |
| `tools/scripts/build-web-components.mjs` | Path-agnostic — walks any `libRoot` for `*.element.html` / `*.styles.scss` |

## Architectural decisions and trade-offs

### Decision 1 — Sub-entrypoint folder shape

**Recommendation: nested under `web-components/` as the user requested.** Final layout:

```
libs/mintplayer-ng-bootstrap/
├── ng-package.json              ← primary
├── package.json
├── accordion/                   ← existing depth-1 sub-entrypoint
├── … (other depth-1 sub-entrypoints)
├── dock/                        ← existing depth-1, untouched
└── web-components/
    ├── scheduler-core/
    │   ├── ng-package.json
    │   ├── package.json
    │   ├── src/
    │   └── …
    ├── scheduler/
    ├── splitter/
    └── tab-control/
```

Published subpaths:

| Old npm name | New subpath |
|---|---|
| `@mintplayer/scheduler-core` | `@mintplayer/ng-bootstrap/web-components/scheduler-core` |
| `@mintplayer/scheduler-wc` | `@mintplayer/ng-bootstrap/web-components/scheduler` |
| `@mintplayer/splitter` | `@mintplayer/ng-bootstrap/web-components/splitter` |
| `@mintplayer/tab-control-wc` | `@mintplayer/ng-bootstrap/web-components/tab-control` |

Note the `-wc` suffix drops in the new names — the `web-components/` parent already conveys "this is a WC."

**Why over the alternatives:**

- **Flat layout (`libs/mintplayer-ng-bootstrap/scheduler-wc/`, etc.)**: matches existing depth-1 convention, no first-of-its-kind risk. But four WCs scattered among ~87 Angular sub-entrypoints is harder to find in tree views and dilutes the WC-vs-Angular boundary. User explicitly preferred the grouped form.
- **Keep them as standalone libs but relocate the folders to `libs/mintplayer-ng-bootstrap/web-components/...`**: visually identical to the recommendation, but each lib still has its own `package.json` + publish step, and there's the awkward question of whether ng-packagr's discovery glob will pick them up by accident. Doable but trades one inconsistency for another.

### Decision 2 — Build executor for moved libs

**Recommendation: switch from `@nx/js:tsc` to ng-packagr (implicit via the parent `@nx/angular:package` build).**

When a folder under `libs/mintplayer-ng-bootstrap/` contains an `ng-package.json`, ng-packagr's secondary-entrypoint pipeline picks it up automatically as part of the parent `nx build mintplayer-ng-bootstrap`. That replaces:

- The four `project.json` files' `build` targets (currently `@nx/js:tsc`).
- The four `tsconfig.lib.json` files (currently extending the root vanilla `tsconfig.json`; ng-packagr expects Angular-flavoured tsconfig — the existing depth-1 sub-entrypoints (e.g. `accordion/tsconfig.lib.json`) are the template to follow).
- The four standalone publish steps in the GitHub workflow.

The `codegen-wc` target on each lib stays (still needed to produce `*.element.template.ts` / `*.styles.ts` from the `.html`/`.scss` source pair). It just becomes a `build` predecessor of the parent `mintplayer-ng-bootstrap` project, not the standalone lib's `build`.

The dock sub-entrypoint already proves this works for Lit/`HTMLElement` source: ngc compiles plain TypeScript fine, and the `codegen-wc` outputs are vanilla TS modules.

### Decision 3 — Backward compatibility for existing npm consumers

**Recommendation: hard cut, no backward-compat shim.**

The published packages (`@mintplayer/scheduler-core@1.1.0`, `@mintplayer/scheduler-wc@2.0.0`, `@mintplayer/splitter@2.0.0`) stay as-is on npm — at their current versions, frozen. New versions will be published only at the new sub-entrypoint paths. External consumers continue to get the last published version when installing under the old name; they migrate to the new path on their own schedule.

This workspace targets Angular only, so the realistic consumer base for these WCs is small and overwhelmingly Angular-first. Maintaining four standalone npm packages on top of the consolidated sub-entrypoints would create double-publish overhead with no consumer benefit.

**Why over the alternatives:**

- **Publish a final version under each old name that re-exports from the new path**: cleanest for downstream upgrade, but adds four extra `package.json` files in the repo whose only purpose is to be a redirect. Not worth the maintenance for this workspace's consumer base.
- **Keep publishing under both names indefinitely**: doubles the publish surface and creates two source-of-truth packages. Not worth the complexity.

The internal consumers (the demo app, the `scheduler/` and `tab-control/` Angular wrappers) all migrate in this PR.

### Decision 4 — Use `git mv` to preserve history

**All file moves must use `git mv`** (not delete + create). Git's rename detection is heuristic — large content edits done in the same commit as a path change can break the rename association, scattering the moved file's history. To keep `git log --follow` and `git blame` working on the moved files:

1. Run `git mv <old> <new>` for each file, no content edits in the same commit.
2. Commit the moves alone.
3. Then in a follow-up commit (in the same PR, but separate commit) edit the moved files (update `package.json` names, `tsconfig.lib.json` paths, `project.json` removal, etc.).

`git mv` on Windows works inside the `git` CLI; PowerShell's `Move-Item` does not preserve git tracking the same way and should not be used here.

## Plan

### Phase 1 — Move folders, no content changes

1. `git mv libs/mp-scheduler-core libs/mintplayer-ng-bootstrap/web-components/scheduler-core`
2. `git mv libs/mp-scheduler-wc libs/mintplayer-ng-bootstrap/web-components/scheduler`
3. `git mv libs/mp-splitter-wc libs/mintplayer-ng-bootstrap/web-components/splitter`
4. `git mv libs/mp-tab-control-wc libs/mintplayer-ng-bootstrap/web-components/tab-control`
5. Commit: `chore(wc-libs): relocate WC source under mintplayer-ng-bootstrap/web-components/ (no content changes)`

### Phase 2 — Convert each to a sub-entrypoint

For each of the four moved folders:

1. Add `ng-package.json` (template: `libs/mintplayer-ng-bootstrap/dock/ng-package.json`, just `entryFile: src/index.ts`).
2. Update `package.json` — change `name` from `@mintplayer/<old>` to `@mintplayer/ng-bootstrap/web-components/<new>`. Drop `main` / `types` / `version` fields (sub-entrypoint package.json files in this repo carry only the name and ng-bootstrap-specific metadata; ng-packagr fills the rest from the build output).
3. Replace `tsconfig.lib.json` with the depth-1 template adapted for the deeper relative paths (e.g. `extends: "../../../tsconfig.base.json"` becomes `"../../../../tsconfig.base.json"`).
4. Delete `project.json` — sub-entrypoints don't have one; they inherit from the parent.
5. Delete the per-lib `vitest.config.ts` (move any live tests under the sub-entrypoint's `src/` and route them through the parent `mintplayer-ng-bootstrap` test target if needed; see "Open question 2").

Commit: `chore(wc-libs): convert WC libs to ng-bootstrap sub-entrypoints`.

### Phase 3 — Wire up codegen as a build predecessor

The `codegen-wc` target on each removed `project.json` needs to migrate. Two options:

- **Add the `codegen-wc` target to `libs/mintplayer-ng-bootstrap/project.json`** (the parent), pointing at all four web-components folders, with the parent `build` target depending on it.
- **Or** add four codegen targets (one per sub-entrypoint area) — cleaner per-folder isolation, more `project.json` lines.

Either way, `tools/scripts/build-web-components.mjs` accepts arbitrary lib roots; only the `command` strings change. (See "Open question 3" — whether the codegen step needs to know about the four folders separately or can be invoked once per parent build.)

Commit: `chore(wc-libs): wire codegen-wc into mintplayer-ng-bootstrap build`.

### Phase 4 — Update repo-internal consumers

1. `tsconfig.base.json:38-41` — remove the four old paths; add four new paths (or remove entirely if the new sub-entrypoint paths resolve naturally through ng-bootstrap's path mapping).
2. `libs/mintplayer-ng-bootstrap/package.json:30-33` — remove the four `peerDependencies` entries (they become internal to the package).
3. `libs/mintplayer-ng-bootstrap/scheduler/src/components/scheduler/scheduler.component.ts:29` — update imports from `@mintplayer/scheduler-wc` and `@mintplayer/scheduler-core` to the new sub-entrypoint paths.
4. `libs/mintplayer-ng-bootstrap/scheduler/src/index.ts:16` — same.
5. `libs/mintplayer-ng-bootstrap/tab-control/src/tab-control/tab-control.component.ts:4-5` — update import from `@mintplayer/tab-control-wc`.
6. `apps/ng-bootstrap-demo/src/app/pages/advanced/splitter/splitter.component.ts:4` — update import from `@mintplayer/splitter`.
7. `apps/ng-bootstrap-demo/src/app/pages/advanced/scheduler/scheduler.component.ts:29` — update import from `@mintplayer/scheduler-core`.

Commit: `refactor(consumers): point WC imports at new ng-bootstrap sub-entrypoints`.

### Phase 5 — Remove standalone publish steps

`.github/workflows/publish-master.yml` lines 228-283 — delete the three publish steps for `mp-scheduler-core`, `mp-scheduler-wc`, `mp-splitter-wc`. (`mp-tab-control-wc` was never wired in, so nothing to remove for it.)

Commit: `ci: drop standalone WC publish steps; ng-bootstrap publish covers them`.

### Phase 6 — Verify

- `nx build mintplayer-ng-bootstrap` produces `dist/libs/mintplayer-ng-bootstrap/web-components/{scheduler-core,scheduler,splitter,tab-control}/` alongside the existing sub-entrypoint outputs.
- `nx serve ng-bootstrap-demo` shows `/advanced/dock`, `/advanced/scheduler`, `/advanced/splitter`, `/advanced/tab-control` rendering identically to before.
- All existing tests pass (the four moved libs' vitest specs run under whichever target Phase 2 step 5 settles on).
- `git log --follow libs/mintplayer-ng-bootstrap/web-components/scheduler/src/index.ts` shows the original `mp-scheduler-wc` history continuing across the move.

## Risks and open questions

1. **Existing-version backward compat.** Hard cut means external consumers stop receiving updates under the old names with no in-tree shim. Acceptable for this codebase (small external surface, mostly internal usage), but flag for confirmation. If a shim *is* wanted, it's an extra Phase between 4 and 5.

2. **Vitest configs.** The four standalone libs each have their own `vitest.config.ts` and `@analogjs/vitest-angular:test` target. After conversion to sub-entrypoints, those test configs need either to be merged into the parent's test target or kept as standalone Nx test projects (without a corresponding build project — Nx supports projects with only a `test` target). Recommendation: keep the test configs in place at their new path and add a thin `project.json` per folder that exposes only the `test` target (no build, no publish). Build is owned by the parent. This preserves test isolation while collapsing the publish surface.

3. **Codegen invocation granularity.** Whether `codegen-wc` runs once per parent build (walking all four folders) or four times (one per folder) is a tooling-cosmetic choice. The four-times option preserves Nx caching per folder; the one-time option is simpler. Recommendation: four times — `nx affected` semantics work better when each codegen invocation has the smallest possible input footprint.

4. **`tsconfig.base.json` path mapping with subpaths.** ng-bootstrap currently has `@mintplayer/ng-bootstrap` → `./libs/mintplayer-ng-bootstrap/src/index.ts`. Sub-entrypoint imports (`@mintplayer/ng-bootstrap/accordion`, etc.) work through ng-packagr's published-package shape, not via `tsconfig.base.json` paths — at dev time, Angular's path-mapping plugin and the Nx tsconfig plugin pick them up from the sub-entrypoint folders. Verify the same auto-discovery applies to the deeper `web-components/` path. If not, add explicit mappings: `@mintplayer/ng-bootstrap/web-components/*` → `./libs/mintplayer-ng-bootstrap/web-components/*/src/index.ts`.

5. **`mp-scheduler-wc` depends on `mp-scheduler-core`.** After the move, this becomes a sub-entrypoint depending on a sibling sub-entrypoint. ng-packagr supports this, but the import inside `scheduler/src/...` must use the new path (`@mintplayer/ng-bootstrap/web-components/scheduler-core`), not a relative `../scheduler-core/src/...` import — sibling sub-entrypoints communicate via their published API, not direct file imports. Verify with the existing depth-1 example (e.g. how `dock/` references `splitter/` if at all — likely it doesn't; the dock embeds `<mp-splitter>` via custom element registration, not via TS import).

6. **Demo app circular dependency risk.** The demo currently imports the WC packages directly (`@mintplayer/splitter`). After the move, those imports route through `@mintplayer/ng-bootstrap`, which the demo also imports for Angular components. No circular dependency — the demo is a leaf — but verify the import resolution doesn't accidentally pull the entire ng-bootstrap bundle when only a sub-entrypoint is used (tree-shaking should handle it).

7. **Bundle-size regression for non-Angular consumers** — *resolved, not a concern in this workspace.* This workspace targets Angular only (unlike `mintplayer-ng-video-player`, which is multi-framework). Non-Angular consumers are not part of this workspace's audience, so the consolidation cost that would matter elsewhere doesn't apply here.

## Appendix — `git mv` commands

Exact commands to run for Phase 1:

```bash
git mv libs/mp-scheduler-core libs/mintplayer-ng-bootstrap/web-components/scheduler-core
git mv libs/mp-scheduler-wc libs/mintplayer-ng-bootstrap/web-components/scheduler
git mv libs/mp-splitter-wc libs/mintplayer-ng-bootstrap/web-components/splitter
git mv libs/mp-tab-control-wc libs/mintplayer-ng-bootstrap/web-components/tab-control
git commit -m "chore(wc-libs): relocate WC source under mintplayer-ng-bootstrap/web-components/ (no content changes)"
```

`git mv` is required (not `mv` / `Move-Item`) so each file's history follows the new path — `git log --follow` and `git blame` keep working across the rename.
