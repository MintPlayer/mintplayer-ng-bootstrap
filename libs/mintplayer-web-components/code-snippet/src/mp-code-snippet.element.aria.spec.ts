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
const region = (el: MpCodeSnippet) => el.shadowRoot!.querySelector('[role="region"]') as HTMLElement;
const rows = (el: MpCodeSnippet) => [...el.shadowRoot!.querySelectorAll('.line')] as HTMLElement[];
const anchors = (el: MpCodeSnippet) =>
  [...el.shadowRoot!.querySelectorAll('a.line-number')] as HTMLAnchorElement[];

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

  it('takes localised copy feedback strings', async () => {
    const el = await mount({
      language: 'typescript',
      'copied-label': 'Gekopieerd!',
      'copied-announcement': 'Naar klembord gekopieerd',
    });
    await clickCopy(el);

    expect(toast(el).textContent!.trim()).toBe('Gekopieerd!');
    expect(liveRegion(el).textContent!.trim()).toBe('Naar klembord gekopieerd');
  });
});

describe('mp-code-snippet code region naming', () => {
  it('names the region from the detected language by default', async () => {
    const el = await mount({ language: 'typescript' });
    expect(region(el).getAttribute('aria-label')).toBe('typescript code sample');
  });

  it('prefers an explicit label over the derived pattern', async () => {
    const el = await mount({ language: 'typescript', label: 'Install command' });
    expect(region(el).getAttribute('aria-label')).toBe('Install command');
  });

  it('takes a localised region-label pattern', async () => {
    const el = await mount({ language: 'typescript', 'region-label': 'codevoorbeeld (${language})' });
    expect(region(el).getAttribute('aria-label')).toBe('codevoorbeeld (typescript)');
  });
});

describe('mp-code-snippet line rendering', () => {
  const THREE = 'const a = 1;\nconst b = 2;\nconst c = 3;';

  it('renders one row per source line', async () => {
    const el = await mount({ language: 'typescript' }, THREE);
    expect(rows(el)).toHaveLength(3);
  });

  it('does not render a phantom row for a trailing newline', async () => {
    const el = await mount({ language: 'typescript' }, `${THREE}\n`);
    expect(rows(el)).toHaveLength(3);
  });

  it('normalises CRLF so no row keeps a stray carriage return', async () => {
    const el = await mount({ language: 'typescript' }, 'const a = 1;\r\nconst b = 2;');
    expect(rows(el)).toHaveLength(2);
    expect(rows(el).every((r) => !r.textContent!.includes('\r'))).toBe(true);
  });

  it('hides an unlinked line number from the accessibility tree', async () => {
    const el = await mount({ language: 'typescript', 'line-numbers': '' }, THREE);
    const gutter = el.shadowRoot!.querySelectorAll('.line-number');

    expect(gutter).toHaveLength(3);
    expect([...gutter].every((g) => g.getAttribute('aria-hidden') === 'true')).toBe(true);
    // Decoration, so it must not be a link and must not be focusable.
    expect([...gutter].every((g) => g.tagName === 'SPAN')).toBe(true);
  });

  it('renders rows for annotated lines beyond the extent of the source', async () => {
    // A coverage report for a file whose source could not be fetched still
    // renders its full gutter.
    const el = await mount({ language: 'typescript', 'line-numbers': '' }, '');
    el.annotations = [{ line: 4, kind: 'uncovered' }];
    await el.updateComplete;

    expect(rows(el)).toHaveLength(4);
  });

  it('exposes the annotation kind as a CSS part and its description to AT', async () => {
    const el = await mount({ language: 'typescript' }, THREE);
    el.annotations = [{ line: 2, kind: 'partial', label: '0', description: 'Branches: 1/2' }];
    await el.updateComplete;

    const row = rows(el)[1];
    expect(row.getAttribute('part')).toContain('annotation-partial');
    expect(row.getAttribute('title')).toBe('Branches: 1/2');
    expect(row.textContent).toContain('Branches: 1/2');
    // `0` is a legitimate hit count and must survive the falsy check.
    expect(row.querySelector('.line-mark')!.textContent).toBe('0');
  });

  it('marks the active line without dropping its annotation', async () => {
    const el = await mount({ language: 'typescript' }, THREE);
    el.annotations = [{ line: 2, kind: 'covered' }];
    el.activeLine = 2;
    await el.updateComplete;

    const part = rows(el)[1].getAttribute('part')!;
    expect(part).toContain('annotation-covered');
    expect(part).toContain('active-line');
  });
});

