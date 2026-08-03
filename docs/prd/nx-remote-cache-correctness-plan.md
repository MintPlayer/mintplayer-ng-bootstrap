# Plan — Nx remote cache correctness

Companion to `nx-remote-cache-correctness.md`. Milestones are ordered so that **every
correctness fix lands before any change that increases cache usage**. That ordering is the
whole point: enabling more caching on a wrong input set multiplies the rate at which a stale
"tests passed" is served.

## Conventions

- Everything here is config (`nx.json`, `project.json`, workflow YAML). No product source changes.
- Verify each milestone with the falsification test named in it, not with "CI went green" — a
  broken cache also produces a green pipeline.
- `nx show project <name> --json` is the authority on what a target *resolved* to. Reading
  `targetDefaults` and guessing which key matched is how §4.2's finding was missed.
- Local runs need `NX_ISOLATE_PLUGINS=false NX_DAEMON=false` on Windows (the plugin worker is
  flaky here).
- Use `nx run <project>:<target> --verbose` to see whether a task hit local cache, remote
  cache, or ran.

## Ordering rationale

C1 first: it is the only item that is actively wrong today rather than merely absent. C2 and C3
are cheap and belong with it. Only then M3/M4, which increase how often the cache is consulted.
D4 (PR write access) is deliberately last and gated on the owner's answer, because it is the
only item with a security trade-off.

---

## C1 — The inputs are wrong [PRD §3.1, §3.2, D1]

The headline fix. Two independent holes, same consequence.

- [ ] `sharedGlobals` gains `{workspaceRoot}/package-lock.json`,
      `{workspaceRoot}/nx.json`, `{workspaceRoot}/tsconfig.base.json`.
- [ ] New named input `e2eShared`: `["{workspaceRoot}/tools/e2e-shared/**/*"]`.
- [ ] Every e2e target's inputs become `["default", "^production", "e2eShared"]`.
- [ ] Pin the Playwright runner into the hash via an `externalDependencies` input on the e2e
      targets, so a `@playwright/test` bump invalidates e2e results.

**Falsification test (do this BEFORE the fix, to see it fail):** warm the cache, then edit a
`tools/e2e-shared/*.ts` suite so an assertion is guaranteed false. Pre-fix, `nx e2e
ng-bootstrap-demo-e2e` must report a cache hit and pass — that is the bug, reproduced. Post-fix
it must re-run and fail. Repeat the same shape by touching `package-lock.json`.

**Expected cost, and it is real:** any lockfile change now invalidates the entire workspace's
cache. That is correct behaviour and will make dependency-bump PRs slower than they are today.

## C2 — Declare e2e outputs, consistently [PRD §4.3, D3]

Existing state is uneven, so this is a levelling exercise, not a blanket addition:

| target | today |
|---|---|
| react/vue `e2e` | `{workspaceRoot}/dist/.playwright/apps/<app>-e2e` |
| ng `e2e`, ng `e2e-live`, all three `e2e-a11y` | none |

- [ ] Bring the five undeclared targets up to the react/vue pattern.
- [ ] Verify a cache *hit* restores them — delete the report dir, re-run, confirm it comes back.

Without this a hit restores the log and silently discards the trace, which is precisely what a
developer wants on the run they did not watch.

## C3 — `neverConnectToCloud: true` [PRD §2, D5]

- [ ] Add `"neverConnectToCloud": true` to `nx.json`.

`isNxCloudDisabled()` checks it and short-circuits `isNxCloudUsed()`, so a future `nx migrate`
re-adding `nxCloudId` **cannot** silently take the self-hosted cache offline. One key; the
highest value-per-character change in the whole plan.

- [ ] Optionally also a CI grep for `nxCloudId`/`nxCloudAccessToken` as belt-and-braces. The
      config key is the actual fix; the grep only tells you it happened.

**Falsification test:** add `nxCloudId` locally alongside the new key and confirm the
self-hosted cache is still used (run with `--verbose` and look for the remote hit).

---

## M3 — `e2e-a11y` becomes cacheable [PRD §4.2, D2]

