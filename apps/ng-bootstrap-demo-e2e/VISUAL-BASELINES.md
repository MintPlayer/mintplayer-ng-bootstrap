# Visual-regression baselines — a local-only check, deliberately

`card.visual.spec.ts` and `ribbon.visual.spec.ts` are the **only** pixel-comparison tests in the
repo (`toHaveScreenshot`; there are no `toMatchSnapshot` calls anywhere). Both skip themselves
unless they are running **Chromium on Win32**, which means they **do not run in CI at all**.

That is a deliberate decision, not an oversight, and it was measured before being settled. This
file records why, so nobody re-derives it — or repeats the attempt below.

## Why every other test is unaffected

The rest of the suite asserts **structure and behaviour**, never pixels: roles, visibility,
attribute values, emitted events. `getByRole('heading', { name: 'Panel 1' })` gives the same
answer on any OS with any fonts installed.

`dock.spec.ts` is the instructive case — it is named "captures a layout snapshot", which sounds
like a screenshot, but it clicks a button and asserts a heading appears. Its comment explains the
reasoning: bind to a stable behavioural boundary rather than to something that shifts on every
internal tweak.

So this is not a ribbon problem or a card problem. It is inherent to pixel-baseline testing: the
assertion is over *rendered output*, so it is only valid inside a single rasteriser. Two tests
want an infrastructure guarantee the other ~500 do not need.

## What was tried, and the numbers that killed it

The obvious fix is to commit a second baseline set for Linux — Playwright already keys snapshot
filenames by platform, so `-chromium-win32.png` and `-chromium-linux.png` can sit side by side and
each environment compares against its own rasteriser. That was implemented and reverted. Two
measurements, both from a real CI run:

**1. The Playwright container does not match the GitHub runner.** Baselines generated inside
`mcr.microsoft.com/playwright:v1.60.0-noble` came out *dimension-identical* to the Win32 set, so
that image rasterises like a Windows box. `ubuntu-latest` matched neither:

| shot | expected | received on the runner |
|---|---|---|
| card | 864 × 10932 | **864 × 11004** — 72px taller, ratio 0.25 |
| ribbon × 4 | 1120 × 134/136 | same size, 4,492–5,102 px differ, **ratio 0.03–0.04** |

A 72px height delta is text *wrapping* differently, i.e. a font-availability difference, not
antialiasing. The runner image ships fonts the container does not. Regenerating in the same
container cannot fix that.

**2. Even baselines generated on the runner would be fragile.** The ribbon diffs are 3–4× over
the `maxDiffPixelRatio: 0.01` threshold on *fixed-size* images, so that is pure rasterisation
variance. GitHub refreshes runner images roughly fortnightly; any font-package change would clear
that threshold again and turn the suite red for reasons unrelated to the code.

Point 2 is the one that settles it: "generate the baselines in CI and commit them" is not a
stable answer either.

## What it would take, if this is ever wanted

Pin the rasteriser rather than chase it — run the visual specs **inside** a fixed container image
in CI, not on the bare runner:

- One baseline set, produced by that image. The Win32 set goes away; there is one rasteriser and
  one truth.
- Immune to runner-image drift, because the tag only moves when someone bumps it deliberately
  alongside `@playwright/test`.
- Reproducible on any developer machine with Docker.
- Visual specs get excluded from the normal e2e matrix and run only in that step.

Cost when this was scoped: a production build plus serve plus ~20s of tests, so roughly **1.5
minutes on every PR run**, for pixel coverage of two surfaces. That was judged not worth it —
chrome drift on a component library is the kind of regression a human notices immediately, and
these two specs have never caught anything in CI because they have never run there.

Practical notes, if someone does pick this up (all verified, all non-obvious):

- Serve with `--host 0.0.0.0`; the dev server binds to `localhost` and a container cannot reach it.
- Vite answers **403** for a `Host` header not on its allowlist, so the container needs
  `--allowedHosts host.docker.internal`. The symptom is a 403 on every page, with nothing
  mentioning hosts.
- Passing `allowedHosts` **replaces** the default allowlist. Omit `localhost` and plain local runs
  start answering **400**.
- On a Linux runner, `--network host` works properly and sidesteps all of the above.
- On Windows, run `docker run` from **PowerShell, not Git Bash** — Git Bash rewrites `-w /work`
  into a Windows path and Docker rejects it.

## Consequences of the current policy

- **CI performs no visual regression.** Chrome drift is caught only when a developer on Windows
  runs these specs, or by eye.
- `lfs: true` was removed from the workflow's checkout. The only LFS objects in the repo are these
  baselines, so CI was paying LFS bandwidth every run for files it then skipped reading.
  `fetch-depth: 0` stays — `nx affected` needs it.

## Refreshing the baselines (Windows, Chromium)

```bash
npx playwright test --config=apps/ng-bootstrap-demo-e2e/playwright.config.ts \
  --project=chromium -g visual --update-snapshots
```

`.gitattributes` already routes `apps/ng-bootstrap-demo-e2e/**/*-snapshots/*.png` through Git LFS,
so a new baseline needs no attribute change.

Prefer deterministic content in anything these specs capture. The card demo builds its placeholder
images as inline SVG data URLs (`makePlaceholder` in `card.component.ts`) precisely so the shot
does not depend on an external image service — the canonical way such suites turn flaky.
