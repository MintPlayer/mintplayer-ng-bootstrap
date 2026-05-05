# PRD: Unified `<bs-datatable>` — tree, selection, virtual scrolling, demo backend

Tracks: [issue #306](https://github.com/MintPlayer/mintplayer-ng-bootstrap/issues/306)

## Overview

One `<bs-datatable>` component, one data-source contract, one demo backend.

1. **Merge `<bs-virtual-datatable>` into `<bs-datatable>`** and delete the `@mintplayer/ng-bootstrap/virtual-datatable` package. The two share ~80% of their code today (column directive, sort base, settings model, sort UI). Folding them is the single biggest code reduction in this PRD.
2. **One `[fetch]` contract** replaces both `[(data)]` and `[dataSource]`. The component owns the call cadence per mode (paginated / virtual / tree / tree+lazy). Consumer writes one fetch function.
3. **Tree mode** with chevron column, cascading checkbox selection, lazy children. Each row carries `childCount`, which drives chevron visibility AND virtual-scroll height reservation for not-yet-loaded subtrees — making tree + virtual + lazy compose under the same contract.
4. **Vidyano-style header**: no "select all" — when at least one row is selected, a deselect-all checkbox appears.
5. **New `apps/api/` ASP.NET Core minimal-API backend** — paged artists (from static JSON), generated employee tree (singleton in-memory). Replaces `mintplayer.com` for the datatable demo. Deploys via docker-compose to the existing VPS behind Traefik.

Backwards compatibility is not a requirement. The contract may be broken. Less code is the design objective.

## Tech stack & constraints

- Angular standalone, signal-based, zoneless-compatible. No RxJS for new state.
- `@angular/cdk/scrolling` for virtual viewport.
- ASP.NET Core 10 minimal API. No `@nx-dotnet/core` / `@nx/dotnet` plugin — `nx:run-commands` calling `dotnet` directly is enough and adds zero npm packages.
- Bootstrap 5 + `--bs-*` CSS variables.

## Unified `[fetch]` contract

```typescript
interface BsDatatableFetchRequest {
  page: number;
  perPage: number;
  sortColumns: SortColumn[];
  parentId?: unknown | null;     // tree mode only; null = root
}

interface BsDatatableFetchResponse<T> {
  data: T[];
  totalRecords: number;          // total under this parent (or whole dataset)
  totalPages: number;
}

type BsDatatableFetch<T> =
  (req: BsDatatableFetchRequest) => Promise<BsDatatableFetchResponse<T>>;
```

Single input replaces both prior data inputs:

```typescript
fetch = input.required<BsDatatableFetch<TData>>();
```

Mode dispatch based on other inputs (the component owns *when* to call):

| Mode | Trigger | Behavior |
|---|---|---|
| Paginated | default | One fetch per settings change |
| Virtual flat | `[virtualScroll]="true"` | Page cache; fetch as viewport advances |
| Paginated tree | `[tree]="true"` | Root fetch on settings change; child fetch per `parentId` on expand |
| Virtual tree + lazy | `[tree]` + `[virtualScroll]` | Child fetch on expand; next-page child fetch as viewport approaches a loaded chunk's end |

**`childCount` makes tree + virtual + lazy work.** Every fetched row carries `row[childCountKey]` (direct children, not total descendants). When a parent is expanded but its children aren't loaded, the viewport reserves `childCount` placeholder rows of vertical space — scrollbar stays accurate, no jumping. When the viewport scrolls into placeholders, lazy-fetch fires. `childCount > 0` also drives chevron visibility, so `hasChildrenKey` drops out.

## Component API

| Input | Type | Default | Purpose |
|---|---|---|---|
| `fetch` | `BsDatatableFetch<TData>` | required | Single data contract |
| `virtualScroll` | `boolean` | `false` | Switch from pagination to virtual viewport |
| `itemSize` | `number` | `48` | Row height in px (required when virtual) |
| `tree` | `boolean` | `false` | Tree mode |
| `idKey` | `keyof TData` | required for tree / multi-select | Stable row identity |
| `childCountKey` | `keyof TData` | required when `tree` | Per-row direct child count |
| `treeIndent` | `number` | `1.25` | rem per depth level on the chevron cell |
| `selectable` | `'none' \| 'single' \| 'multiple'` | `'none'` | Selection mode |
| `showCheckboxes` | `boolean` | `false` | Render checkbox column; with `'none'` upgrades to `'multiple'` |
| `isResponsive` | `boolean` | `false` | Forwarded to `<bs-table>` |

Two-way models: `expandedIds: Set<unknown>`, `selection: Set<unknown>`.
Outputs: `rowExpand: TData`, `rowCollapse: TData`.
Row template context: `{ $implicit: TData | undefined; depth: number }` — `undefined` for placeholder rows.
The `bsVirtualRowTemplate` directive is removed. `*bsRowTemplate` covers all modes.

## Tree mode

- Hard-coded leftmost chevron column when `tree=true`. Indent applied to the chevron cell only (`[style.padding-left.rem]="depth * treeIndent()"`) so user columns stay aligned.
- Chevron rendered iff `row[childCountKey] > 0`.
- Expand state: `expandedIds: Set<row[idKey]>`. Expanding fetches children (page 1) if not cached; subsequent pages fetched as the viewport approaches the loaded end.
- Sort applies within siblings only — server is asked for sorted children of one parent at a time.

## Selection (Vidyano deselect-all)

- Per-row checkbox; tri-state visual when tree mode + cascading (parent indeterminate when some-but-not-all loaded descendants are selected).
- Checking a parent selects parent + all currently-loaded descendants. Unloaded subtree slots are not auto-selected.
- Header cell: empty when `selection().size === 0`; checkbox visible when ≥1 row is selected; clicking it clears the entire selection. There is no "select all."
- Storage: `Set<row[idKey]>`. Survives pagination, sort, refetch, and virtual-scroll churn because keys are stable.
- `==` doesn't help for objects (it's reference comparison; `{a:1} == {a:1}` is false). Stable keys via `idKey` are the only correct approach.