describe('mp-code-snippet line anchors', () => {
  const FIVE = Array.from({ length: 5 }, (_, i) => `line ${i + 1}`).join('\n');

  const mountLinked = async () => {
    const el = await mount({ language: 'plaintext', 'line-numbers': '' }, FIVE);
    el.lineHref = (line) => `#L${line}`;
    await el.updateComplete;
    return el;
  };

  it('renders a named link per line when lineHref is set', async () => {
    const el = await mountLinked();
    const links = anchors(el);

    expect(links).toHaveLength(5);
    expect(links[2].getAttribute('aria-label')).toBe('Line 3');
    // Resolved against the current URL — a bare fragment would resolve
    // against `<base>` and navigate away from the route.
    expect(links[2].getAttribute('href')).toBe(`${location.pathname}${location.search}#L3`);
  });

  it('takes a localised line-label pattern', async () => {
    const el = await mount({ language: 'plaintext', 'line-numbers': '', 'line-label': 'Regel ${line}' }, FIVE);
    el.lineHref = (line) => `#L${line}`;
    await el.updateComplete;

    expect(anchors(el)[0].getAttribute('aria-label')).toBe('Regel 1');
  });

  it('exposes exactly one tab stop for the whole listing', async () => {
    const el = await mountLinked();
    const tabbable = anchors(el).filter((a) => a.getAttribute('tabindex') === '0');

    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].getAttribute('aria-label')).toBe('Line 1');
  });

  it('puts the single tab stop on the active line when there is one', async () => {
    const el = await mountLinked();
    el.activeLine = 4;
    await el.updateComplete;

    const tabbable = anchors(el).filter((a) => a.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].getAttribute('aria-label')).toBe('Line 4');
  });

  it('moves the roving tab stop with the arrow keys, clamping at both ends', async () => {
    const el = await mountLinked();
    const press = async (key: string, from: number) => {
      anchors(el)[from].dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await el.updateComplete;
      return anchors(el).findIndex((a) => a.getAttribute('tabindex') === '0');
    };

    expect(await press('ArrowDown', 0)).toBe(1);
    expect(await press('ArrowDown', 1)).toBe(2);
    expect(await press('ArrowUp', 2)).toBe(1);
    expect(await press('Home', 1)).toBe(0);
    expect(await press('End', 0)).toBe(4);
    // Clamped, not wrapped.
    expect(await press('ArrowDown', 4)).toBe(4);
    expect(await press('Home', 4)).toBe(0);
    expect(await press('ArrowUp', 0)).toBe(0);
  });

  it('consumes the arrow key so the region does not scroll out from under focus', async () => {
    const el = await mountLinked();
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    anchors(el)[0].dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves keys it does not own alone', async () => {
    const el = await mountLinked();
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    anchors(el)[0].dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('describes the region with the keymap only while the anchors exist', async () => {
    const plain = await mount({ language: 'plaintext', 'line-numbers': '' }, FIVE);
    expect(plain.shadowRoot!.querySelector('#keymap')).toBeNull();
    expect(region(plain).hasAttribute('aria-describedby')).toBe(false);

    const linked = await mountLinked();
    expect(region(linked).getAttribute('aria-describedby')).toBe('keymap');
    // The IDREF resolves INSIDE the shadow root — it must never point out of it.
    expect(linked.shadowRoot!.querySelector('#keymap')!.textContent).toContain('arrow');
  });

  it('emits a cancelable line-activate that suppresses navigation when cancelled', async () => {
    const el = await mountLinked();
    const seen: number[] = [];
    el.addEventListener('line-activate', (e) => {
      seen.push((e as CustomEvent<{ line: number }>).detail.line);
      e.preventDefault();
    });

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchors(el)[2].dispatchEvent(click);

    expect(seen).toEqual([3]);
    // The consumer navigates itself; the href stays in the DOM for middle-click.
    expect(click.defaultPrevented).toBe(true);
    expect(anchors(el)[2].getAttribute('href')).toBe(`${location.pathname}${location.search}#L3`);
  });

  it('leaves the real navigation alone when nobody cancels', async () => {
    const el = await mountLinked();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchors(el)[0].dispatchEvent(click);

    expect(click.defaultPrevented).toBe(false);
  });

  it('resolves a bare fragment against the current URL, not the document base', async () => {
    // `<base href="/">` is present in every Angular app, and a bare `#L3`
    // resolves against it — so the obvious lineHref would navigate away from
    // the current route entirely. The element resolves it instead.
    const el = await mountLinked();
    const href = anchors(el)[2].getAttribute('href')!;

    expect(href).toBe(`${location.pathname}${location.search}#L3`);
    expect(href.startsWith('#')).toBe(false);
  });

  it('leaves a path-qualified or absolute href exactly as given', async () => {
    const el = await mount({ language: 'plaintext', 'line-numbers': '' }, FIVE);
    el.lineHref = (line) => `/files/app.ts?x=1#L${line}`;
    await el.updateComplete;

    expect(anchors(el)[0].getAttribute('href')).toBe('/files/app.ts?x=1#L1');
  });

  for (const [name, init] of [
    ['ctrl', { ctrlKey: true }],
    ['meta', { metaKey: true }],
    ['shift', { shiftKey: true }],
    ['alt', { altKey: true }],
    ['middle', { button: 1 }],
  ] as const) {
    it(`ignores a ${name} click so the browser can open the link itself`, async () => {
      const el = await mountLinked();
      const seen: number[] = [];
      el.addEventListener('line-activate', (e) => {
        seen.push((e as CustomEvent<{ line: number }>).detail.line);
        e.preventDefault();
      });

      const click = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
      anchors(el)[1].dispatchEvent(click);

      // No event, and crucially the default is NOT suppressed — otherwise
      // open-in-new-tab would silently do nothing.
      expect(seen).toEqual([]);
      expect(click.defaultPrevented).toBe(false);
    });
  }
});

