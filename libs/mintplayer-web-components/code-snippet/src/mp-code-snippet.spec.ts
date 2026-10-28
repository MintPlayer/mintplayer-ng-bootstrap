import { afterEach, describe, expect, it, vi } from 'vitest';
import { MpCodeSnippet } from './index';

void MpCodeSnippet; // force the side-effect registration

/**
 * The Lit code snippet (#437): light DOM, rendered from the template compiled
 * out of `@mintplayer/ui-core/code-snippet`. The core's spec covers the bags;
 * this file pins the element's behaviour: highlighting, copy, line activation
 * and the roving gutter.
 */

async function mount(patch: Partial<MpCodeSnippet> = {}): Promise<MpCodeSnippet> {
  const host = document.createElement('mp-code-snippet') as MpCodeSnippet;
  Object.assign(host, patch);
  document.body.append(host);
  await host.updateComplete;
  await host.whenHighlighted();
  await host.updateComplete;
  return host;
}

const rows = (host: MpCodeSnippet) => Array.from(host.querySelectorAll<HTMLElement>('.line'));
const links = (host: MpCodeSnippet) => Array.from(host.querySelectorAll<HTMLAnchorElement>('a.line-number'));
const SOURCE = 'const a = 1;\nconst b = 2;\nconst c = 3;';

describe('mp-code-snippet', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders in the light DOM, one row per line, and highlights once the grammar loads', async () => {
    const detected: string[] = [];
    document.addEventListener('languagedetected', (e) => detected.push((e as CustomEvent<string>).detail), { once: true });
    const host = await mount({ code: SOURCE, language: 'typescript' });
    expect(host.shadowRoot).toBeNull();
    expect(rows(host)).toHaveLength(3);
    expect(host.querySelector('.line-text .hljs-keyword')?.textContent).toBe('const');
    expect(host.querySelector('pre')?.getAttribute('aria-label')).toBe('typescript code sample');
    expect(detected).toEqual(['typescript']);
  });

  it('keeps an unknown language as escaped plain text', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const host = await mount({ code: '<b>x</b>', language: 'no-such-language' });
    expect(host.querySelector('.line-text')?.textContent).toBe('<b>x</b>');
    expect(host.querySelector('.line-text b')).toBeNull();
  });

  it('copies the source and shows the toast', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const host = await mount({ code: SOURCE, language: 'typescript' });
    const copy = host.querySelector<HTMLButtonElement>('button.copy')!;
    expect(copy.disabled).toBe(false);
    copy.click();
    await Promise.resolve();
    await host.updateComplete;
    expect(writeText).toHaveBeenCalledWith(SOURCE);
    expect(host.querySelector('.toast')?.classList.contains('visible')).toBe(true);
    expect(host.querySelector('[role=status]')?.textContent?.trim()).toBe('Copied to clipboard');
  });

  it('emits lineactivate on a plain click, and preventDefault() stops the navigation', async () => {
    const host = await mount({ code: SOURCE, language: 'typescript', lineNumbers: true, lineHref: (n: number) => `#L${n}` });
    host.addEventListener('lineactivate', (e) => (e as CustomEvent<{ line: number; preventDefault(): void }>).detail.preventDefault());
    const seen: number[] = [];
    host.addEventListener('lineactivate', (e) => seen.push((e as CustomEvent<{ line: number }>).detail.line));
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    links(host)[1].dispatchEvent(click);
    expect(seen).toEqual([2]);
    expect(click.defaultPrevented).toBe(true);

    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    links(host)[0].dispatchEvent(modified);
    expect(seen).toEqual([2]);
  });

  it('moves a roving tab stop through the line links with the arrows, Home and End', async () => {
    const host = await mount({ code: SOURCE, language: 'typescript', lineNumbers: true, lineHref: (n: number) => `#L${n}`, activeLine: 2 });
    expect(links(host).map((a) => a.tabIndex)).toEqual([-1, 0, -1]);
    links(host)[1].focus();
    const key = async (k: string) => {
      (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      await host.updateComplete;
    };
    await key('ArrowDown');
    expect(document.activeElement).toBe(links(host)[2]);
    expect(links(host).map((a) => a.tabIndex)).toEqual([-1, -1, 0]);
    await key('Home');
    expect(document.activeElement).toBe(links(host)[0]);
    await key('End');
    expect(document.activeElement).toBe(links(host)[2]);
  });

  it('re-highlights when the code changes', async () => {
    const host = await mount({ code: 'a', language: 'typescript' });
    host.code = 'x\ny';
    await host.updateComplete;
    await host.whenHighlighted();
    await host.updateComplete;
    expect(rows(host).map((r) => r.querySelector('.line-text')?.textContent)).toEqual(['x', 'y']);
  });
});