## Demo backend — `apps/api/`

ASP.NET Core 10 minimal API. ~30 lines of `Program.cs`. Two endpoints:

- `GET /api/artists?page=&perPage=&sort=` — paged from `Data/artists.json` loaded once at startup.
- `GET /api/employees?parentId=&page=&perPage=` — paged from a singleton-built synthetic tree (each node has a deterministic 0–100 children, multiple levels deep, seeded RNG). Each row: `{ id, parentId, name, childCount }`.

```
apps/api/
├── Api.csproj             # Microsoft.NET.Sdk.Web, net10.0, no extra packages
├── Program.cs             # CORS + 2 MapGet calls + tree generator
├── Data/artists.json      # static seed
├── Dockerfile             # multi-stage SDK → aspnet:alpine
├── .dockerignore          # bin/, obj/
└── project.json           # nx targets via nx:run-commands → dotnet CLI
```

Nx integration via `nx:run-commands` only — no `@nx/dotnet` plugin install. Targets:
- `nx serve api` → `dotnet watch run`
- `nx build api` → `dotnet build`
- `nx run api:publish` → `dotnet publish -c Release -o dist/apps/api`

CORS configured via `Cors__Origins` env var (comma-separated). Default dev origin `http://localhost:4200`.

## Deployment

Add to root `docker-compose.yml`:

```yaml
  api:
    image: ghcr.io/mintplayer/mintplayer-ng-bootstrap-api:master
    environment:
      - Cors__Origins=https://bootstrap.mintplayer.com
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ng-bootstrap-api.rule=Host(`bootstrap-api.mintplayer.com`)"
      - "traefik.http.routers.ng-bootstrap-api.entrypoints=websecure"
      - "traefik.http.routers.ng-bootstrap-api.tls.certresolver=letsencrypt"
      - "traefik.http.services.ng-bootstrap-api.loadbalancer.server.port=8080"
    networks: [web]
    restart: unless-stopped
```

Extend `.github/workflows/publish-master.yml` with a parallel image build for `apps/api/Dockerfile` pushed to `ghcr.io/mintplayer/mintplayer-ng-bootstrap-api:master`. The existing `appleboy/ssh-action` step already does `docker compose pull && up -d`, so the new service deploys automatically once the compose file references it. DNS for `bootstrap-api.mintplayer.com` is a manual step — out of scope for code.

## Demo migration off mintplayer.com

Limited to the datatable demo:

- `apps/ng-bootstrap-demo/proxy.conf.json` (new) — `/api` → `http://localhost:5000` for dev.
- `environment.ts` / `environment.prod.ts` — add `apiBase` (`''` dev, `'https://bootstrap-api.mintplayer.com'` prod).
- `artist.service.ts` — rewrite against `GET /api/artists`, return shape matches `BsDatatableFetchResponse<Artist>`.
- New `employee.service.ts` — calls `GET /api/employees?parentId=...`, same response shape.
- `datatables.component.ts/html` — collapse the regular/virtual mode toggle into one `<bs-datatable>` with a single `[fetch]`. Add an org-chart demo using `employee.service`.
- `Data/artists.json` is curated by hand or seeded once from a mintplayer.com export.

