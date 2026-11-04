import { afterEach, describe, expect, it, vi } from 'vitest';
import { MpResizable } from './generated';

void MpResizable; // force the side-effect registration

/**
 * The Lit resizable front (#458 M7). The core's specs cover the bags and the geometry; this
 * pins the DOM behaviour: glyphs appear once attached, a key press writes the instance sheet,
 * a nested box keeps its own glyphs, and the text direction picks the start edge.
 */

async function settle(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

function mount(markup: string): MpResizable {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  return host.querySelector('mp-resizable') as MpResizable;
}

/** jsdom lays nothing out: give the box a rect to resize from. */
function layout(rect: { left: number; top: number; width: number; height: number }) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => rect,
  } as DOMRect);
}

const glyphs = (box: Element) => [...box.querySelectorAll(':scope > [role=separator]')] as HTMLElement[];
/** Every instance sheet on the page, as one text. */
const sheet = () => [...document.querySelectorAll('style')].map((s) => s.textContent ?? '').filter((t) => t.includes('[data-resizable=')).join('\n');

afterEach(() => {
  document.body.innerHTML = '';
  document.head.querySelectorAll('style').forEach((s) => s.textContent?.includes('[data-resizable=') && s.remove());
  vi.restoreAllMocks();
});

describe('mp-resizable', () => {
  it('renders its eight glyphs as named separators once attached, before the content', async () => {
    const box = mount('<mp-resizable><p>content</p></mp-resizable>');
    await settle(box);
    expect(glyphs(box)).toHaveLength(8);
    expect(glyphs(box).map((g) => g.getAttribute('aria-label'))).toContain('Resize from left edge');
    expect(box.querySelector(':scope > p')?.textContent).toBe('content');
  });

  it('an arrow key on an absolute box moves the glyph edge and writes the instance sheet', async () => {
    layout({ left: 100, top: 50, width: 200, height: 120 });
    const box = mount('<mp-resizable positioning="absolute"><p>content</p></mp-resizable>');
    await settle(box);
    const resized = vi.fn();
    box.addEventListener('resized', resized);
    const end = glyphs(box).find((g) => g.getAttribute('data-resize-glyph') === 'end')!;
    end.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await settle(box);
    expect(sheet()).toContain('width:210px');
    expect(resized).toHaveBeenCalledTimes(1);
    end.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    await settle(box);
    expect(resized).toHaveBeenCalledTimes(1);
  });

  it('a nested box resizes itself, never its parent', async () => {
    layout({ left: 0, top: 0, width: 200, height: 120 });
    const outer = mount('<mp-resizable positioning="absolute"><mp-resizable positioning="absolute"></mp-resizable></mp-resizable>');
    await settle(outer);
    const inner = outer.querySelector('mp-resizable') as MpResizable;
    await settle(inner);
    expect(glyphs(outer)).toHaveLength(8);
    expect(glyphs(inner)).toHaveLength(8);
    const end = glyphs(inner).find((g) => g.getAttribute('data-resize-glyph') === 'end')!;
    end.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await settle(inner);
    await settle(outer);
    expect(sheet()).toContain(`[data-resizable="${inner.getAttribute('data-resizable')}"]`);
    expect(sheet()).not.toContain(`[data-resizable="${outer.getAttribute('data-resizable')}"]`);
  });

  it('in a right-to-left document the start glyph sits on the right', async () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({ direction: 'rtl' } as CSSStyleDeclaration);
    const box = mount('<div dir="rtl"><mp-resizable></mp-resizable></div>');
    await settle(box);
    const start = glyphs(box).find((g) => g.getAttribute('data-resize-glyph') === 'start')!;
    expect(start.classList.contains('right')).toBe(true);
    expect(start.getAttribute('aria-label')).toBe('Resize from right edge');
  });
});
