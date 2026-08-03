# The self-hosted Nx remote cache

Reference for the shared build cache at `https://nxcache.example.com`. Describes what is
deployed and how it behaves — everything here was measured against the live service on
2026-08-03, against **Nx 22.7.5**.

For *proposed changes* (the input-set bugs, e2e caching gaps), see
[`prd/nx-remote-cache-correctness.md`](prd/nx-remote-cache-correctness.md). This file is the
as-built record.

---

## 1. In one paragraph

Nx hashes every cacheable task and stores the result under that hash. A second machine computing
the same hash downloads the result instead of re-running the work. The cache is a small HTTP
service on the VPS, fronted by Traefik, which enforces a **read-write / read-only split by
token**. CI on `master` writes; pull requests and developers read. There is **no configuration
in this repository** — the cache is activated entirely by two environment variables.

## 2. The deployment

`enxtur/nx-caching-server` behind Traefik, in the VPS compose stack:

```yaml
services:
  nx-cache:
    image: enxtur/nx-caching-server:latest
    environment:
      - STORAGE_DIR=/data
      - PORT=8090
      - AUTH_TOKEN=${NX_CACHE_INTERNAL_TOKEN}
      - CLEANUP_THRESHOLD=336h
    volumes:
      - nx-cache-data:/data
```

### The token model — Traefik does the work, not the app

**The cache server itself understands exactly one token** (`AUTH_TOKEN`). It has no concept of
read-only access. The split is implemented at the proxy: three routers on the same host, plus a
middleware that rewrites whichever client token arrived into the server's internal one.

| router | priority | matches | allows |
|---|---|---|---|
| `nx-cache-rw` | `200` | host + `Authorization: Bearer <RW>` | **any method** |
| `nx-cache-ro` | `100` | host + (`GET`\|`HEAD`) + `Authorization: Bearer <RO>` | **reads only** |
| `nx-cache-fallback` | `1` | host | nothing — `ipallowlist` of `255.255.255.255/32` |

So there are three tokens in play, and they are not interchangeable:

| token | held by | purpose |
|---|---|---|
| `NX_CACHE_INTERNAL_TOKEN` | the container only | what the app actually checks; never leaves the VPS |
| `NX_CACHE_RW_TOKEN` | `master` CI, and the maintainer's machine | read + write |
| `NX_CACHE_RO_TOKEN` | pull-request CI | read only |

Two properties worth understanding, because they are what make the design safe:

- **Deny-by-default.** The fallback router matches the host and permits nothing. Anything that
  fails to match a specific allow-router lands there. All three priorities are explicit, so the
  ordering is declared rather than inherited from Traefik's rule-length default.
- **The RO refusal happens at the edge.** A `PUT` carrying the RO token matches neither allow
  router — wrong method for RO, wrong token for RW — so it is rejected by Traefik and never
  reaches the cache server at all.

## 3. The wire protocol

Nx's self-hosted cache API (OpenAPI, introduced in Nx 20.8) is two operations:

| | `PUT /v1/cache/{hash}` | `GET /v1/cache/{hash}` |
|---|---|---|
| auth | `Authorization: Bearer <token>` | same |
| body | binary `application/octet-stream` (a tar archive) | — |
| headers | `Content-Length` **required** | — |
| success | `200` | `200` + octet-stream |
| errors | `401` / `403` / **`409` cannot override** | `403` / `404` not found |

### Observed status codes, and which layer produces each

Knowing *where* a code comes from is the difference between "misconfigured proxy" and "the cache
is behaving correctly":

| request | code | produced by |
|---|---|---|
| `GET` existing key, valid token | `200` | app |
| `GET` missing key, valid token | `404` | app |
| `GET` or `PUT`, bad or absent token | `403` | **Traefik** (fallback deny) |
| `PUT` with the **RO** token | `403` | **Traefik** (no matching allow-router) |
| `PUT` a new key with the RW token | `200` | app |
| `PUT` an **existing** key with the RW token | `409` | app — entries are immutable |
| `DELETE` with the RW token | `405` | app — the RW router permits the method; the app declines |