`SubjectService` and `TagService` continue to hit `mintplayer.com` — they're used by other demo pages (autocompletes, tag picker), not the datatable. Out of scope for this PRD.

## VS Code dev experience

`.vscode/launch.json` compound config so F5 starts both projects with debuggers attached:

```json
{
  "version": "0.2.0",
  "compounds": [
    { "name": "Demo (Angular + API)", "configurations": ["api: dotnet", "demo: chrome"] }
  ],
  "configurations": [
    { "name": "api: dotnet",  "type": "coreclr", "request": "launch",
      "preLaunchTask": "nx: serve api",
      "program": "${workspaceFolder}/apps/api/bin/Debug/net10.0/Api.dll",
      "cwd": "${workspaceFolder}/apps/api" },
    { "name": "demo: chrome", "type": "chrome",  "request": "launch",
      "preLaunchTask": "nx: serve ng-bootstrap-demo",
      "url": "http://localhost:4200",
      "webRoot": "${workspaceFolder}/apps/ng-bootstrap-demo/src" }
  ]
}
```

`.vscode/tasks.json` defines the two `nx: serve …` background tasks (with problem matchers so VS Code knows when each server is "ready").

Required extensions: **C# Dev Kit** (dotnet debug). Nx Console is optional. The Angular Language Service is already standard.

Non-debug alternative: `npm run dev` → `nx run-many --target=serve --projects=ng-bootstrap-demo,api --parallel` starts both servers from one terminal without debugger attach.

## File changes

```
apps/api/                                   # NEW (ASP.NET Core minimal API)
.vscode/launch.json                         # NEW (compound debug)
.vscode/tasks.json                          # NEW (background nx serve tasks)
apps/ng-bootstrap-demo/proxy.conf.json      # NEW (dev /api proxy)

docker-compose.yml                          # EDIT (add api service)
.github/workflows/publish-master.yml        # EDIT (build+push api image)
apps/ng-bootstrap-demo/src/environments/*   # EDIT (add apiBase)
apps/ng-bootstrap-demo/src/app/services/artist.service.ts  # REWRITE
apps/ng-bootstrap-demo/src/app/pages/advanced/datatables/  # REWRITE (single bs-datatable + fetch)

libs/mintplayer-ng-bootstrap/datatable/     # EDIT (unified [fetch], tree, selection, virtual)
libs/mintplayer-ng-bootstrap/virtual-datatable/  # DELETE (entire package)
```

## Implementation checklist

**Backend & deploy**
- [ ] `apps/api/` skeleton (csproj, Program.cs, Dockerfile, project.json, .dockerignore).
- [ ] Curate `Data/artists.json`.
- [ ] Synthetic employee-tree generator (singleton, seeded).
- [ ] CORS config via `Cors__Origins`.
- [ ] Add `api` service to `docker-compose.yml`.
- [ ] Extend publish workflow to build & push the api image.

**Component**
- [ ] Replace `[(data)]` and `[dataSource]` with `[fetch]`.
- [ ] Page cache + viewport plumbing + expand-driven child fetch + `childCount` row reservation.
- [ ] Tree mode (chevron column, expandedIds, depth context).
- [ ] Cascading selection + Vidyano deselect-all header.
- [ ] Move scroll-sync and column-width-sync into the datatable package; activate in virtual modes.
- [ ] Drop `bsVirtualRowTemplate` directive; route everything through `*bsRowTemplate`.
- [ ] Delete the `virtual-datatable` package and all references.

**Demo & dev**
- [ ] Rewrite `ArtistService` against the new backend.
- [ ] New `EmployeeService` for the org-chart demo.
- [ ] Migrate `datatables.component` to a single `<bs-datatable>` with one `[fetch]`.
- [ ] Add an org-chart demo page using `[tree]` + `[virtualScroll]` + `[showCheckboxes]`.
- [ ] `proxy.conf.json` + `environment.apiBase`.
- [ ] `.vscode/launch.json` + `tasks.json`.

## Out of scope

- `SubjectService` / `TagService` migration off `mintplayer.com` (not used by the datatable demo).
- Path-based or flat self-reference tree shapes — `parentId` + `childCount` is sufficient.
- Filter / search inputs on the fetch contract — add when needed.
- Drag-to-reorder rows.
- Auto-DNS / Traefik certificate provisioning for `bootstrap-api.mintplayer.com` (manual one-time setup).
