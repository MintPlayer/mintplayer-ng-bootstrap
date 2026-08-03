# Nx remote cache — make it correct first, then make it hit

**Status:** proposed
**Branch:** `feat/scheduler-compact-timeline-i18n` (carried in the scheduler PR, by request)
**Date:** 2026-08-03

## 1. The question, and why the answer is not the expected one

The ask was: *can we run the e2e tests (and all tests) through Nx so results are cached in the
self-hosted cache at `nxcache.example.com`, and how do we make the GitHub workflow reuse
those artifacts?*

Both halves of the premise turn out to be already satisfied, so the useful work is somewhere
else entirely.

**Everything already runs through Nx.** Only `dotnet test` does not.

| CI step | Command | Through Nx? |
|---|---|---|
| Build | `npx nx build --configuration=production` | yes |
| Unit tests | `npx nx affected --target=test --base=… --head=…` | yes |
| Test API (xUnit) | `dotnet test apps/api/Tests/Api.Tests.csproj -c Debug` | **no** |
| E2E tests | `npx nx affected --target=e2e --parallel=1` | yes |
| E2E accessibility gate | `npx nx run-many -t e2e-a11y --parallel=1` | yes |
| E2E (live API) | `npx nx run ng-bootstrap-demo-e2e:e2e-live` | yes |

**And the self-hosted cache is already wired into CI.** Both workflows set it at the top level
(`pull-request.yml:13-15`, `publish-master.yml:17-19`), with a deliberate token split:

```yaml
env:
  NX_SELF_HOSTED_REMOTE_CACHE_SERVER: ${{ secrets.NX_CACHE_SERVER }}
  NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN: ${{ (github.event_name == 'push' && github.ref_name == github.event.repository.default_branch) && secrets.NX_CACHE_RW_TOKEN || secrets.NX_CACHE_RO_TOKEN }}
```

So the question "how do we set this up" has already been answered by whoever wrote those two
files. What has *not* been answered is why it appears to do nothing — and, much more
importantly, whether it is currently safe.

**It is not currently safe.** §3 is the real finding, and it is a correctness bug, not a
performance one. §4 explains the missing hits. If only one section gets read, read §3.

## 2. Confirmed mechanics

Measured against the installed Nx, not from memory. **The installed Nx is 22.7.5 stable** —
`nx` and all twelve `@nx/*` packages agree, in `package.json` and in the lockfile. (An earlier
note in this workspace's history claimed 23.1.0-beta; that is stale and was checked rather than
assumed.)

- **`NX_SELF_HOSTED_REMOTE_CACHE_SERVER` is implemented by Nx core.** `getHttpCache()` returns
  a native `HttpRemoteCache` when the variable is set
  (`node_modules/nx/dist/src/tasks-runner/cache.js:248-257`). No Powerpack package, no plugin,
  no licence key.
- **Nothing in the workspace configures the cache, and nothing should.** Activation is purely
  environmental. The only two references anywhere outside `node_modules` are the `env:` blocks in
  the two workflow files; `nx.json` and `package.json` mention neither variable. That is why
  searching the workspace for the token finds nothing:
  - the **JS** layer reads only `NX_SELF_HOSTED_REMOTE_CACHE_SERVER`, purely to decide whether to
    construct the HTTP cache at all;
  - the **token is read inside the Rust addon**, never in JavaScript. Both names are present as
    literals in `node_modules/@nx/nx-win32-x64-msvc/nx.win32-x64-msvc.node`, alongside a third,
    undocumented alias — **`NX_REMOTE_CACHE_URL`** — which appears to be an accepted alternative
    spelling for the server URL.

  The practical consequence: the cache is on for any process that has the two variables in its
  environment, and off for any that does not, with no in-repo signal either way. A developer with
  them set is silently sharing a cache with CI; a developer without them silently is not.
- **Nx Cloud wins outright if configured.** `_getRemoteCache()` checks `isNxCloudUsed(nxJson)`
  *first* and returns the cloud client on the spot; the S3/GCS/Azure/HTTP chain below is never
  reached (`cache.js:180-222`). A stray `nxCloudId` in `nx.json` therefore does not merely sit
  alongside the self-hosted cache — it silently replaces it.
