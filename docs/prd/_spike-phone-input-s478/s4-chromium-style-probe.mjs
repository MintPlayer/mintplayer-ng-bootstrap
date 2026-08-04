// Follow-up to S4.1: Chromium disagrees with Node/Firefox/WebKit on exactly four
// region codes (FK, HK, MO, PS) in every locale. Is that fixable by passing
// `style` explicitly, or is it a genuine CLDR-data divergence?
//
//   node docs/prd/_spike-phone-input-s478/s4-chromium-style-probe.mjs
import { chromium, firefox, webkit } from '@playwright/test';

const CODES = ['FK', 'HK', 'MO', 'PS'];
const STYLES = [undefined, 'long', 'short', 'narrow'];

const nodeRows = STYLES.map((style) => {
  const dn = new Intl.DisplayNames('en-US', { type: 'region', ...(style ? { style } : {}) });
  return [style ?? '(default)', CODES.map((c) => dn.of(c))];
});
console.log('node', process.version, 'ICU', process.versions.icu);
for (const [style, vals] of nodeRows) console.log(`  ${style.padEnd(10)} ${vals.join(' | ')}`);

for (const [name, type] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
  const browser = await type.launch();
  const page = await browser.newPage();
  const res = await page.evaluate(
    ({ codes, styles }) => ({
      ua: navigator.userAgent,
      rows: styles.map((style) => {
        const dn = new Intl.DisplayNames('en-US', { type: 'region', ...(style ? { style } : {}) });
        return [style ?? '(default)', codes.map((c) => dn.of(c)), dn.resolvedOptions().style];
      }),
    }),
    { codes: CODES, styles: STYLES },
  );
  console.log(`\n${name}: ${res.ua}`);
  for (const [style, vals, resolved] of res.rows) {
    console.log(`  ${String(style).padEnd(10)} resolvedStyle=${resolved} ${vals.join(' | ')}`);
  }
  await browser.close();
}