**Entries are immutable.** A `409` on re-`PUT` means even a writer cannot replace an existing
entry — only publish a hash nobody has published yet. There is also no `DELETE`, so an entry
cannot be withdrawn on demand; it ages out instead (§4).

## 4. Retention and storage

`CLEANUP_THRESHOLD=336h` — **14 days**. Storage is a single Docker volume (`nx-cache-data`),
unbounded within that window.

Practical consequence: a bad entry is a *bounded* problem, not a permanent one. Whether the
threshold is measured from creation or from last access was not determined; it only decides
whether a frequently-hit entry survives indefinitely or is rebuilt fortnightly.

## 5. How Nx activates it — nothing lives in this repo

Searching the workspace for the cache configuration finds almost nothing, and that is correct.
Activation is purely environmental:

- **`nx.json` and `package.json` reference neither variable.** The only in-repo mentions are the
  `env:` blocks of the two workflow files.
- The **JavaScript** layer reads only `NX_SELF_HOSTED_REMOTE_CACHE_SERVER`, purely to decide
  whether to construct the HTTP cache at all (`nx/dist/src/tasks-runner/cache.js`).
- The **token is read inside the Rust addon**, never in JavaScript. Both names appear as literals
  in `@nx/nx-<platform>/nx.<platform>.node` — which is why grepping `node_modules/nx` for the
  token comes up empty.
- The binary also contains an undocumented third name, **`NX_REMOTE_CACHE_URL`**, apparently an
  accepted alias for the server URL.

It is built into Nx core: **no Powerpack package, no plugin, no licence key.**

```bash
NX_SELF_HOSTED_REMOTE_CACHE_SERVER=https://nxcache.example.com
NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN=<RW or RO token>
```

> **The cache is on for any process holding those two variables and off for any process that is
> not, with no signal in the repo either way.** A maintainer with them set is silently sharing a
> cache with CI; a new contributor without them silently is not, and nothing will tell them.

### One trap that silently disables everything

`_getRemoteCache()` checks `isNxCloudUsed(nxJson)` **first** and returns the Nx Cloud client if so
— the self-hosted HTTP cache is never consulted. So an `nxCloudId` appearing in `nx.json` (which
`nx migrate` has done in this workspace before) does not sit alongside the self-hosted cache, it
**silently replaces it**. No error, no warning.

`nx.json` is clean today. The durable guard is `"neverConnectToCloud": true`, which makes
`isNxCloudUsed()` return `false` regardless — see the PRD, where it is proposed as C3.

## 6. CI wiring

Both workflows set it once at the top level, above `jobs:`, so every job inherits it:

```yaml
env:
  NX_SELF_HOSTED_REMOTE_CACHE_SERVER: ${{ secrets.NX_CACHE_SERVER }}
  NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN: ${{ (github.event_name == 'push' && github.ref_name == github.event.repository.default_branch) && secrets.NX_CACHE_RW_TOKEN || secrets.NX_CACHE_RO_TOKEN }}
```

`pull-request.yml` triggers only on `pull_request`, so `github.event_name` is never `'push'` and
that expression always selects the **read-only** token there. That is deliberate: **preventing a
pull request from polluting the cache is the point of the split.**

The consequence is worth stating plainly:

- **`master` pushes populate the cache.**
- **A PR reads it** — hitting for every project it did not touch, on top of what `affected`
  already skips.
- **A PR's own re-runs never get faster**, because nothing it does is written. Accepted cost.

Every test and build step already runs through Nx, so all of them participate:

