# Plan: the released package version in the demo apps

PRD: [package-version-in-demos.md](package-version-in-demos.md)

| # | Milestone | Files |
|---|---|---|
| M1 | **PRD and plan** | `docs/prd/package-version-in-demos{,-plan}.md` |
| M2 | **Demos show `dev` for the placeholder**, plus specs: an ng unit spec, and e2e assertions in all three demos | `apps/ng-bootstrap-demo/src/app/providers/bootstrap-version.provider.ts` (+ `.spec.ts`), `app.config.ts`, `pages/home/home.component.{ts,html}`, `apps/react-bootstrap-demo/src/app/shell/GithubLink.tsx`, `apps/vue-bootstrap-demo/src/app/App.vue`, e2e `smoke` / `example` specs |
| M3 | **Guard `check-demo-versions.mjs`** + spec | `tools/scripts/check-demo-versions{.mjs,.spec.ts}` |
| M4 | **Workflow: plan in `build`, release in both publish jobs**, with the action pinned to its first published phases commit | `.github/workflows/publish-master.yml` |
| M5 | **Verification**, once, at the end | see below |

## Verification (batched at the end)

- `npx nx test tools`: the new guard spec.
- `npx nx test ng-bootstrap-demo`: the provider spec.
- The demo e2e version assertions in each of the three demo e2e projects.
- **Workflow:**
  - Locally, mirror the `build` job's commands with the libs stamped by hand: build the libs, then the demos with
    `--exclude-task-dependencies` **from a clean `codegen-ssr-chrome` output**, then run the guard.
  - In CI, the first master run after merge is S4.