- **`nx.json` currently has no `nxCloudId` or `nxCloudAccessToken`.** Good. But `nx migrate`
  has re-added that key in this workspace before, so it needs a guard rather than vigilance.
- **The token split works as written, and PRs are read-only.** `pull-request.yml` triggers only
  on `pull_request`, so `github.event_name` is never `'push'` and the RW branch of that
  expression is unreachable *in that file*. That matches the comment above it, so it is
  intentional, not a bug — but it has a consequence nobody seems to have drawn out (§4.1).

## 3. The correctness problem: two ways the cache can serve a stale pass

A cache that returns a wrong answer is worse than no cache, because the wrong answer it returns
is **"your tests passed"**. Both of the following are live today.

### 3.1 `tools/e2e-shared/**` is not an input to any e2e target

The e2e specs import their shared suites across a project boundary by relative path:

```ts
// apps/ng-bootstrap-demo-e2e/e2e/carousel.spec.ts:2
import { carouselJsSuite } from '../../../tools/e2e-shared/carousel-suites';
```

There is no tsconfig path mapping for `tools/`, and `tools/` is not an Nx project, so Nx builds
no dependency edge. The `e2e` target's inputs are `["default", "^production"]`, and `default`
is `{projectRoot}/**/*` plus a `sharedGlobals` that is **empty**. `tools/` matches neither.

**Editing a shared suite therefore does not invalidate the e2e cache.** This is not
hypothetical: earlier in this very PR, `tools/e2e-shared/carousel-suites.ts` was modified. Had
the cache been hitting, that change would have been skipped and CI would have reported a pass
for the old suite. Roughly half the e2e surface across all three demo apps lives in `tools/`.

### 3.2 `sharedGlobals` is empty, so nothing global ever invalidates anything

`"sharedGlobals": []` means `package-lock.json`, `nx.json`, `tsconfig.base.json` and the
workflow files are inputs to **no target in the workspace**. A dependency bump — a new Angular
patch, a new Playwright, a new Lit — produces byte-identical task hashes, so every build and
every test can be served from cache against the *previous* dependency tree.

The Playwright browser binaries make this sharper still: they are installed by
`npx playwright install`, entirely outside Nx's knowledge, so a browser upgrade cannot
invalidate an e2e result either.

### 3.3 The two combine badly with cross-machine reuse

**The OS is not in the hash, and cross-OS reuse works.** This was measured, not inferred: Nx's
own `HashPlanInspector` was run against `mintplayer-web-components:build:production` and all
**1067** hash-plan entries dumped — 382 `files`, 683 `external` (`npm:` nodes), 1 `environment`
(`NX_CLOUD_ENCRYPTION_KEY`), 0 `runtime`, 0 `depOutputs`, 3 config nodes. **No OS, platform,
arch, node-version or Nx-version entry exists**, and file paths are already `/`-normalized.

Two things that would normally break cross-OS hashing were checked and are clean here:

- **Platform-specific npm packages** (`@nx/nx-*`, `@esbuild/*`, `@rollup/*`, `sass-embedded-*`)
  *are* hashed, but the set comes from the **lockfile**, not from what is installed — all ten
  `@nx/nx-*` platform packages appear on Windows. Byte-identical on Linux.
- **Line endings.** `core.autocrlf` would be fatal, but `.gitattributes` sets `* text=auto
  eol=lf`, which overrides it; the worktree really is LF. **That line is load-bearing for
  cross-OS caching** — worth knowing before anyone "simplifies" `.gitattributes`.

So cross-OS reuse works, which is the opportunity *and* the hazard. For a build target it is
fine. For an **e2e** target it means a green result produced against Chromium on a developer's
Windows box can satisfy CI's Linux run of the same hash. Combined with §3.1 and §3.2, "the same
hash" is a much weaker statement than it sounds.