| step | command |
|---|---|
| Build | `nx build --configuration=production` |
| Unit tests | `nx affected --target=test --base=… --head=…` |
| E2E | `nx affected --target=e2e --parallel=1` |
| Accessibility gate | `nx run-many -t e2e-a11y --parallel=1` |
| E2E (live API) | `nx run ng-bootstrap-demo-e2e:e2e-live` |
| Test API | `dotnet test …` — **the only step outside Nx** |

## 7. What is actually cached

Cacheability comes from `nx.json`'s `targetDefaults`, whose keys match either a **target name** or
an **executor**. That distinction is the source of every surprise in this table:

| target | cached | why |
|---|---|---|
| `build` (all projects) | yes | name-keyed `build` entry, so it applies regardless of executor |
| `test` (all vitest projects) | yes | executor-keyed (`@analogjs/vitest-angular:test`, `@nx/vitest:test`) |
| `lint` | yes | executor-keyed |
| `e2e` (all three demo apps) | yes | name-keyed `e2e` entry |
| `e2e-a11y` (all three) | **no** | no `targetDefaults` key named `e2e-a11y` |
| `e2e-live` | **no** | same — and it should stay uncached: it asserts against a live backend |
| `api:test` | **no** | it is `nx:run-commands`, and `test` is only executor-keyed |
| `api:build` | yes | rides the name-keyed `build` entry |

`e2e` also declares `outputs` on the react and vue apps but not on the ng one, so a cache hit
restores the Playwright report for two of the three. See the PRD (C2) for the levelling fix.

## 8. Cross-machine and cross-OS reuse

**It works. The OS is not part of the hash.** Verified by dumping all 1067 hash-plan entries for a
build task: 382 `files`, 683 `external` (`npm:` nodes), 1 `environment`
(`NX_CLOUD_ENCRYPTION_KEY`, unset both locally and in CI so it agrees), 0 `runtime`, 3 config
nodes. **No platform, arch, node-version or Nx-version entry.** File paths are `/`-normalised
already.

Two things that would normally break cross-OS hashing, and why they don't here:

- **Platform-specific npm packages** (`@nx/nx-*`, `@esbuild/*`, `@rollup/*`, `sass-embedded-*`)
  *are* hashed — but the set comes from the **lockfile**, not from what is installed, so all
  platform variants appear on every machine. Identical on Windows and Linux.
- **Line endings.** `.gitattributes` sets `* text=auto eol=lf`, which overrides any
  `core.autocrlf`. **That line is load-bearing for cross-OS caching** — without it, Windows
  worktrees would produce different file hashes and cross-OS hits would silently fall to zero.

### One unresolved upstream risk