describe('mp-code-snippet gutter cells', () => {
  const THREE = 'const a = 1;\nconst b = 2;\nconst c = 3;';

  it('renders each mark as a DIRECT child of the row, with no wrapper', async () => {
    // The cells are placed on shared column tracks by the stylesheet, so they
    // must be row children. A wrapper would be one content-sized cell and every
    // row would size it differently — which is what made the code text start at
    // three different x positions.
    const el = await mount({ language: 'typescript', 'line-numbers': '' }, THREE);
    el.annotations = [{ line: 2, label: '4×', secondaryLabel: '1/2' }];
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('.line-marks')).toBeNull();

    const row = el.shadowRoot!.querySelector('#L2')!;
    const cells = [...row.children].map((c) => c.className);
    expect(cells).toEqual(['line-number', 'line-mark', 'line-mark secondary', 'line-text']);
  });

  it('omits the cells a line does not have, rather than emitting empty ones', async () => {
    const el = await mount({ language: 'typescript', 'line-numbers': '' }, THREE);
    el.annotations = [{ line: 2, label: '4×' }];
    await el.updateComplete;

    const unannotated = [...el.shadowRoot!.querySelector('#L1')!.children].map((c) => c.className);
    expect(unannotated).toEqual(['line-number', 'line-text']);
  });

  it('hides both marks from the accessibility tree', async () => {
    // They sit between the line anchor and the code in DOM order, so unhidden a
    // screen reader would read "4x 1/2 const b = 2;" as the line. The same
    // information stays reachable through the row's description.
    const el = await mount({ language: 'typescript', 'line-numbers': '' }, THREE);
    el.annotations = [{ line: 2, label: '4×', secondaryLabel: '1/2', description: 'Branches: 1 of 2' }];
    await el.updateComplete;

    const marks = [...el.shadowRoot!.querySelectorAll('.line-mark')];
    expect(marks).toHaveLength(2);
    expect(marks.every((m) => m.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(el.shadowRoot!.querySelector('#L2 .sr-only')!.textContent).toBe('Branches: 1 of 2');
  });
});
