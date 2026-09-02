# Spikes — consumer styles inside web-component shadow roots (2026-09-02)

Evidence behind [`../../consumer-styles-in-shadow.md`](../../consumer-styles-in-shadow.md).

| File | What it is |
|---|---|
| `live-repro.probe.mjs` | Playwright probe against https://coverage.mintplayer.com/po/account/Accounts%2F48772716. Walks the composed tree for the `(i)` icon in `mp-tab-control` and in the `mp-datatable` headers, reports root node, `assignedSlot`, computed styles, and which document/shadow sheets *match* vs *apply*. |
| `adopted-stylesheets.html` | Static test page: `x-host` shadow root containing a `.btn`, `.text-bg-danger`, `.bi`, an Angular-style `[_ngcontent-x]` element, reboot `p`/`h1`, `.text-primary`. |
| `adopted-stylesheets.run.mjs` | Playwright driver (Chromium + Firefox + WebKit) running scenarios S0–S7 and writing `results.json` + the results markdown. |
| `adopted-stylesheets.results.md` | Measured results, 2026-09-02, Chromium 151 / Firefox 153 / WebKit 26.5. |

## Regenerating the CSS inputs (not committed — 230 KB each)

```bash
cd docs/prd/spikes/consumer-styles-in-shadow
npx sass --load-path=../../../../node_modules --no-source-map ../../../../libs/mintplayer-ng-bootstrap/_bootstrap.scss bootstrap-subset.css
npx sass --load-path=../../../../node_modules --no-source-map ../../../../node_modules/bootstrap/scss/bootstrap.scss bootstrap-full.css
cp ../../../../node_modules/bootstrap-icons/font/bootstrap-icons.css bi.css
cp -r ../../../../node_modules/bootstrap-icons/font/fonts fonts
node adopted-stylesheets.run.mjs
```

`node live-repro.probe.mjs` needs only Chromium (`npx playwright install chromium`).
