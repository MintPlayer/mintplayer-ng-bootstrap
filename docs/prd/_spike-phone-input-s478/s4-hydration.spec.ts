// S4.3 — what does an `Intl.DisplayNames` mismatch actually COST across a real
// @lit-labs/ssr → @lit-labs/ssr-client hydration? Console noise? Visible flicker?
// Silently wrong DOM? Measured, not assumed.
import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join(__dirname, 'results');
mkdirSync(outDir, { recursive: true });

type Probe = {
  hadDsd: boolean;
  ssrText: string[] | null;
  ssrResolved: string | null;
  liveText: string[];
  liveResolved: string | null;
  consoleErrors: string[];
  consoleWarns: string[];
  afterRerenderText: string[];
  elLocale: string | undefined;
  afterThirdLocale: string[];
  afterRestore: string[];
};

async function probe(page: import('@playwright/test').Page, url: string): Promise<Probe & { pageConsole: string[] }> {
  const pageConsole: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'warning' || m.type() === 'error') pageConsole.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => pageConsole.push(`[pageerror] ${e.message}`));

  await page.goto(url);
  await page.waitForFunction(() => (window as any).__hydrated === true, undefined, { timeout: 15_000 });

  const res = await page.evaluate(async () => {
    const el = document.querySelector('s4-country-list') as any;
    const read = () =>
      [...el.shadowRoot.querySelectorAll('li')].map((li: any) => `${li.dataset.code}=${li.textContent}`);
    const liveText = read();
    const liveResolved = el.shadowRoot.querySelector('#resolved')?.textContent ?? null;

    // Force a re-render with the SAME locale value: does lit notice the DOM is
    // out of sync, or does its recorded committed value make this a no-op?
    el.requestUpdate();
    await el.updateComplete;
    const afterRerenderText = read();

    // Can the stale DOM be REPAIRED at all? Push a different locale, then the
    // original one back. If the round-trip lands on correct text, a post-hydration
    // "touch the locale" is a viable mitigation; if not, the DOM is unrecoverable.
    const clientLocale = el.locale;
    el.locale = 'ja-JP';
    await el.updateComplete;
    const afterThirdLocale = read();
    el.locale = clientLocale;
    await el.updateComplete;
    const afterRestore = read();

    return {
      elLocale: clientLocale,
      afterThirdLocale,
      afterRestore,
      hadDsd: (window as any).__hadDsd,
      ssrText: (window as any).__ssrText,
      ssrResolved: (window as any).__ssrResolved,
      liveText,
      liveResolved,
      consoleErrors: (window as any).__consoleErrors ?? [],
      consoleWarns: (window as any).__consoleWarns ?? [],
      afterRerenderText,
    };
  });
  return { ...res, pageConsole };
}

const SCENARIOS = [
  { name: 'A parity (server=client=en-US)', url: '/s4-ssr?serverLocale=en-US&clientLocale=en-US' },
  { name: 'B skew (server=nl-BE, client=en-US)', url: '/s4-ssr?serverLocale=nl-BE&clientLocale=en-US' },
  { name: 'C runtime default both sides (no locale anywhere)', url: '/s4-ssr' },
  { name: 'D skew, lit DEV build (server=nl-BE, client=en-US)', url: '/s4-ssr?serverLocale=nl-BE&clientLocale=en-US&dev=1' },
];

for (const s of SCENARIOS) {
  test(`S4.3 ${s.name}`, async ({ page, browserName }) => {
    const r = await probe(page, s.url);
    const mismatched = r.ssrText
      ? r.ssrText.filter((t, i) => t !== r.liveText[i])
      : [];
    const stillWrongAfterRerender = r.ssrText
      ? r.liveText.filter((t, i) => t !== r.afterRerenderText[i])
      : [];

    const lines = [
      `### ${browserName} — ${s.name}`,
      `url: ${s.url}`,
      `DSD attached before upgrade: ${r.hadDsd}`,
      `SSR #resolved:  ${r.ssrResolved}`,
      `live #resolved: ${r.liveResolved}`,
      `SSR text  (first 6): ${(r.ssrText ?? []).slice(0, 6).join(' | ')}`,
      `live text (first 6): ${r.liveText.slice(0, 6).join(' | ')}`,
      `entries whose text CHANGED during hydration: ${mismatched.length}`,
      ...mismatched.slice(0, 6).map((m, i) => `   ssr="${m}" -> live="${r.liveText[(r.ssrText ?? []).indexOf(m)]}"`),
      `text changed by a forced re-render afterwards: ${stillWrongAfterRerender.length}`,
      `element .locale property after hydration: ${r.elLocale}`,
      `after el.locale='ja-JP'      (first 3): ${r.afterThirdLocale.slice(0, 3).join(' | ')}`,
      `after el.locale restored     (first 3): ${r.afterRestore.slice(0, 3).join(' | ')}`,
      `repairable by a locale round-trip: ${JSON.stringify(r.afterRestore) !== JSON.stringify(r.liveText)}`,
      `console.warn captured in page: ${JSON.stringify(r.consoleWarns)}`,
      `console.error captured in page: ${JSON.stringify(r.consoleErrors)}`,
      `playwright console (warn/error/pageerror): ${JSON.stringify(r.pageConsole)}`,
      '',
    ];
    writeFileSync(
      join(outDir, `s4-hydration-${browserName}-${s.name.slice(0, 1)}.txt`),
      lines.join('\n'),
      'utf8',
    );
    console.log(lines.join('\n'));

    // Only assertion that must hold everywhere: the page must not throw.
    expect(r.pageConsole.filter((l) => l.startsWith('[pageerror]'))).toEqual([]);
  });
}
