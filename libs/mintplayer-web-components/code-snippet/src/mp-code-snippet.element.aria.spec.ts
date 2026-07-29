import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './mp-code-snippet.element';
import type { MpCodeSnippet } from './mp-code-snippet.element';

/**
 * `<mp-code-snippet>` had no spec at all. This one covers only its ARIA
 * surface: the copy button's name channel (the `copy-label` pattern with the
 * `${language}` placeholder resolved against the language actually highlighted)
 * and the copy feedback state machine — `role="status"` live region content and
 * the toast's `aria-hidden`, both of which must return to their idle values
 * when the 3s timer expires, and must stay idle when the clipboard write fails.
 */

const SOURCE = 'const answer: number = 42;';

let writeText: ReturnType<typeof vi.fn>;

async function mount(attrs: Record<string, string> = {}, code = SOURCE): Promise<MpCodeSnippet> {
  const el = document.createElement('mp-code-snippet') as MpCodeSnippet;
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  el.code = code;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

const copyButton = (el: MpCodeSnippet) => el.shadowRoot!.querySelector('button.copy') as HTMLButtonElement;
const liveRegion = (el: MpCodeSnippet) => el.shadowRoot!.querySelector('[role="status"]') as HTMLElement;
const toast = (el: MpCodeSnippet) => el.shadowRoot!.querySelector('.toast') as HTMLElement;

/** The copy handler awaits the clipboard promise before flipping state. */
async function clickCopy(el: MpCodeSnippet): Promise<void> {
  copyButton(el).click();
  await Promise.resolve();
  await Promise.resolve();
  await el.updateComplete;
}

beforeEach(() => {
  writeText = vi.fn(() => Promise.resolve());
  // jsdom ships no Clipboard API at all.
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('mp-code-snippet copy button naming', () => {
  it('is a native button, so its role and focusability come from the platform', async () => {
    const el = await mount({ language: 'typescript' });
    const button = copyButton(el);
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.hasAttribute('role')).toBe(false);
    expect(button.hasAttribute('aria-hidden')).toBe(false);
  });

  it('resolves the ${language} placeholder against the highlighted language', async () => {
    const el = await mount({ language: 'typescript' });
    expect(copyButton(el).getAttribute('aria-label')).toBe('Copy typescript code to clipboard');
  });

  it('re-derives the name when the language changes programmatically', async () => {
    const el = await mount({ language: 'typescript' });
    el.language = 'json';
    el.code = '{ "answer": 42 }';
    await el.updateComplete;
    expect(copyButton(el).getAttribute('aria-label')).toBe('Copy json code to clipboard');

    el.language = 'typescript';
    el.code = SOURCE;
    await el.updateComplete;
    expect(copyButton(el).getAttribute('aria-label')).toBe('Copy typescript code to clipboard');
  });

  it('keeps the name and the visible text naming the same language', async () => {
    // Auto-detect picks the language, so the exact id is not asserted — what
    // matters is that the accessible name never drifts from the visible label.
    const el = await mount({}, '{ "answer": 42 }');
    const button = copyButton(el);
    const visible = button.textContent!.trim().replace(/^Copy\s+/, '');
    expect(button.getAttribute('aria-label')).toBe(`Copy ${visible} code to clipboard`);
  });

  it('takes a localised copy-label, substituting the placeholder wherever it sits', async () => {
    const el = await mount({ language: 'typescript', 'copy-label': '${language}-code kopiëren' });
    expect(copyButton(el).getAttribute('aria-label')).toBe('typescript-code kopiëren');
  });

  it('passes a copy-label without the placeholder through verbatim', async () => {
    const el = await mount({ language: 'typescript', 'copy-label': 'Kopiëren' });
    expect(copyButton(el).getAttribute('aria-label')).toBe('Kopiëren');
  });

  it('never copies host aria-labelledby / aria-describedby inward as IDREF strings', async () => {
    const outside = document.createElement('span');
    outside.id = 'snippet-caption';
    outside.textContent = 'Example';
    document.body.appendChild(outside);

    const el = await mount({ language: 'typescript' });
    el.setAttribute('aria-labelledby', 'snippet-caption');
    el.setAttribute('aria-describedby', 'snippet-caption');
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('[aria-labelledby]')).toBeNull();
    expect(el.shadowRoot!.querySelector('[aria-describedby]')).toBeNull();
    // A host aria-label names the snippet region, never the button inside it.
    el.setAttribute('aria-label', 'Install command');
    await el.updateComplete;
    expect(copyButton(el).getAttribute('aria-label')).toBe('Copy typescript code to clipboard');
  });
});

describe('mp-code-snippet copy feedback', () => {
  it('starts with an empty polite live region and a hidden toast', async () => {
    const el = await mount({ language: 'typescript' });
    expect(liveRegion(el).getAttribute('aria-live')).toBe('polite');
    expect(liveRegion(el).textContent!.trim()).toBe('');
    expect(toast(el).getAttribute('aria-hidden')).toBe('true');
  });

  it('announces the copy and reveals the toast', async () => {
    const el = await mount({ language: 'typescript' });
    await clickCopy(el);

    expect(writeText).toHaveBeenCalledWith(SOURCE);
    expect(liveRegion(el).textContent!.trim()).toBe('Copied to clipboard');
    expect(toast(el).getAttribute('aria-hidden')).toBe('false');
  });

  it('clears the announcement and re-hides the toast when the message expires', async () => {
    vi.useFakeTimers();
    const el = await mount({ language: 'typescript' });
    await clickCopy(el);
    expect(toast(el).getAttribute('aria-hidden')).toBe('false');

    vi.advanceTimersByTime(3000);
    await el.updateComplete;

    // An idle live region is what lets the NEXT copy be announced at all.
    expect(liveRegion(el).textContent!.trim()).toBe('');
    expect(toast(el).getAttribute('aria-hidden')).toBe('true');
  });

  it('announces a second copy after the first has expired', async () => {
    vi.useFakeTimers();
    const el = await mount({ language: 'typescript' });
    await clickCopy(el);
    vi.advanceTimersByTime(3000);
    await el.updateComplete;

    await clickCopy(el);
    expect(liveRegion(el).textContent!.trim()).toBe('Copied to clipboard');
    expect(toast(el).getAttribute('aria-hidden')).toBe('false');
  });

  it('announces nothing when the clipboard write fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    writeText.mockImplementation(() => Promise.reject(new Error('denied')));

    const el = await mount({ language: 'typescript' });
    await clickCopy(el);

    expect(liveRegion(el).textContent!.trim()).toBe('');
    expect(toast(el).getAttribute('aria-hidden')).toBe('true');
    warn.mockRestore();
  });
});
