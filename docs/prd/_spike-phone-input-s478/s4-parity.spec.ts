// S4.1 + S4.2 — is `Intl.DisplayNames(locale, { type: 'region' })` byte-identical
// between Node (the SSR renderer) and each browser engine? Every mismatch here is
// a potential hydration mismatch on the country picker's option labels.
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type Baseline = {
  engine: string;
  icu: string;
  defaultLocale: string;
  count: number;
  names: Record<string, Record<string, string>>;
  namesDefaultLocale: Record<string, string>;
  awkward: Record<string, Record<string, string>>;
};

const node: Baseline = JSON.parse(readFileSync(join(__dirname, 's4-node-names.json'), 'utf8'));
const outDir = join(__dirname, 'results');
mkdirSync(outDir, { recursive: true });

test('S4.1/S4.2 — per-engine ICU parity against the Node baseline', async ({ page, browserName }) => {
  await page.goto('/s4-names.html');
  await page.waitForFunction(() => (window as any).__s4ready === true);
  const browser = await page.evaluate(() => (window as any).__s4);

  expect(browser.codes.length).toBe(node.count);

  const report: string[] = [];
  report.push(`engine: ${browserName}`);
  report.push(`node: ${node.engine} ICU ${node.icu}`);
  report.push(`node default region locale: ${node.defaultLocale}`);
  report.push(`browser default region locale: ${browser.defaultLocale}`);
  report.push(`navigator.language: ${browser.navigatorLanguage}  languages: ${browser.navigatorLanguages.join(',')}`);
  report.push('');

  const summary: Record<string, number> = {};
  const allDiffs: Record<string, Record<string, [string, string]>> = {};

  for (const locale of node.names ? Object.keys(node.names) : []) {
    const diffs: Record<string, [string, string]> = {};
    for (const code of browser.codes as string[]) {
      const n = node.names[locale][code];
      const b = browser.names[locale][code];
      if (n !== b) diffs[code] = [n, b];
    }
    summary[locale] = Object.keys(diffs).length;
    allDiffs[locale] = diffs;
    report.push(`${locale}: ${Object.keys(diffs).length} / ${node.count} differ`);
    for (const [code, [n, b]] of Object.entries(diffs)) {
      report.push(`   ${code}: node="${n}"  ${browserName}="${b}"`);
    }
  }

  // S4.2 — the runtime-default-locale hazard: no explicit locale on either side.
  const defDiffs = (browser.codes as string[]).filter(
    (c) => node.namesDefaultLocale[c] !== browser.namesDefaultLocale[c],
  );
  report.push('');
  report.push(
    `S4.2 default-locale (no explicit locale): node="${node.defaultLocale}" browser="${browser.defaultLocale}" → ${defDiffs.length} / ${node.count} names differ`,
  );
  for (const c of defDiffs.slice(0, 12)) {
    report.push(`   ${c}: node="${node.namesDefaultLocale[c]}"  ${browserName}="${browser.namesDefaultLocale[c]}"`);
  }

  report.push('');
  report.push('awkward codes:');
  for (const locale of Object.keys(node.awkward)) {
    for (const code of Object.keys(node.awkward[locale])) {
      const n = node.awkward[locale][code];
      const b = browser.awkward[locale][code];
      report.push(`   ${locale} ${code}: node="${n}" ${browserName}="${b}"${n === b ? '' : '   <-- DIFF'}`);
    }
  }

  writeFileSync(join(outDir, `s4-parity-${browserName}.txt`), report.join('\n'), 'utf8');
  writeFileSync(
    join(outDir, `s4-diffs-${browserName}.json`),
    JSON.stringify({ browserName, browserDefaultLocale: browser.defaultLocale, summary, allDiffs, defaultLocaleDiffCount: defDiffs.length }, null, 1),
    'utf8',
  );
  console.log(report.join('\n'));
});