**One unresolved risk, and it is the nasty kind.** [nrwl/nx#29890](https://github.com/nrwl/nx/issues/29890)
reports a cross-Linux/Windows cache **hit** whose nested output *files* failed to restore —
console output replayed, artifacts missing. Closed as outdated, against the now-deprecated S3
plugin, so it may not apply to the current HTTP path. But the failure mode is **silent partial
success**, which is worse than a miss. Separately, `hashPlans()` passes `cwd` into the Rust
hasher and that could not be traced into the compiled addon; almost certainly only for `runtime`
inputs (of which this repo has none), but it is unproven.

Both unknowns collapse into a single verification step: the first cross-OS trial must check the
**restored artifacts on disk**, not merely that Nx printed "cache hit".

## 4. Why the cache does not appear to hit

### 4.1 Pull requests can read but never write

The token expression gives PRs `NX_CACHE_RO_TOKEN`. That is a sound decision — a writable cache
reachable from PR CI is a supply-chain hazard — but it means **a feature branch never populates
the cache**. Only pushes to `master` do.

So on a branch like this one, with changed library source, essentially nothing matches what
master last wrote, nothing gets written, and a re-run of the same commit re-does all the work.
That is exactly the "it seems to do nothing" symptom.

### 4.2 Two of the three e2e targets are not cacheable at all

Resolved with `nx show project ng-bootstrap-demo-e2e --json`:

| target | cache | inputs | outputs |
|---|---|---|---|
| `e2e` | `true` | `[default, ^production]` | — |
| `e2e-live` | *unset* | — | — |
| `e2e-a11y` | *unset* | — | — |

`targetDefaults` keys match a target *name* (or an executor), and there is no entry for
`e2e-a11y` or `e2e-live`. Both run on every PR — the axe gate deliberately via `run-many` — and
neither can ever be skipped.

The gap is uniform across the three demo apps, which at least makes it cheap to close:

| project | `e2e` | `e2e-a11y` | `e2e-live` |
|---|---|---|---|
| ng-bootstrap-demo-e2e | cached | **uncached** | uncached |
| react-bootstrap-demo-e2e | cached | **uncached** | — |
| vue-bootstrap-demo-e2e | cached | **uncached** | — |

### 4.3 `outputs` are declared inconsistently

Not "nowhere" — unevenly, which is worse because it looks deliberate:

| target | declares `outputs`? |
|---|---|
| react/vue `e2e` | yes — `{workspaceRoot}/dist/.playwright/apps/<app>-e2e` |
| ng `e2e` | **no** |
| ng `e2e-live` | no |
| all three `e2e-a11y` | no |

With no `outputs`, Nx caches the terminal output and nothing else, so a hit restores the *log*
of a Playwright run but not its HTML report, traces or `test-results/`. A restored "pass" then
has no evidence behind it.

### 4.4 `apps/api:test` exists as an Nx target — CI just doesn't use it

The .NET project *is* in the Nx graph (`apps/api/project.json`, `projectType: application`),
with `build`, `publish`, `serve` and `test` targets. `api:build` even resolves to `cache: true`,
because `targetDefaults` has a **name**-keyed `build` entry that applies regardless of executor.

But `api:test` is `nx:run-commands` wrapping `dotnet test`, and `targetDefaults` has no
name-keyed `test` entry — only the two executor-keyed vitest ones. So it resolves with **no
`cache` key at all**: the single test target in the workspace Nx does not cache.

And CI calls `dotnet test …` directly rather than `nx run api:test`, so the .NET suite also sits
outside `affected` and runs on every PR whether or not `apps/api` changed.

### 4.5 On master, `nx affected --target=test` may be testing nothing

`publish-master.yml:55` runs `npx nx affected --target=test` with **no `--base`/`--head`** and no
`NX_BASE`/`NX_HEAD`. `nx.json` sets `defaultBase: master`, the workflow triggers on push to
master, and its checkout takes **no `fetch-depth` override** — so it is a depth-1 clone in which
the local `master` ref and `HEAD` are the same commit.

`base == head` is a zero-diff comparison, and Nx treats that as "nothing changed" — an empty
affected set, not a full one. The step then passes having tested **zero projects**, silently,
on every push to master. The PR workflow is unaffected: it passes explicit base/head SHAs and
fetches full history.

This is inferred from the checkout and base-resolution mechanics, not observed at runtime, so
it needs confirming — but it is cheap to confirm and serious if true.

## 5. Design

### D1 — Fix the inputs before enabling anything else

Nothing in this document should ship before §3 is closed. Enabling more caching on top of an
input set that misses `tools/` and `package-lock.json` increases the rate at which a stale pass
is served.

- `sharedGlobals` gains `package-lock.json`, `nx.json` and `tsconfig.base.json`.
- A named input `e2eShared` covering `{workspaceRoot}/tools/e2e-shared/**/*` is added to every
  e2e target's inputs.
- The Playwright version is pinned into the hash as an explicit `externalDependencies` input,
  so a browser/runner upgrade invalidates e2e results.

**Cost, stated honestly:** widening `sharedGlobals` invalidates every cached task in the
workspace whenever the lockfile changes. That is correct, and it is also a real slowdown on
dependency bumps. It is not negotiable — the alternative is a cache that lies.

### D2 — Make `e2e-a11y` cacheable; leave `e2e-live` uncached

`e2e-a11y` is a pure function of the demo sources and the axe suites, so it caches on the same
terms as `e2e`.

`e2e-live` boots a real `dotnet run` backend and asserts against it. Its result depends on
`apps/api` source that Nx does not model, and on a live process. Caching it would mean claiming
the backend contract still holds without having talked to the backend. **Explicitly excluded**,
with a comment saying why, so nobody "fixes" the omission later.

### D3 — Declare `outputs` so a hit restores the artifacts

Each e2e target declares its report and results directories. A developer who gets a cache hit
should still be able to open the trace.

### D4 — Pull requests stay read-only. **Settled, and not a trade-off after all.**

An earlier draft of this section proposed letting same-repo PRs write, on the grounds that it is
what makes the cache pay. That was wrong, because it misread what the token split is *for*.

**The stated intent of the read-only token is to stop a pull request from polluting the cache.**
That is not a cost being weighed against speed — it is the requirement. A design that lets PRs
write does not trade some safety for some speed; it deletes the feature.

So: **PRs keep the read-only token, unchanged.** The workflow needs no edit at all. What follows
is kept because it is what makes that posture *hold*, and because one probe result suggests it
may not hold today.

**The server was probed directly, and it is spec-correct.** Measured against
`https://nxcache.example.com` on 2026-08-03:

| probe | result | verdict |
|---|---|---|
| `GET` a hash that cannot exist, valid token | `404` | correct |
| `GET` with a wrong token | `403` | auth enforced |
| `GET` with no `Authorization` header | `403` | auth enforced |
| `PUT` a new key | `200` | stores; `GET` returns the bytes |
| `PUT` the SAME key with different content | **`409`** | **immutability holds** |
| `GET` after the refused overwrite | original content | not corrupted |
| `DELETE` | `405` | not supported — see below |

Two results carry weight for the read-only posture.

**`409` on overwrite is a genuine second line of defence.** Even a writer cannot replace an
existing entry, so the worst a writer can do is publish a hash nobody has published yet.

**`DELETE` returns `405`**, so an entry cannot be withdrawn on demand. It is not permanent,
though — see D4e: entries age out after 14 days. The ordering in the plan still holds, for a
weaker but sufficient reason: **whoever holds a write token should not run against the current
input set**, because for up to a fortnight they are publishing entries keyed by a hash that
ignores `tools/` and the lockfile. That applies to the developer machine today, not only to some
future CI change.

### D4e — The server, as deployed, and what it explains

The deployment is `enxtur/nx-caching-server` behind Traefik, and reading it resolves several
things this document had been treating as unknowns.

**The upstream app has exactly one token** (`AUTH_TOKEN`). The read-only/read-write split is not
an application feature at all — **Traefik implements it**, with three routers on the same host and
a middleware that swaps whichever client token arrived for the server's internal one:

| router | priority | matches | effect |
|---|---|---|---|
| `nx-cache-rw` | 200 | host + `Authorization: Bearer <RW>` | any method |
| `nx-cache-ro` | 100 | host + (`GET`\|`HEAD`) + `Authorization: Bearer <RO>` | reads only |
| `nx-cache-fallback` | 1 | host | `ipallowlist` of `255.255.255.255/32` — denies everything |

All three priorities are explicit, so the ordering the read-only guarantee depends on is declared
rather than inferred from Traefik's rule-length default. That is the right call and it is already
done — deny-all at the bottom, two explicit allow routers above it.

Every probe result in D4/D4a falls out of that table, which is a good sign the design is doing
what it looks like:

- RO + `PUT` matches neither of the first two (wrong method for RO, wrong token for RW), so it
  lands on the deny-all fallback → **`403`**. The refusal is at the edge; the request never
  reaches the cache server.
- A bad token or no token → same fallback → `403`.
- RW + `PUT` on an existing key → reaches the app → **`409`**. So immutability is the
  *application's* behaviour, not Traefik's.
- RW + `DELETE` → the RW router permits any method, so this reaches the app too → **`405`** is the
  app declining, not the proxy.

**Retention is 14 days.** `CLEANUP_THRESHOLD=336h`. This answers what was open question 4 and
corrects an earlier claim in this document that entries are permanent — they are not. Whether the
threshold is measured from creation or last access depends on the image and was not determined;
either way the horizon is a fortnight. Storage is a single Docker volume (`nx-cache-data`),
unbounded within that window.

**Nothing to change in the deployment.** An earlier draft of this section claimed the fallback
router lacked an explicit priority and recommended adding one. That was read off a truncated view
of the file and was simply wrong — `priority=1` is set.

### D4a — The read-only token is genuinely read-only. **Verified 2026-08-03.**

Measured directly against `nxcache.example.com` with the real `NX_CACHE_RO_TOKEN` (64 chars,
distinct from the RW token):

| probe | result | verdict |
|---|---|---|
| `GET` an existing key | `200` | reads work — the token is valid, not merely rejected outright |
| `GET` a missing key | `404` | correct |
| **`PUT` a key that does NOT exist** | **`403 Forbidden`** | **writes refused** |
| `PUT` a key that DOES exist | `403`, not `409` | refused on *authorization*, before immutability |
| `GET` the refused key afterwards, with RW | `404` | nothing was written |
| the pre-existing entry afterwards | unchanged | not corrupted |

**The anti-pollution guarantee holds.** A pull request cannot write to the cache.

Two details make this a stronger result than a bare `403` would be:

- **A fresh key was used deliberately.** A server could enforce read-only by rejecting only
  *existing* keys, which passes a careless test while still letting a PR publish new hashes. This
  refused a key that did not exist, so the refusal is about the token, not the key.
- **The existing-key case returned `403`, not `409`.** Authorization is checked *before* the
  immutability rule, so the refusal is genuinely token-based rather than an accident of the entry
  already being present.

Worth recording that this was the one assumption the whole posture rested on, and that until it
was run it was unmeasured — the RW token's `PUT` → `200` had been the only write ever tested, and
it proves nothing here. Nx cannot enforce this client-side: it has **no read-only mode**, and a
grep of the entire package finds only `NX_CLOUD_ACCESS_TOKEN`/`NX_CLOUD_AUTH_TOKEN`, both
Cloud-only. The client sends one bearer token; the server decides. `nxcache.example.com`
decides correctly.

### D4c — Warming the cache from a developer machine: measured, and it works

The device holding the RW token does publish, and CI can read what it publishes. Both halves were
verified on 2026-08-03 rather than reasoned about.

**Writes happen.** Thirteen local cache entries were sampled from `.nx/cache` (whose directories
are named by task hash) and each queried on the server: **all returned `200`**, including one
written thirty seconds earlier. A local run of a cacheable target genuinely populates the shared
cache.

**Reads will work.** Nothing machine-specific enters the hash: the OS is absent (§3.3),
`.gitattributes` normalises line endings, platform npm packages come from the lockfile, and the
single `environment` entry in the hash plan — `NX_CLOUD_ENCRYPTION_KEY` — is unset both locally
and in CI, so it agrees. PRs hold the read-only token, and `GET` with it returns `200` (D4a).

**But the command shape must match exactly, and this is easy to get wrong.** Task *overrides* are
part of the hash. Demonstrated: `nx test mintplayer-web-components --pool=threads` and a plain
`nx test mintplayer-web-components` are **different hashes** — the plain form re-ran for 66s
rather than hitting the cache the flagged form had populated. The same applies to a
`-- <spec-file>` filter.

The practical rule, which is the whole point of this subsection:

> To warm the cache *for CI*, run the command **CI runs** — no extra flags, no spec filters.
> `nx test <project>` matches CI's `nx affected --target=test`; `nx build <project>
> --configuration=production` matches its Build step. Anything else populates a hash nobody will
> ask for.

Two corollaries worth stating because they cost real time to discover:

- **Local Windows habits defeat this.** `--pool=threads` and `NX_ISOLATE_PLUGINS=false
  NX_DAEMON=false` are the local workarounds for a flaky plugin worker. The env vars are harmless
  (not declared inputs, so no hash effect), but `--pool=threads` silently forks the hash.
- **Running Playwright directly does not warm the e2e cache at all.** `npx playwright test
  --config=…` bypasses Nx entirely, so it writes nothing. Only `nx run <app>-e2e:e2e` does.

**And the sting: this is currently a liability, not a benefit.** Every entry published from this
machine is keyed by a hash that ignores `tools/e2e-shared/**` and `package-lock.json` (§3), and
`DELETE` returns `405` (D4), so none of it can be withdrawn on demand. It does age out after 14
days (D4e), so the damage is bounded rather than permanent — but **warming the cache before C1
lands still means up to a fortnight of entries a later CI run can hit when it should not.**

### D4d — One risk specific to this pipeline: a build cache hit that restores no files

nx#29890 (§3.3) describes a cross-OS hit that replayed console output but failed to restore output
*files*. If that still occurs on the current HTTP path, this workspace has an unusually bad place
for it to land: the PR workflow's Build step feeds `dist/` into `upload-artifact`, which
`dry-run-publish-libs` then consumes. A build served from cache with an empty `dist/` would not
fail loudly — it would upload an empty artifact and the publish dry-run would find nothing.

This is the concrete reason M6 asserts **files on disk** rather than trusting the words "cache
hit", and the reason `build` deserves that check before anyone relies on cross-OS build reuse.

### D4b — Where the speed comes from instead

With PRs read-only by design, the cache pays off on a different path, and it is worth being
explicit that this is the *intended* one rather than a consolation prize:

- **Master warms the cache.** Every push to `master` writes entries for every project.
- **A PR branching off a warm master hits for everything it did not touch.** `affected` already
  narrows the task list; the cache narrows what survives that.
- **Fixing §3 makes this work far better than it does today**, because right now a PR that
  touches one lib still shares no hashes with master for anything that transitively depends on
  the workspace-wide files `sharedGlobals` fails to declare.

The corollary: **a PR's own re-runs never get faster**, and nothing will change that without
giving PRs write access. That is the accepted cost of the posture.

### D5 — `neverConnectToCloud: true`, not a lint rule

The first draft of this proposed a CI grep for `nxCloudId`. There is a proper mechanism:
`isNxCloudDisabled()` checks `NX_NO_CLOUD === 'true' || nxJson.neverConnectToCloud` and
short-circuits `isNxCloudUsed()` to `false`. Setting `"neverConnectToCloud": true` in `nx.json`
means a future `nx migrate` re-adding `nxCloudId` **cannot** take the self-hosted cache offline,
rather than merely being noticed afterwards.

This is the single highest value-per-character change in the document: one key, and the silent
failure mode from §2 becomes unreachable. Keep the CI grep as well if desired, but the config
key is the actual fix.

### D6 — `apps/api:test` should be cacheable, and CI should call it

Revised from "leave it alone", which was based on the mistaken belief that the .NET project was
outside the Nx graph. It is not (§4.4) — the target exists, and `api:build` is already cached.

- Give `api:test` `cache: true` with inputs mirroring `api:build`'s (`*.cs`, `*.csproj`,
  appsettings) plus the test project's own sources.
- Switch both workflows from `dotnet test …` to `nx run api:test`, so it joins `affected` and
  stops running on PRs that touch no C#.

Lower priority than C1-C3 and strictly additive, but it is a whole suite currently running on
every PR for no reason.

### D7 — Fix the master `affected` base, or drop `affected` there

§4.5 suggests the master Test step exercises nothing. Two honest options: give the checkout
`fetch-depth: 0` and pass `--base=${{ github.event.before }}`, or accept that a master push
should test everything and use `run-many` — which is what the Build step in that same workflow
already does, for exactly this class of reason. Confirm the diagnosis first.

## 6. Non-goals

- Migrating to Nx Cloud. The self-hosted server is deliberate.
- Nx Agents / distributed task execution.
- Changing the `affected` base/head computation.
- Caching `dotnet test` (D6).
- Any change to what the tests assert.

## 7. Verification plan

The hard part is proving a cache is *correct*, which is not something a green pipeline shows —
a broken cache also produces a green pipeline. So each of these is a deliberate
falsification attempt:

1. **The `tools/` bug, reproduced then fixed.** With the cache warm, edit a
   `tools/e2e-shared/*.ts` suite to assert something false. Before the fix, `nx e2e` must
   report a cache hit and pass. After the fix, it must re-run and fail. If it does not fail
   after the fix, the input is still wrong.
2. **The lockfile bug, same shape.** Warm cache, touch `package-lock.json`, confirm the task
   re-runs.
3. **Hit rate, measured not assumed.** `nx e2e` twice in a row locally: second run reports
   `[local cache]`. Then with the local cache dir cleared: second run reports
   `[remote cache]`.
4. **Cross-machine.** Warm from this Windows machine, then confirm a Linux CI run reports a
   remote hit for an untouched project — this is also what proves the OS is not in the hash.
5. **`e2e-live` still runs.** Assert it reports no cache hit ever.
6. **The nxCloudId guard fires.** Add the key locally, confirm CI fails.

## 8. Open questions

1. ~~D4 or D4b~~ — **settled: PRs stay read-only.** Preventing a pull request from polluting the
   cache is the purpose of the split, not a cost to be weighed. No workflow change.
2. ~~Is `NX_CACHE_RO_TOKEN` actually refused on `PUT`?~~ — **answered: yes, `403` on a fresh key.**
   Reads still work (`200`/`404`). The anti-pollution guarantee is verified, not assumed. See D4a.
3. **What does a read-only token holder see on a refused write?** A warning or a silent no-op?
   The behaviour lives in the Rust addon and is undocumented beyond the status code. If silent,
   developers will believe they are warming a cache they cannot write to.
4. ~~Storage bounds and retention~~ — **answered from the deployment: `CLEANUP_THRESHOLD=336h`,
   i.e. 14 days**, on a single Docker volume. Remaining sub-question, minor: is the threshold
   measured from creation or last access? That decides whether a hot entry survives indefinitely
   or is rebuilt fortnightly.
5. **Do the Git LFS visual-regression baselines hash correctly?** If the hasher sees LFS pointer
   files while a runner has the real bytes (or the reverse), that is another silent-wrong-result
   path. Unverified.

**Housekeeping:** the probes left one permanent junk entry, `probe-write-check-20260803`
(5 bytes, content `probe`). It cannot collide with a real Nx hash and cannot be deleted via the
API; remove it server-side if that is tidy-able.

## 9. Loose ends noticed in passing

Neither is about caching; both are cheap and someone should know.

- **`playwright.config.ts` ignores `**/*.spike.spec.ts` and names a `playwright.spike.config.ts`
  that does not exist.** No spike specs exist either. The ignore rule is currently a no-op
  forward-reference — harmless, but it reads as though a config is missing.
- **`publish-master.yml` has no Playwright install step**, consistent with it running no e2e.
  Worth being deliberate about: master merges are never e2e-verified, only PRs are.