[nrwl/nx#29890](https://github.com/nrwl/nx/issues/29890) reports a cross-Linux/Windows cache
**hit** whose nested output *files* failed to restore — console output replayed, artifacts
missing. Closed as outdated, against the now-deprecated S3 plugin, so it may not apply to the
current HTTP path. It has not been reproduced here.

It matters because the failure mode is **silent partial success**, and this pipeline has a bad
place for it to land: the PR workflow feeds `dist/` from the Build step into `upload-artifact`,
which the publish dry-run then consumes. A cached build that restored no files would upload an
empty artifact and fail obscurely rather than loudly.

**So when verifying a cross-OS hit, assert the restored files on disk — not the words "cache
hit".**

## 9. Warming the cache from a developer machine

A machine holding the **RW** token publishes as it works: run a cacheable target and the result
goes to the shared cache. Confirmed by sampling `.nx/cache` (whose directories are named by task
hash) and querying each on the server — all present.

**But the command shape must match what CI runs, exactly.** Task *overrides* are part of the hash:

```bash
nx test mintplayer-web-components                  # one hash
nx test mintplayer-web-components --pool=threads    # a DIFFERENT hash
```

Demonstrated: after a `--pool=threads` run had populated the cache, the plain form still re-ran
from scratch. The same applies to a `-- <spec-file>` filter.

> To warm the cache **for CI**, run **CI's** command — no extra flags, no spec filters.
> `nx test <project>` matches `nx affected --target=test`; `nx build <project>
> --configuration=production` matches the Build step. Anything else populates a hash nobody asks
> for.

Two local habits that defeat this:

- **`--pool=threads`** — the workaround for the flaky Windows vitest pool. It forks the hash. The
  companion env vars (`NX_ISOLATE_PLUGINS=false NX_DAEMON=false`) are *harmless*, since they are
  not declared inputs.
- **Running Playwright directly.** `npx playwright test --config=…` bypasses Nx entirely and
  writes nothing. Only `nx run <app>-e2e:e2e` populates the e2e cache.

## 10. Verifying it

### The service, with `curl`

```bash
BASE=https://nxcache.example.com
AUTH="Authorization: Bearer $TOKEN"

# reachability + auth: a hash that cannot exist
curl -s -o /dev/null -w '%{http_code}\n' -H "$AUTH" "$BASE/v1/cache/probe-does-not-exist"   # 404

# auth is enforced
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/v1/cache/probe-does-not-exist"              # 403

# the read-only guarantee — MUST use a key that does not already exist
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "$RO_AUTH" \
  -H 'Content-Type: application/octet-stream' --data-binary 'probe' \
  "$BASE/v1/cache/probe-ro-$(date +%s)"                                                     # 403
```

> Use a **fresh** key when testing the read-only path. A server that rejected only *existing*
> keys would pass a careless test while still letting a PR publish new hashes, so refusing an
> absent key is what actually proves the refusal is about the token.

### That a local run reached the server

`.nx/cache` directories are named by task hash, so any of them can be looked up directly:

```bash
HASH=$(ls -t .nx/cache | grep -E '^[0-9]+$' | head -1)
curl -s -o /dev/null -w '%{http_code}\n' -H "$AUTH" "$BASE/v1/cache/$HASH"   # 200 = published
```

### That Nx is really using it

```bash
nx run <project>:<target>          # "[local cache]" or "[remote cache]" in the output
rm -rf .nx/cache                   # then re-run: must report [remote cache]
```

## 11. Known gaps

Documented here so nobody assumes the cache is trustworthy today. The fixes are the PRD's
milestones C1–C3.

1. **`tools/e2e-shared/**` is an input to no target.** The e2e specs import their shared suites by
   relative path across a project boundary; `tools/` is not an Nx project and `sharedGlobals` is
   empty, so **editing a shared suite does not invalidate the e2e cache.** 21 spec files across
   the three demo apps are affected.
2. **`sharedGlobals` is `[]`**, so `package-lock.json`, `nx.json` and `tsconfig.base.json` are
   inputs to nothing. **A dependency bump cannot invalidate any cached result.** Playwright's
   browser binaries are installed outside Nx entirely, so a browser upgrade can't either.
3. **`e2e-a11y` is uncached** on all three demo apps (§7).
4. **`outputs` are declared unevenly** across the e2e targets (§7).

Until 1 and 2 are fixed, **a cache hit can serve a pass that the current source would not
produce** — and with a 14-day retention, an entry written today can be reused for a fortnight.

## 12. Troubleshooting

| symptom | likely cause |
|---|---|
| Everything re-runs; never `[remote cache]` | The two env vars are absent from that shell. Nothing in the repo will tell you. |
| Local runs never appear on the server | Holding the **RO** token. The refusal may be silent — Nx's behaviour on a write `403` is undocumented and lives in the Rust addon. |
| CI never reuses a local run | The command shape differs — extra flags fork the hash (§9). |
| Cache stopped being used after `nx migrate` | An `nxCloudId` in `nx.json` silently replaces the self-hosted cache (§5). |
| A hit, but expected output files are missing | Possibly nx#29890 (§8). Check files on disk, not the log. |
| `403` on a read that should work | Traefik's deny-all fallback: token wrong, or method not `GET`/`HEAD` for an RO token. |
| `409` on a write | Correct and expected — that hash already exists and entries are immutable. |