- [ ] Add an `e2e-a11y` entry to `targetDefaults` with `cache: true` and the C1 input set.
- [ ] **Do NOT add `e2e-live`.** Add a comment in `nx.json` stating that its result depends on
      a live `dotnet run` backend Nx does not model, so a cached pass would assert a backend
      contract without having contacted the backend.
- [ ] Confirm with `nx show project ng-bootstrap-demo-e2e --json` that `e2e-a11y` now resolves
      to `cache: true` and `e2e-live` still resolves to unset. Do not infer this from the JSON
      you wrote.

## M4 — Same target shape across all three demo apps

Already measured — the three are consistent, so this milestone is a sweep rather than a
reconciliation:

| project | `e2e` | `e2e-a11y` | `e2e-live` |
|---|---|---|---|
| ng-bootstrap-demo-e2e | cached | **uncached** | uncached (correct, D2) |
| react-bootstrap-demo-e2e | cached | **uncached** | — |
| vue-bootstrap-demo-e2e | cached | **uncached** | — |

- [x] Confirmed via `nx show project <name> --json`: same names, same cacheability, same
      inputs. The `e2e-a11y` gap is uniform, so M3 fixes all three at once via `targetDefaults`.
- [ ] Any e2e target anywhere in the workspace that imports from `tools/` gets the `e2eShared`
      input. Sweep for it rather than fixing the three known ones.

## M5 — Measure, before claiming anything [PRD §7, D4c]

Partly done already, and the results are in PRD D4c:

- [x] **Writes reach the server.** 13 entries sampled from `.nx/cache` (directories are named by
      task hash), each queried with the RW token: all `200`, including one 30 seconds old.
- [x] **Overrides fork the hash.** `nx test <p> --pool=threads` and plain `nx test <p>` are
      different hashes — the plain form re-ran for 66s rather than reusing the flagged run. So
      warming for CI requires running *CI's* command shape, with no extra flags or spec filters.
- [x] **The one `environment` hash input agrees**: `NX_CLOUD_ENCRYPTION_KEY` is unset locally and
      in CI.
- [ ] Clear `.nx/cache` and re-run → must report `[remote cache]`. Proves the *read* path from
      this machine (only the write path and raw `curl` reads are proven so far).
- [ ] Record warm-vs-cold wall-clock in the PRD. This is a performance claim; it should carry a
      number.

**Do not warm the cache for CI until C1 lands.** Publishing now manufactures permanent entries
(`DELETE` → `405`) keyed by a hash that ignores `tools/` and the lockfile.

## M6 — Cross-machine hit — and check the FILES, not the word "hit" [PRD §3.3]

The hash-plan dump already proves the OS is absent from the hash, so this milestone is not
asking *whether* it hits. It is closing the two residual unknowns, both of which present as
**silent partial success**: nx#29890 (entry hits, nested output files fail to restore) and the
untraced `cwd` argument into the Rust hasher.

- [ ] Warm from this Windows machine, then confirm a Linux CI run reports a remote hit for a
      project neither branch touched.
- [ ] **Then assert the restored artifacts exist on disk.** A hit that replays console output
      while dropping the Playwright report is the failure mode being hunted, and it looks
      exactly like success in the log.
- [ ] If artifacts are missing, stop: outputs must not be cached cross-OS until it is
      understood. Record it — that would invert D3.

## M6b — Confirm the master `affected` diagnosis [PRD §4.5, D7]

- [ ] On a master run, print `git rev-parse master HEAD` and the affected project list before
      the Test step. If base and head are the same SHA and the list is empty, the diagnosis
      holds and every push to master has been testing nothing.
- [ ] Then apply D7 — either `fetch-depth: 0` plus `--base=${{ github.event.before }}`, or
      `run-many`, matching what the Build step in that same workflow already does.

This is independent of caching and is the most serious single finding in the audit if true.

---

## M7 — Prove the read-only token is read-only [PRD D4a] — **do this first, it may be a live hole**

The posture is settled: **PRs stay read-only, no workflow change.** What is *not* settled is
whether the server actually enforces it, and the probe raised a real doubt.

Already measured against `https://nxcache.example.com`:

