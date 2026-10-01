import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OverlayController, type OverlayControllerOptions } from './overlay-controller';

/**
 * `initialFocus` resolution on open, the all-null anchor warning, and that a
 * close cancels a reposition still waiting for its frame. No geometry is read:
 * jsdom's zero rects only decide where the panel lands, which nothing here
 * asserts beyond "a position pass ran or did not".
 */

type Host = HTMLElement & { addController: () => void; requestUpdate: () => void; updateComplete: Promise<void> };

function makeHost(): Host {
  return Object.assign(document.createElement('div'), {
    addController: () => undefined,
    requestUpdate: () => undefined,
    updateComplete: Promise.resolve(),
  });
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

let host: Host;
let anchor: HTMLButtonElement;
let panel: HTMLDivElement;
let controller: OverlayController | null = null;

function make(options: Partial<OverlayControllerOptions> = {}): OverlayController {
  controller = new OverlayController(host, { anchor: () => anchor, panel: () => panel, ...options });
  return controller;
}

beforeEach(() => {
  host = makeHost();
  anchor = document.createElement('button');
  panel = document.createElement('div');
  document.body.append(host, anchor, panel);
});

afterEach(() => {
  controller?.close(false);
  controller = null;
  host.remove();
  anchor.remove();
  panel.remove();
});

describe('OverlayController — initialFocus on open', () => {
  it("'none' (the default) leaves focus where it was", async () => {
    anchor.focus();
    await make().open();
    expect(document.activeElement).toBe(anchor);
  });

  it("'self' focuses the panel, making it programmatically focusable", async () => {
    await make({ initialFocus: 'self' }).open();
    expect(document.activeElement).toBe(panel);
    expect(panel.getAttribute('tabindex')).toBe('-1');
  });

  it("'self' keeps a tabindex the consumer already set", async () => {
    panel.setAttribute('tabindex', '0');
    await make({ initialFocus: 'self' }).open();
    expect(panel.getAttribute('tabindex')).toBe('0');
    expect(document.activeElement).toBe(panel);
  });

  it('an element focuses that element', async () => {
    const input = document.createElement('input');
    const other = document.createElement('button');
    panel.append(other, input);
    await make({ initialFocus: input }).open();
    expect(document.activeElement).toBe(input);
  });

  it('a function is called at open time, and its element is focused', async () => {
    const late = document.createElement('input');
    const pick = vi.fn(() => late);
    make({ initialFocus: pick });
    panel.append(document.createElement('button'), late);
    await controller!.open();
    expect(pick).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(late);
  });

  it("a function that returns null falls back to 'first'", async () => {
    const first = document.createElement('button');
    panel.append(first, document.createElement('button'));
    await make({ initialFocus: () => null }).open();
    expect(document.activeElement).toBe(first);
  });

  it("'first' focuses the first tabbable in the panel", async () => {
    const skipped = document.createElement('button');
    skipped.disabled = true;
    const first = document.createElement('a');
    first.href = '#x';
    panel.append(skipped, first);
    await make({ initialFocus: 'first' }).open();
    expect(document.activeElement).toBe(first);
  });

  it("'first' on a panel with nothing tabbable focuses the panel itself", async () => {
    panel.textContent = 'Just text';
    await make({ initialFocus: 'first' }).open();
    expect(document.activeElement).toBe(panel);
    expect(panel.getAttribute('tabindex')).toBe('-1');
  });

  it('does nothing when the panel is not rendered', async () => {
    anchor.focus();
    controller = new OverlayController(host, { anchor: () => anchor, panel: () => null, initialFocus: 'self' });
    await expect(controller.open()).resolves.toBeUndefined();
    expect(document.activeElement).toBe(anchor);
  });
});

describe('OverlayController — anchors', () => {
  it('warns when anchor() returns an array holding only nulls, and positions nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const c = new OverlayController(host, { anchor: () => [null, null], panel: () => panel });
    c.position();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('all-null'));
    expect(panel.style.left).toBe('');
    warn.mockRestore();
  });

  it('an empty anchor array is silent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    new OverlayController(host, { anchor: () => [], panel: () => panel }).position();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('skips null entries and positions against the remaining anchor', () => {
    new OverlayController(host, { anchor: () => [null, anchor], panel: () => panel }).position();
    expect(panel.style.left).not.toBe('');
  });
});

describe('OverlayController — close cancels a pending reposition', () => {
  it('a scroll-scheduled reposition never runs after close', async () => {
    const c = make();
    await c.open();
    document.dispatchEvent(new Event('scroll'));
    c.close(false);
    panel.style.left = '';
    await nextFrame();
    await nextFrame();
    expect(panel.style.left).toBe('');
  });

  it('without the close, the same scroll repositions on the next frame', async () => {
    const c = make();
    await c.open();
    panel.style.left = '';
    document.dispatchEvent(new Event('scroll'));
    await nextFrame();
    await nextFrame();
    expect(panel.style.left).not.toBe('');
  });
});
