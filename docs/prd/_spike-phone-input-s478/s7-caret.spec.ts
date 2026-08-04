// S7 — AsYouType caret preservation. Every case is driven through real keyboard
// events (not synthetic `value =` writes) so the browser's own editing behaviour
// is part of the measurement.
import { test, expect, Page } from '@playwright/test';
import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join(__dirname, 'results');
mkdirSync(outDir, { recursive: true });

type Which = 'naive' | 'fixed' | 'shadow';

async function open(page: Page) {
  await page.goto('/s7-caret.html');
  await page.waitForFunction(() => (window as any).__s7ready === true);
}

const read = (page: Page, which: Which) =>
  page.evaluate((w) => (window as any).__s7.read(w), which) as Promise<{
    value: string;
    selectionStart: number;
    selectionEnd: number;
  }>;

const focus = (page: Page, which: Which) => page.evaluate((w) => (window as any).__s7.focus(w), which);
const setCaret = (page: Page, which: Which, pos: number) =>
  page.evaluate(([w, p]) => (window as any).__s7.setCaret(w, p), [which, pos] as [Which, number]);

function reporter(browserName: string, file: string) {
  const path = join(outDir, `${file}-${browserName}.txt`);
  writeFileSync(path, `### ${browserName}\n`, 'utf8');
  return (line: string) => {
    appendFileSync(path, line + '\n', 'utf8');
    console.log(`[${browserName}] ${line}`);
  };
}

test('S7.1 — the naive reformat destroys the caret', async ({ page, browserName }) => {
  const report = reporter(browserName, 's7.1-naive');
  await open(page);
  await focus(page, 'naive');
  await page.keyboard.type('470123456');
  const atEnd = await read(page, 'naive');
  report(`typed 470123456 → value="${atEnd.value}" caret=${atEnd.selectionStart} (len ${atEnd.value.length})`);

  // Now put the caret in the middle — right after "470 " — and type one digit.
  const mid = atEnd.value.indexOf(' ') + 1;
  await setCaret(page, 'naive', mid);
  const before = await read(page, 'naive');
  await page.keyboard.type('9');
  const after = await read(page, 'naive');
  report(`caret set to ${before.selectionStart} ("${before.value.slice(0, before.selectionStart)}|${before.value.slice(before.selectionStart)}")`);
  report(`typed "9" → value="${after.value}" caret=${after.selectionStart}  (expected ${mid + 1}, len ${after.value.length})`);
  report(`VERDICT: caret ${after.selectionStart === after.value.length ? 'JUMPED TO END' : 'did not jump'} — off by ${after.selectionStart - (mid + 1)}`);

  // Also: typing a digit that changes nothing about the formatting still resets.
  await setCaret(page, 'naive', 2);
  await page.keyboard.press('ArrowRight');
  const afterArrow = await read(page, 'naive');
  report(`ArrowRight from 2 → caret=${afterArrow.selectionStart} (arrow keys are unaffected: no input event)`);

  // The bug is the whole point of S7.1 — assert it really happens.
  expect(after.selectionStart).toBe(after.value.length);
  expect(after.selectionStart).not.toBe(mid + 1);
});

