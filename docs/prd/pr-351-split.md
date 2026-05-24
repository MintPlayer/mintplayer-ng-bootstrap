# PRD: Decompose PR #351 into reviewable PRs

## Problem

[PR #351](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/351) — *Cross-framework web components — extract `@mintplayer/web-components` + React/Vue wrappers + demo apps* — landed on `feat/cross-framework-web-components` as **736 changed files, +49,488 / −4,071 LOC across 41 commits**.

The end state is fine (verified locally via Playwright, full e2e + unit suite passes after the fixes through `669cfe26`), but the PR is unreviewable. The reviewer has no way to bisect a regression to a specific concern, and a single accidentally-bad rename in the middle of a 254-file git-mv block can hide behind the noise.

We want to keep `#351` **open as the north-star reference** (so we can grep it for "did the working state include X?") and ship the same scope as a sequence of focused PRs branched off `master`, each ≤ ~500 lines of real review surface (lockfile churn excluded).

A secondary goal piggybacks here: the existing publish workflow already uses a `.github/actions/publish-npm-package` composite + a hand-listed matrix; switching to **auto-discovery of `project.json` files under `libs/`** (per the user's `idea-workflow.yaml` sketch) eliminates the per-package YAML edits going forward.

## Goal

1. Land the same end state as `#351` via **9–11 small PRs**, merged in order.
2. Each PR ≤ 500 LOC of real diff (ignore `package-lock.json`).
3. Strict compile-gate ordering so every PR is `master`-mergeable on its own — no PR depends on an unmerged sibling.
4. Replace the hand-listed publish matrix with an **auto-discovery reusable workflow** (`./.github/workflows/publish-packages.yml`) that scans every `libs/<lib>/project.json` and publishes to a configurable feed list.
5. Keep `#351` open until the sequence is fully merged; close it as `superseded by #X..Y` rather than merging it.

### Non-goals

- Refactoring any web-component's behaviour during the move. WC PRs are "pure rename + thin React/Vue wrappers"; functional changes are deferred.
- Splitting `package-lock.json` churn. The Angular version alignment is one atomic commit either way; it rides in the "Workspace plumbing" PR.
- Rewriting `#351`'s history. `#351` stays as-is so the team can reference its commits when reviewing the split PRs.

## Current state

[`feat/cross-framework-web-components`](https://github.com/MintPlayer/mintplayer-ng-bootstrap/compare/master...feat/cross-framework-web-components) at `669cfe26` contains:

| Bucket | Files | +LOC | −LOC | Status |
|---|---:|---:|---:|---|
| CI dedupe (publish-master + composite action) | 3 | 357 | 270 | Self-contained |
| Workspace plumbing (Nx, tsconfig, @angular bumps, etc.) | 8 | ~8 578 | ~3 500 | Most LOC is `package-lock.json` churn — actual review surface ~150 LOC |
| Empty new libs + demo shells (no WC code yet) | 95 | ~1 190 | 0 | Self-contained |
| WC extraction (26 entries × {WC, React wrapper, Vue wrapper, 3 demo pages}) | 406 | ~15 900 | ~5 070 | Needs splitting |
| Codegen + misc (favicons, dark-mode pre-boot, peer-dep fixes, lib version bumps) | ~25 | ~1 520 | ~230 | Self-contained |
| **Total** | **537** | **~27 500** | **~9 070** | (Renames inflate the file count to 736; the underlying LOC-diff is ~36 600.) |

## Reference research — what already exists

| Tool / pattern | Verdict | Why |
|---|---|---|
| **`MintPlayer/github-actions/publish-npm-packages`** | **Chosen for PR-1** | External JS action that does folder-scan + peerDep topo-sort + concurrent multi-registry publish in one invocation. Supersedes every option below — see PR-1 spec above. Pin to `@b08fbdd` until v1.1.0 tag lands. |
| **Composite action with `strategy.matrix`** | Not a fit | GitHub Actions explicitly disallows `strategy` inside composite action `runs.steps`. The `idea-workflow.yaml` sketch (`uses: ./publish-action.yml` + inline matrix) is invalid as a composite. |
| **Reusable workflow (`on.workflow_call`)** | Considered, rejected | Was the original PR-1 recommendation: a `discover` job emitting a JSON matrix + `publish` jobs consuming via `fromJSON`. The external action above does the same in less surface area, with auto-topo-sort. |
| **`find libs -name project.json` + `jq` filter on `package.json`** | Considered, rejected | Folded into the external action's discovery; we no longer need to write the scan script ourselves. |
| **Cross-product matrix `{package, feed}`** | Considered, rejected | Per-feed status pills give nicer UI but cost a job tile per package × feed; the external action's `core.summary` table covers visibility well enough. |
| **Topo-sort by scanning `peerDependencies`** | **Used internally by the external action** | The action's `topo.ts` walks peerDeps to compute waves; no `publishOrder` field needed. |
| **Explicit `"publishOrder"` field in each `package.json`** | No longer needed | Was a fallback for the reusable-workflow approach; the external action's peerDep topo-sort makes it redundant. |

## Status — what's landed so far

| # | PR | Title | Status |
|---|---|---|---|
| PR-1 | [#352](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/352) | `refactor(ci): adopt MintPlayer/github-actions/publish-npm-packages` | ✅ merged |
| PR-2 | [#353](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/353) | `chore: workspace plumbing for the multi-framework split` | ✅ merged |
| — | [#355](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/355) | `test(e2e): batch of CI-stabilization fixes` | ✅ merged (unplanned, off-cycle) |
| PR-3 | [#354](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/354) | `feat: empty libs + React/Vue demo shells (no components yet)` | ✅ merged |
| PR-4 | [#356](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/356) | `feat(wc-extract): a11y + calendar + card + code-snippet — first chunk` | ✅ merged |
| — | [#357](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/357) | `fix(publish): unblock @mintplayer/{web-components,react,vue}-bootstrap on master deploy` | ✅ merged (off-cycle hotfix) |
| PR-5 | [#358](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/358) | `feat(wc-extract): overlay + pagination + toggle-button — primitives (PR-5 re-scoped)` | ✅ merged |
| PR-6 | [#359](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/359) | `feat(wc-extract): timepicker + checkbox — 1-hop consumers (PR-6)` | ✅ merged |
| — | [#360](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/360) | `refactor(web-components): split form-check styles + extract `radio` WC + React/Vue wrappers` | ✅ merged (prep PR; absorbed `radio` from original PR-9 scope mid-flight) |
| PR-7 | [#361](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/361) | `feat(wc-extract): datatable + datepicker + datetime-picker (PR-7)` | ⏳ in CI |
| PR-8 | — | `dock`, `file-manager`, `multi-range`, `otp-input` (originally PR-6) | ⏳ next |
| PR-9 | — | `query-builder`, `ribbon` (originally PR-7 minus `pagination` and `radio` — `radio` was pulled into PR #360) | ⏳ pending |
| PR-10 | — | `scheduler`, `scheduler-core`, `splitter`, `tab-control` (originally PR-8) | ⏳ pending |
| PR-11 | — | `tile-manager`, `treeview` (originally PR-9 remainder) | ⏳ pending |
| PR-12 | — | Misc cleanup (mostly already absorbed by PR-3/PR-4) | ⏳ pending |

## OPEN ISSUES BEFORE NEXT COMPACT — read before resuming

- **PR #360 ✅ merged.** Form-check split + radio extraction shipped. `mp-radio` toggle_button regression fixed by the radio extraction (originally PR-9 scope folded into PR #360 mid-flight).

- **PR-7 (#361) ⏳ in CI.** Three commits: datatable (pure git-mv from already-new layout) + datepicker (git-mv from old `.element.*` location, fixed stale `@mintplayer/ng-bootstrap/calendar` → `@mintplayer/web-components/calendar` import) + datetime-picker (same shape + two more stale imports fixed: a11y + calendar). Each commit adds the React + Vue wrappers + small demo pages. The `mp-file-manager` WC's import of datatable was rewired in commit 1 so the PR-8 entry stays working between PRs. 195 WC tests pass (up from 157).

- **Vue/React demo URL convention differs from Angular**: master Angular demo uses `/basic/forms/checkbox` (nested), React/Vue demos use `/basic/checkbox` (flat). This is intentional — Vue/React demo routing was designed flatter.

## Proposed PR sequence

### PR-1 — CI: adopt the `publish-npm-packages` action ✅ merged as #352

**Scope:** Replace the hand-listed publish matrices with calls to the new external action [`MintPlayer/github-actions/publish-npm-packages`](https://github.com/MintPlayer/github-actions/tree/main/publish-npm-packages) (pinned to commit `b08fbdd` until v1.1.0 is tagged). Auto-discovers every publishable `package.json` under a folder, topo-sorts via `peerDependencies`, fans out to every registry in one invocation.

In `publish-master.yml`: two simple jobs (`publish-libs` on `dist/libs` with both registries; `publish-snippets` on `libs/mintplayer-ng-bootstrap-snippets` with only npmjs).

In `pull-request.yml`: one `dry-run-publish-libs` job with two action invocations.

**Files landed:** `.github/workflows/publish-master.yml`, `.github/workflows/pull-request.yml`.
**Net diff:** +126 / −285 LOC.

### PR-2 — Workspace plumbing ✅ merged as #353

**Scope:**
- `.gitattributes` — `* text=auto eol=lf` + binary exclusions (fixes CEM diff noise).
- `.dockerignore` — exclude `node_modules`, `.nx`, `dist`, `.git`, `.claude`, etc.
- `package.json` + `package-lock.json` — `@angular/*` framework deps to `~21.2.14`, tooling deps to `~21.2.12`; pinned `@nx/vite`+`@nx/vitest` to exact 22.7.1 (was `^` — caused 22.7.3 to leak in and break peer-dep resolution).
- `tools/scripts/build-web-components.mjs` — drop the stale `web-components/` path-segment filter.
- `tools/scripts/serve-api.mjs` — `spawnSync` taskkill on Ctrl+C + explicit `process.exit(0)`.

**Deferred to PR-3** (their consumers didn't yet exist on master): `nx.json` `@nx/react`/cache defaults, `tsconfig.base.json` lib path entries, React/Vue/CEM tooling devDeps.

### Unplanned: #355 — `test(e2e): batch of CI-stabilization fixes` ✅ merged

Four e2e-stability fixes that surfaced while PR-3 was in flight. Off-cycle PR off master so they could land independently of the WC work:

1. **`dock-bounds.spec.ts:245`** — the `tiny host shrinks the pane to fit` test eagerly bailed before its polling loop ran. Moved `dock.shadowRoot` resolution inside the loop, widened budget from 3 s → 10 s. Propagated the 10 s budget consistently across `getPaneAndHostRects` and the `intent is preserved` test.
2. **`routing.spec.ts`** — the navbar dropdown is opened by a JS click handler attached lazily in `navbar-item.component.ts:ngAfterContentChecked`, with a `close-init-b="1"` marker on the trigger. Wait for that marker before clicking. (The `:focus-within` CSS rule is gated on `.navbar.noscript` and doesn't apply with JS enabled.)
3. **`serve-api.mjs`** — branch on `process.env.CI`: CI uses `dotnet run` (no watch overhead, no `staticwebassets.development.json` noise), local dev keeps `dotnet watch run` for hot reload.
4. **`pull-request.yml`** — `Free :5000 before live-API step` (`lsof -ti:5000 | xargs -r kill -9`) so the orphan dotnet from the prior step doesn't collide. Also bumped Playwright install to include `webkit` for the new React/Vue e2e configs.

### PR-3 — Empty new libs + demo shells ✅ merged as #354

**Scope:** Three new libs (`libs/mintplayer-web-components/`, `libs/mintplayer-react-bootstrap/`, `libs/mintplayer-vue-bootstrap/`) as minimal scaffolds + `apps/react-bootstrap-demo/` and `apps/vue-bootstrap-demo/` as routing-only shells. Every sidebar link routes to a catch-all `ComingSoonPage` / `ComingSoonView` until the WC chunks land.

**Also pulled in** (deferred from PR-2): `nx.json` defaults, `tsconfig.base.json` lib path entries, the React/Vue/CEM tooling devDeps, all `@nx/*` bumped 22.7.1 → 22.7.2 (consistent exact pins). 73 files, +8 750 / −3 062 (mostly `package-lock.json` regeneration). Real review surface ~1 200 LOC of scaffolds.

### PR-4 — a11y + calendar + card + code-snippet ✅ merged as #356

**Re-scoped from the original `a11y + calendar + card + checkbox` plan:**

- **`checkbox` deferred to PR-9** because the WC version imports `toggleButtonStyles` + `ToggleButtonColor` from `@mintplayer/web-components/toggle-button`, which is scheduled for PR-9. Pairing them avoids inlining a dep that should be a real cross-WC reference.
- **`code-snippet` pulled in from PR-5** because the React/Vue demo pages render `<BsCodeSnippet>` for the source-display section; without code-snippet landing in this PR the demo pages wouldn't compile.

Per-entry shape held:
- `git mv libs/mintplayer-ng-bootstrap/<entry>/src/lib/web-components/*.element.{ts,html,scss} libs/mintplayer-web-components/<entry>/src/` — history preserved.
- Angular wrapper becomes a thin shim around `<mp-<entry>>`.
- React 19 wrapper via `@lit/react createComponent`. (Note: `createComponent` only types public class fields, not attributes set via `static observedAttributes` — so HTML-attribute props like `color`, `position`, `src`, `alt` need a `{...{ color: 'primary' }}` spread cast at the call site to forward via React.)
- Vue 3.5 SFC adapter. For input-shaped WCs (e.g. calendar) the adapter uses `defineModel<T>()` + `ref<MpXxxElement>` + listens on the WC's actual property/event names (e.g. `selectedDate` + `selected-date-change`, NOT `value` + `change` — Gemini caught this on calendar).
- React `pages/<Entry>Page.tsx` and Vue `views/<Entry>View.vue` for `/basic/<entry>` (or wherever the route lives).

`a11y` is **additive only** — adds a Lit `LiveAnnouncerController` at `libs/mintplayer-web-components/a11y/` for WC consumers. The Angular `BsLiveAnnouncerService` at `libs/mintplayer-ng-bootstrap/a11y/` is untouched; both coexist until the remaining Angular consumers (`file-upload`, `code-snippet` shim, `placeholder` spec) migrate in PR-9 cleanup.

**Code-snippet WC** — verbatim port of `node_modules/highlight.js/styles/a11y-dark.css`. Fixed background (`#2b2b2b`) + default text (`#f8f8f2`) regardless of `data-bs-theme`, matching production. Light/dark variant scheme was wrong (production loads only `a11y-dark.css` for both modes); over-explicit `.hljs-attr` rule forced HTML attribute names yellow when production lets them inherit salmon-orange from `.hljs-tag`.

**Misc absorbed into PR-4:**
- `docker-compose.yml` updated with `react-bootstrap-demo` + `vue-bootstrap-demo` Traefik services (was missed in PR-3).
- `.gitignore` extended to cover `libs/mintplayer-web-components/**/*.element.template.ts` (auto-generated by `codegen-wc`).
- `passWithNoTests: true` flag in `libs/mintplayer-web-components/vite.config.mts` removed (the lib now has 57 tests across 8 spec files).
- `@mintplayer/ng-bootstrap` bumped 21.41.1 → 21.42.0. The new libs stay at their declared versions (`@mintplayer/web-components 1.0.0`, `react-bootstrap 19.0.0`, `vue-bootstrap 3.0.0`) — they were never published before so this is their first npm release at those numbers.

### Unplanned: #357 — `fix(publish): unblock @mintplayer/{web-components,react,vue}-bootstrap on master deploy` ✅ merged

The first PR-4 deploy on master ([run 26344885600](https://github.com/MintPlayer/mintplayer-ng-bootstrap/actions/runs/26344885600)) finished with `Published: 3, skipped: 18, failed: 1`. Two bugs surfaced in the same run:

1. **`publish-master.yml` Build step built the default project only.** Ran `npx nx build --configuration=production`, which only builds `ng-bootstrap-demo` + its transitive deps. `@mintplayer/react-bootstrap` and `@mintplayer/vue-bootstrap` aren't reachable from the Angular demo, so they never landed in `dist/libs/` and the auto-discovery action found only 11 of 13 libs. Fixed: switch to `nx run-many --target=build`.
2. **Three new lib `package.json` files were missing `repository` + `author`.** GitHub Packages Registry uses `repository.url` to map a package to its source repo; without it, the publish to `npm.pkg.github.com` fails (silently in this action's surfacing — only showed as `failed: 1`). Added the canonical blocks matching the shape every other lib uses (`dijkstra`, `ng-animations`, `ng-bootstrap`, etc.).

**Lesson banked for new libs going forward:** every publishable lib's `package.json` MUST have `repository` (with `type`, `url`, `directory`) AND must be reachable from `nx run-many` output. If a future PR adds a new lib, copy the dijkstra `package.json` block.

### PR-5 — `overlay` + `pagination` + `toggle-button` (primitives) ⏳ next

**Re-scoped from the original PR-5 (`datatable`, `datepicker`, `datetime-picker`).** Pre-flight surfaced that every original-PR-5 entry has at least one unmigrated cross-WC dep:

| Original PR-5 entry | Depended on (still in master via the Angular impl) |
|---|---|
| `datepicker` | `overlay` (was PR-9) |
| `datetime-picker` | `overlay` + `timepicker` (both PR-9) |
| `datatable` | `pagination` (PR-7) + `checkbox` (PR-9 after PR-4 punt) |

Rather than pulling 4-5 deps forward into one PR, ship the **dep-free primitives** first so every downstream consumer is unblocked. PR-5 is now:

- **`overlay`** — Lit-only primitive (no React/Vue wrappers; consumed by other WCs, never directly by app code). 4 files.
- **`pagination`** — full WC + React + Vue wrappers. 13 files.
- **`toggle-button`** — full WC + React + Vue wrappers. 13 files.

Total: ~30 files. Cross-WC deps: zero. Per-entry shape same as PR-4.

**Note**: each demo page should stay short — 2-3 representative examples, NOT the full Angular demo's section list (lesson banked in PR-4).

### PR-6 — `timepicker` + `checkbox` (1-hop consumers freed by PR-5) ⏳ pending

`timepicker` depends on `overlay`; `checkbox` depends on `toggle-button`. Both unblock once PR-5 lands.

- `timepicker` — 17 files (the heavier entry: includes `mp-time-list.element.ts` + `mp-timepicker.element.ts`).
- `checkbox` — 11 files (the entry punted from PR-4 over its `toggle-button` dep — now resolved).

### PR-7 — `datepicker`, `datetime-picker`, `datatable` (originally PR-5) ⏳ in CI as #361

All three landed together as one PR with one commit per entry (per user request to keep commits focused). Real review surface ~370 LOC of new wrapper/demo code; the rest is renames.

- `datatable` — pure `git mv` (already-new layout) + Angular wrapper / file-manager / spec / barrel rewires + React (7-event map) + Vue (object-prop forwarding) wrappers + small `/enterprise/datatables` demo with a 4-row in-memory artist table.
- `datepicker` — `git mv` from `libs/mintplayer-ng-bootstrap/datepicker/src/lib/web-components/` to `libs/mintplayer-web-components/datepicker/src/` (`.element.*` layout matches calendar/timepicker). Fixed a stale `@mintplayer/ng-bootstrap/calendar` import. React (`selected-date-change` + `current-month-change` + `opened`/`closed`) + Vue (`defineModel<Date | null>`) wrappers + small `/basic/datepicker` demo.
- `datetime-picker` — same shape. Fixed two stale cross-WC imports (a11y + calendar). Two large spec files (`.element.spec.ts` + `.element.aria.spec.ts`) moved too. React (`value-change` + open/close with `'date' | 'time'` detail) + Vue (`defineModel<Date | null>`) wrappers + small `/basic/datetime-picker` demo.

195 WC tests pass at the new locations (up from 157; new specs are 6 datepicker + 32 datetime-picker).

### PR-8 — `dock`, `file-manager`, `multi-range`, `otp-input` (originally PR-6) ⏳ pending

`dock` is the heaviest entry in the inventory (~4 500 LOC on the feat branch). If the chunk total exceeds the 500-LOC budget, ship `dock` solo.

### PR-9 — `query-builder`, `ribbon` (originally PR-7 minus `pagination`; `radio` already absorbed into PR #360) ⏳ pending

`ribbon` is the second-heaviest entry (~3 500 LOC). Same split-if-needed clause as PR-8. `radio` was originally slated here but landed in PR #360 because the form-check split there caused a `.btn-check` regression on the still-in-place mp-radio — folding the full extraction in was simpler than maintaining a parallel in-place fix.

### PR-10 — `scheduler`, `scheduler-core`, `splitter`, `tab-control` (originally PR-8) ⏳ pending

`scheduler` + `scheduler-core` together are ~3 800 LOC. Almost certainly needs to split: scheduler solo, scheduler-core + splitter + tab-control as another chunk.

### PR-11 — `tile-manager`, `treeview` (originally PR-9 remainder) ⏳ pending

Last two entries from the original PR-9 inventory. Also includes the **remaining Angular `BsLiveAnnouncerService` consumer migrations** (`file-upload`, `code-snippet` Angular shim, `placeholder` spec) — once all WCs that need the announcer have moved, the consumers can switch to the new `LiveAnnouncerController` and the old service can be deleted.

**Per-PR shape (PR-5 through PR-11):**
- `git mv libs/mintplayer-ng-bootstrap/<entry>/src/lib/web-components/*.element.{ts,html,scss} libs/mintplayer-web-components/<entry>/src/` — pure rename, history preserved.
- Update the Angular wrapper in `libs/mintplayer-ng-bootstrap/<entry>/` to import `MpFooElement` from `@mintplayer/web-components/<entry>`.
- Add `libs/mintplayer-react-bootstrap/<entry>/src/Bs<Entry>.tsx` (`@lit/react`'s `createComponent`).
- Add `libs/mintplayer-vue-bootstrap/<entry>/src/Bs<Entry>.vue` (SFC adapter; **verify the WC's actual property + event names** before wiring `defineModel<T>()` — `value` + `change` is rarely the answer).
- Add `apps/react-bootstrap-demo/src/app/pages/<Entry>Page.tsx` + `apps/vue-bootstrap-demo/src/views/<Entry>View.vue`. **Keep these short — 2-3 representative examples, NOT the full Angular demo's 14-section port.** (Lesson learned in PR-4.)
- Lib-only primitives (e.g. `overlay`) skip the React/Vue wrappers + demo pages — they're consumed by other WCs, not directly by app code.

### PR-12 — Codegen + misc infrastructure ⏳ pending — mostly already absorbed

Most of what the original PRD slated for the final cleanup has already landed:

| Item | Status |
|---|---|
| Per-framework SVG favicons | ✅ PR-3 |
| Dark-mode pre-boot scripts in React/Vue `index.html` | ✅ PR-3 |
| Lib version bumps (`@mintplayer/web-components` → 1.0.0, `react-bootstrap` → 19.0.0, `vue-bootstrap` → 3.0.0) | ✅ PR-3 |
| `ng-bootstrap` → 21.42.0 | ✅ PR-4 |
| `sideEffects: true` on the WC package | ✅ PR-3 |
| Code-snippet a11y-dark palette | ✅ PR-4 |
| React/Vue demo `nx serve` `continuous: true` + `dependsOn: [api:serve]` | ✅ PR-3 |
| `docker-compose.yml` Traefik services for React/Vue demos | ✅ PR-4 |
| `nginx.conf` port-preserving redirect (Angular demo) | ✅ already on master |
| `peerDependencies` audit on `ng-bootstrap` — `@angular/animations` added, `lit`/`@lit/context`/`ngx-highlightjs` removed | ⏳ pending — defer to PR-12 once all WCs have moved (the WCs and ngx-highlightjs both go away by PR-11) |

So PR-12 ends up as: peerDependencies cleanup on `@mintplayer/ng-bootstrap` once PR-11 has removed every Angular consumer of `BsLiveAnnouncerService` and `ngx-highlightjs`, plus deleting the now-orphaned Angular service.

## Tradeoffs

### "One PR per WC" (user's original sketch) vs "6 chunks"

The user's first plan asked for one PR per moved WC. That's 26 PRs and over-fragments the review (the reviewer sees `a11y` and `card` separately even though both are 3-file moves). The 6-chunk grouping keeps each PR at ~500 LOC of review surface — the right grain. **Exception**: the three heaviest entries — `dock` (~4 500 LOC), `scheduler`/`scheduler-core` (~3 800 LOC combined), `ribbon` (~3 500 LOC) — could be split out solo if their chunk-mates push the budget. PR-6, PR-7, PR-8 are the candidates to split.

### Lockfile churn

`package-lock.json` is ~12 000 lines diffed. There's no way to make that small. Reviewing strategy: reviewer skims the lockfile diff for unexpected new top-level packages (`grep -E '^\+ {4}"' package-lock.json | grep -v node_modules`), then trusts the rest. The version-alignment commit message must list every `@angular/*` bump explicitly so the lockfile churn is justified.

### Auto-discovery vs hand-listed matrix

Auto-discovery means a new lib is published automatically on next master push if its `package.json` has `name` + isn't private. Risk: an accidentally-published `name` in an internal lib leaks to npm. Mitigation: the discovery filter requires both `name` AND a `"publishOrder"` field — opt-in rather than opt-out. Internal libs without `publishOrder` are skipped, which makes "do not publish" the default.

### Keeping `#351` open

Closing `#351` would force reviewers to compare against a moving target. Keeping it open lets the reviewer cross-reference: "in #351 this file looked like X — does the new PR-7 chunk match?" — useful for catching accidental regressions in the split.

## Rollout plan

1. ✅ **PR-1** merged as #352 (CI publish action).
2. ✅ **PR-2** merged as #353 (workspace plumbing).
3. ✅ **#355** off-cycle e2e stabilization.
4. ✅ **PR-3** merged as #354 (empty libs + demo shells, also picked up PR-2's deferred nx.json + tsconfig + React/Vue tooling).
5. ✅ **PR-4** merged as #356 (a11y + calendar + card + code-snippet; checkbox punted forward, code-snippet pulled in from original PR-5).
6. ✅ **#357** merged — off-cycle publish-master fix (build all libs + add `repository` to 3 new package.json files).
7. ⏳ **PR-5** next: `overlay` + `pagination` + `toggle-button` — **re-scoped from the original `datatable`/`datepicker`/`datetime-picker` plan** because each of those has an unmigrated cross-WC dep. PR-5 ships the dep-free primitives instead, unblocking everything downstream.
8. ⏳ **PR-6** — `timepicker` + `checkbox` (1-hop consumers, freed by PR-5).
9. ⏳ **PR-7** — `datepicker`, `datetime-picker`, `datatable` (the original PR-5 scope, now landable).
10. ⏳ **PR-8 / PR-9 / PR-10** — the heavy WC chunks. If any single entry pushes the chunk past ~500 LOC, ship it solo (`dock`, `scheduler`, `ribbon` are the likely candidates).
11. ⏳ **PR-11** — `tile-manager` + `treeview` + the Angular `BsLiveAnnouncerService` consumer migrations.
12. ⏳ **PR-12** — `peerDependencies` audit cleanup on `@mintplayer/ng-bootstrap` once every Angular consumer of `BsLiveAnnouncerService` and `ngx-highlightjs` has moved.
13. ⏳ **Close `#351` as superseded** by `#352..#PR-12`. Cross-reference the closing comment with each PR number.

## Open questions

- ✅ **`code-snippet` solo?** — answered in practice: it rode along with PR-4 because the new React/Vue demo pages import `<BsCodeSnippet>` for the source-display section.
- **DNS A records for `react.bootstrap.mintplayer.com` + `vue.bootstrap.mintplayer.com`** — `docker-compose.yml` references the new Traefik routes as of PR-4. The DNS records still need to exist before they'll resolve. Out-of-band, not code. (`bootstrap.mintplayer.com` keeps working either way.)
- ✅ **Auto-discovery driving `pull-request.yml`'s dry-run** — done in PR-1; `dry-run-publish-libs` job uses the same external action with `dry-run: true`.

## Lessons banked along the way

Worth keeping in mind for PR-5 onwards:

- **Don't over-port the Angular demo's example pages to React/Vue.** A faithful "port all 14 sections" balloons each demo page to 500+ LOC of `dedent`-wrapped snippets, type-cast workarounds, and visual-baseline placeholders. The right scope is 2-3 representative examples per page. (Cost the team a wasted sub-agent run during PR-4.)
- **Vue v-model wrapper boilerplate ≠ `value` + `change`.** Always read the WC's actual `@property` declarations and `dispatchEvent(new CustomEvent(...))` calls to find the right property + event names. The calendar uses `selectedDate` + `selected-date-change`; assume nothing.
- **React `@lit/react createComponent` types only public class fields, not attributes registered via `static observedAttributes`.** WC attributes like `color`/`position`/`src`/`alt` need a `{...{ color: 'primary' }}` spread cast at the React call site to forward via `React.createElement`. Documented inline in `apps/react-bootstrap-demo/src/app/pages/CardPage.tsx`.
- **Code-snippet uses a11y-dark.css verbatim, regardless of `data-bs-theme`.** Production loads only `a11y-dark.css` via ngx-highlightjs even on light pages; the WC matches that — fixed `#2b2b2b` background, no `:host-context` light variant. Don't reintroduce a light palette without checking master first.
- **`.gitignore` already covers `libs/mintplayer-web-components/**/*.element.template.ts`** (added in PR-4). Don't try to commit those — they're regenerated by `nx run mintplayer-web-components:codegen-wc` on every build.
- **`passWithNoTests` was removed from `mintplayer-web-components`** in PR-4. If a future chunk PR temporarily empties out the WC lib's spec list, the test target will exit 1 again — easier to add a spec than to re-add the flag.
- **WC SCSS edits require `codegen-wc` rerun** before reload (memory rule). The `.element.scss` is embedded into the auto-generated `.element.template.ts`.
- **Every publishable lib's `package.json` needs `repository` (`type` / `url` / `directory`) AND `author`.** Lifted from #357 — GitHub Packages Registry rejects the publish without it (silently surfaced as `failed: 1` by the action). Copy the dijkstra `package.json` block when adding any new lib.
- **`publish-master.yml` builds via `nx run-many --target=build`, NOT plain `nx build`.** Plain `nx build` only builds the default project — any lib not in its dependency closure (e.g. react-bootstrap, vue-bootstrap) never lands in `dist/libs/` and the discovery action misses it. Don't revert this in a future workflow refactor.
