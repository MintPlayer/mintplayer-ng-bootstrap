# Visual-regression baselines

`card.visual.spec.ts` and `ribbon.visual.spec.ts` compare a screenshot against a committed PNG.
Both run in **Chromium only**, but on **both platforms** — and the two-platform part is the whole
point of this file.

## Why there are two sets of baselines

A screenshot is only comparable against one taken by the same rasteriser. Fonts, subpixel
antialiasing and Skia's rounding all differ between Windows and Linux, on the *same* Chromium
build. Comparing across them produces diffs everywhere without indicating any real regression —
which is why these specs are Chromium-only in the first place.

Playwright solves this by putting the platform in the filename, so both sets live side by side:

```
e2e/ribbon.visual.spec.ts-snapshots/
  insert-office-2016-chromium-win32.png    ← a developer on Windows compares against this
  insert-office-2016-chromium-linux.png    ← CI (ubuntu-latest) compares against this
```

Neither environment ever compares across a rasteriser, and no threshold has to absorb a
difference it was never meant to.

> **History worth knowing.** These specs used to carry a
> `test.skip(process.platform !== 'win32', …)` guard, so the entire visual suite was **inert in
> CI** — the one regression class it exists to catch was only ever caught if someone happened to
> run it locally on Windows. Worse, `pull-request.yml` sets `lfs: true` on checkout *specifically*
> to fetch these PNGs, so every run paid LFS bandwidth for baselines nothing then read. The Linux
> set is what makes the suite real.

## Refreshing the Win32 set

On Windows, with nothing special:

```bash
npx playwright test --config=apps/ng-bootstrap-demo-e2e/playwright.config.ts \
  --project=chromium -g visual --update-snapshots
```

## Refreshing the Linux set

**Never generate these on a developer machine.** They must come from the rasteriser CI uses, so
they are produced inside the Playwright container whose tag matches the installed
`@playwright/test` (check with `npx playwright --version`; the image tag is `v<version>-noble`).

The container runs only the browser — the demo is served from the host, which avoids a full
`npm ci` and production build inside the container. Where the bytes come from has no bearing on
how they rasterise.

**1. Serve the demo so the container can reach it.** Both flags are required, and neither is
obvious:

```bash
npx nx serve ng-bootstrap-demo --configuration=production --port=4200 \
  --host 0.0.0.0 \
  --allowedHosts localhost --allowedHosts host.docker.internal
```

- `--host 0.0.0.0` — the dev server binds to `localhost` by default, which a container cannot
  reach. Without it every navigation fails outright.
- `--allowedHosts host.docker.internal` — the container's requests carry that `Host` header, and
  Vite answers **403** for a host not on its allowlist. The symptom is a 403 on every page, not
  an error mentioning hosts.
- `--allowedHosts localhost` — **keep this too.** Passing `allowedHosts` *replaces* the default
  allowlist rather than adding to it, so specifying only `host.docker.internal` makes plain
  `localhost` start answering **400** and breaks every other local Playwright run against that
  server.

**2. Generate, in the container:**

```bash
docker run --rm \
  -v "<repo-root>:/work" -w /work \
  --add-host=host.docker.internal:host-gateway \
  mcr.microsoft.com/playwright:v1.60.0-noble \
  npx playwright test \
    --config=apps/ng-bootstrap-demo-e2e/playwright.visual-baselines.config.ts \
    --update-snapshots
```

The repo's own `node_modules` is used as mounted. That works despite being a Windows install
because nothing on this path needs a native binary — `playwright-core` is pure JS, and the
browsers come from the image via `PLAYWRIGHT_BROWSERS_PATH`. Nothing is installed, so it takes
seconds.

On Windows, run this from **PowerShell, not Git Bash** — Git Bash rewrites `-w /work` into a
Windows path and Docker rejects it.

**3. Verify the baselines reproduce.** A baseline that does not reproduce is worse than none, so
re-run the exact same command **without** `--update-snapshots` and confirm it passes. Then check
the Win32 set still passes too (step 1's config), because it is easy to change a spec in a way
that only one platform notices.

## Adding a new visual test

- Generate **both** sets before committing, or CI fails on a missing snapshot — Playwright will
  not auto-create a baseline when `CI` is set, by design.
- `.gitattributes` already routes `apps/ng-bootstrap-demo-e2e/**/*-snapshots/*.png` through Git
  LFS, so a new baseline needs no attribute change.
- Prefer deterministic content. The card demo builds its placeholder images as inline SVG data
  URLs (`makePlaceholder` in `card.component.ts`) precisely so the shot does not depend on an
  external image service — the canonical way these suites turn flaky.