for (const which of ['fixed', 'shadow'] as const) {
  test(`S7.2/S7.3 — digit-index caret mapping (${which})`, async ({ page, browserName }) => {
    const report = reporter(browserName, `s7.2-${which}`);
    await open(page);

    // --- typing at the end, keystroke by keystroke ---
    await focus(page, which);
    const trail: string[] = [];
    for (const ch of '470123456') {
      await page.keyboard.type(ch);
      const s = await read(page, which);
      trail.push(`"${s.value}"@${s.selectionStart}`);
      expect(s.selectionStart, `caret must sit at the end while appending (${s.value})`).toBe(s.value.length);
    }
    report(`append trail: ${trail.join(' → ')}`);
    const full = await read(page, which);
    report(`final: "${full.value}" caret=${full.selectionStart}`);
    expect(full.value).toBe('470 12 34 56');

    // --- typing in the middle ---
    await setCaret(page, which, 4); // "470 |12 34 56"
    await page.keyboard.type('9');
    let s = await read(page, which);
    report(`insert "9" at 4 → "${s.value}" caret=${s.selectionStart}`);
    // digits were 470123456, now 4709123456 → the caret must sit after the 4th digit
    expect(s.value.replace(/\D/g, '')).toBe('4709123456');
    const idxAfter4thDigit = (() => {
      let seen = 0;
      for (let i = 0; i < s.value.length; i++) {
        if (/\d/.test(s.value[i]) && ++seen === 4) return i + 1;
      }
      return -1;
    })();
    expect(s.selectionStart, 'caret must follow the inserted digit').toBe(idxAfter4thDigit);

    // --- Backspace over a plain digit ---
    await page.keyboard.press('Backspace');
    s = await read(page, which);
    report(`Backspace (digit before caret) → "${s.value}" caret=${s.selectionStart}`);
    expect(s.value.replace(/\D/g, '')).toBe('470123456');
    expect(s.selectionStart).toBe(3);

    // --- Backspace over a SEPARATOR (S7.4) ---
    await setCaret(page, which, 4); // caret right after the space in "470 12 34 56"
    const beforeSep = await read(page, which);
    await page.keyboard.press('Backspace');
    s = await read(page, which);
    report(
      `Backspace over separator: before="${beforeSep.value}"@4 → after="${s.value}"@${s.selectionStart}  digits ${beforeSep.value.replace(/\D/g, '')} → ${s.value.replace(/\D/g, '')}`,
    );
    expect(s.value.replace(/\D/g, ''), 'one Backspace must remove exactly one digit').toBe('47123456');
    expect(s.selectionStart).toBe(2);

    // --- Delete over a separator ---
    await page.evaluate((w) => (window as any).__s7.setValue(w, '470 12 34 56'), which);
    await focus(page, which);
    await setCaret(page, which, 3); // "470| 12 34 56" — next char is the space
    await page.keyboard.press('Delete');
    s = await read(page, which);
    report(`Delete over separator at 3 → "${s.value}" caret=${s.selectionStart} digits=${s.value.replace(/\D/g, '')}`);
    expect(s.value.replace(/\D/g, ''), 'Delete must remove the next DIGIT, not the separator').toBe('47023456');
    expect(s.selectionStart).toBe(3);

    // --- paste in the middle ---
    await page.evaluate((w) => (window as any).__s7.setValue(w, '470 12 34 56'), which);
    await focus(page, which);
    await setCaret(page, which, 4);
    await page.evaluate(async () => {
      // insertFromPaste via execCommand keeps the browser's own editing semantics.
      document.execCommand('insertText', false, '99');
    });
    s = await read(page, which);
    report(`paste "99" at 4 → "${s.value}" caret=${s.selectionStart} digits=${s.value.replace(/\D/g, '')}`);
    expect(s.value.replace(/\D/g, '')).toBe('47099123456');

    // --- select-all and retype ---
    await focus(page, which);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
    await page.keyboard.type('2');
    s = await read(page, which);
    report(`select-all + type "2" → "${s.value}" caret=${s.selectionStart}`);
    expect(s.value.replace(/\D/g, '')).toBe('2');
    expect(s.selectionStart).toBe(s.value.length);

    // --- range delete over separators ---
    await page.evaluate((w) => (window as any).__s7.setValue(w, '470 12 34 56'), which);
    await focus(page, which);
    await page.evaluate((w) => {
      const el = w === 'shadow' ? (window as any).__s7.shadowInput() : document.getElementById(w as string);
      el.setSelectionRange(2, 6); // "47[0 12] 34 56"
    }, which);
    await page.keyboard.press('Backspace');
    s = await read(page, which);
    report(`range Backspace(2..6) → "${s.value}" caret=${s.selectionStart} digits=${s.value.replace(/\D/g, '')}`);
    expect(s.value.replace(/\D/g, '')).toBe('473456');

    // --- non-digit keystrokes must not corrupt anything ---
    await page.evaluate((w) => (window as any).__s7.setValue(w, '470 12 34 56'), which);
    await focus(page, which);
    await setCaret(page, which, 4);
    await page.keyboard.type('a-x');
    s = await read(page, which);
    report(`typed "a-x" at 4 → "${s.value}" caret=${s.selectionStart} (must stay at 4, not drift left over the separator)`);
    expect(s.value).toBe('470 12 34 56');
    expect(s.selectionStart, 'a rejected non-digit must leave the caret where it was').toBe(4);

    // --- Backspace at position 0 is a no-op, not a crash ---
    await setCaret(page, which, 0);
    await page.keyboard.press('Backspace');
    s = await read(page, which);
    report(`Backspace at 0 → "${s.value}" caret=${s.selectionStart}`);
    expect(s.value.replace(/\D/g, '')).toBe('470123456');

    // --- a dial code whose national grouping differs (US) ---
    await page.evaluate(() => (window as any).__s7.setDialCode('1'));
    await page.evaluate((w) => (window as any).__s7.setValue(w, ''), which);
    await focus(page, which);
    await page.keyboard.type('2125551234');
    s = await read(page, which);
    report(`dialCode=1, typed 2125551234 → "${s.value}" caret=${s.selectionStart}`);
    expect(s.selectionStart).toBe(s.value.length);

    // --- Italy: the significant leading zero must survive ---
    await page.evaluate(() => (window as any).__s7.setDialCode('39'));
    await page.evaluate((w) => (window as any).__s7.setValue(w, ''), which);
    await focus(page, which);
    await page.keyboard.type('0212345678');
    s = await read(page, which);
    report(`dialCode=39, typed 0212345678 → "${s.value}" caret=${s.selectionStart}`);
    expect(s.value.replace(/\D/g, '')).toBe('0212345678');
  });
}