| probe | result |
|---|---|
| `GET` missing hash, valid token | `404` |
| `GET` wrong token / no header | `403` |
| `PUT` new key, **RW** token | `200` — correct |
| `PUT` same key, different bytes | `409` — immutable, content preserved |
| `DELETE` | `405` — nothing can be un-published |

- [x] Identified the developer machine's token: it is **`NX_CACHE_RW_TOKEN`**. Every probe above
      therefore exercised the *write* path only.
- [x] **`PUT` with the RO token on a key that does not exist → `403 Forbidden`.** Reads still work
      (`200` existing, `404` missing), and nothing was written — a follow-up `GET` with the RW
      token returned `404`. **The anti-pollution guarantee is verified.**
- [x] Used a **fresh** key deliberately, so the refusal is about the token rather than the key. As
      a bonus, `PUT` on an *existing* key also returned `403` rather than `409`, which shows
      authorization is evaluated before the immutability rule.

**M7 is closed.** Nothing to change in the repo or the workflows: the posture was correct and is
now measured rather than assumed.
- [ ] Check what the Nx client *shows* on a refused write: warning or silent no-op? Undocumented,
      lives in the Rust addon. If silent, a developer with an RO token will believe they are
      warming a cache they cannot write to.

**Note the ordering consequence of `405`.** Nothing can be un-published, so any holder of a write
token — including this developer machine right now — permanently populates the cache with entries
hashed under the broken input set of §3. That is an argument for landing C1 promptly, not just
before some future workflow change.

## M9 — `apps/api:test` joins the graph [PRD D6]

Additive, lower priority than everything above, but it is a whole suite running on every PR for
no reason.

- [ ] `cache: true` on `api:test`, with inputs mirroring `api:build`'s plus the test project's
      own sources. It is the only test target in the workspace Nx does not cache — because
      `targetDefaults` keys `test` by executor (the two vitest ones) and this one is
      `nx:run-commands`.
- [ ] Switch both workflows from `dotnet test …` to `nx run api:test` so it participates in
      `affected`.

## M8 — Docs

- [ ] `CLAUDE.md` gains a short "cache inputs" rule: anything imported across a project
      boundary by relative path (i.e. `tools/`) must be added as an explicit named input, or it
      is invisible to the hash. This is the generalisable lesson and the one most likely to
      recur.
- [ ] Record the measured numbers from M5/M6 in the PRD's §7.

---

## Risks

| | |
|---|---|
| **Widening `sharedGlobals` slows dependency PRs** | Accepted, and correct. The current speed is bought with wrong answers. |
| ~~A pull request pollutes the cache~~ | **Closed.** Enforcement is server-side only (Nx has no read-only client mode) and was measured: RO `PUT` → `403` on a fresh key, nothing written. M7. |
| **Entries cannot be withdrawn on demand (`DELETE` → `405`)** | Anything written under the §3 input set lingers up to 14 days (`CLEANUP_THRESHOLD=336h`). Bounded, not permanent — but still makes C1 urgent while any write token is in use. |
| **Storage growth once e2e outputs are cached** | Bounded by the 14-day cleanup on a single Docker volume. Worth watching once e2e traces are cached, since those are the large ones. |
| ~~The RO guarantee rests on an implicit Traefik priority~~ | **Not a risk — misread.** All three routers set explicit priorities (200 / 100 / 1). PRD D4e. |
| **A cached e2e pass is a pass from another machine** | Inherent to caching e2e at all. Mitigated by correct inputs (C1); not eliminated. |
| **`nx migrate` re-adds `nxCloudId`** | C3 exists precisely for this; it has happened in this workspace before. `neverConnectToCloud` makes it inert rather than merely detectable. |
| **A cross-OS hit restores no artifacts (nx#29890)** | Unresolved upstream, closed as outdated against a deprecated plugin. M6 hunts it by asserting files on disk. Presents as success. |
| **`.gitattributes` `* text=auto eol=lf` is load-bearing** | Without it, CRLF worktrees would give Windows and Linux different file hashes and cross-OS hits would silently drop to zero. Nothing signposts this today. |