test('S7.3 — shadow-root focus bookkeeping', async ({ page, browserName }) => {
  const report = reporter(browserName, 's7.3-focus');
  await open(page);
  await focus(page, 'shadow');
  await page.keyboard.type('470');
  const active = await page.evaluate(() => (window as any).__s7.activeElements());
  const s = await read(page, 'shadow');
  report(`document.activeElement=${active.documentActive}  shadowRoot.activeElement=${active.shadowActive}`);
  report(`shadow input: value="${s.value}" selectionStart=${s.selectionStart}`);
  expect(active.shadowActive).toBe('INPUT#shadow');
  expect(active.documentActive).toBe('SPAN#host');
  expect(s.selectionStart).toBe(3);
});

// Real IME composition cannot be driven through Playwright's input pipeline, so
// this asserts the GUARD instead: while a composition session is open the control
// must not rewrite the value, and the pending text must be reformatted exactly
// once, at compositionend.
test('S7.2 — composition guard defers reformatting to compositionend', async ({ page, browserName }) => {
  const report = reporter(browserName, 's7.2-composition');
  await open(page);
  const res = await page.evaluate(() => {
    const el = document.getElementById('fixed') as HTMLInputElement;
    el.focus();
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    // Text an IME would place in the field before the session is committed.
    el.value = '470123456';
    el.setSelectionRange(9, 9);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, inputType: 'insertCompositionText' }));
    const duringComposition = el.value;
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '470123456' }));
    return { duringComposition, afterComposition: el.value, caret: el.selectionStart };
  });
  report(`during composition: "${res.duringComposition}" (untouched)`);
  report(`after compositionend: "${res.afterComposition}" caret=${res.caret}`);
  expect(res.duringComposition).toBe('470123456');
  expect(res.afterComposition).toBe('470 12 34 56');
  expect(res.caret).toBe(12);
});

test('S7.5 — setSelectionRange on type=tel behaves', async ({ page, browserName }) => {
  const report = reporter(browserName, 's7.5-selectionrange');
  await open(page);
  for (const which of ['fixed', 'shadow'] as const) {
    await page.evaluate((w) => (window as any).__s7.setValue(w, '470 12 34 56'), which);
    await focus(page, which);
    const probes: string[] = [];
    for (const pos of [0, 1, 4, 7, 12]) {
      await setCaret(page, which, pos);
      const s = await read(page, which);
      probes.push(`set ${pos} → ${s.selectionStart}${s.selectionStart === pos ? '' : ' MISMATCH'}`);
    }
    report(`${which} type=tel setSelectionRange: ${probes.join(', ')}`);
    expect(probes.some((p) => p.includes('MISMATCH'))).toBe(false);
  }
});
