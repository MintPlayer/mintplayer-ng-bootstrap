import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OverlayController } from './overlay-controller';
describe('OverlayController — Esc-stack primitives', () => {
  it('pushFrame() returns a unique symbol and lifts it to the top', () => {
    const a = OverlayController.pushFrame();
    const b = OverlayController.pushFrame();
    expect(OverlayController.isFrameTop(b)).toBe(true);
    expect(OverlayController.isFrameTop(a)).toBe(false);
    OverlayController.releaseFrame(b);
    OverlayController.releaseFrame(a);
  });

  it('releaseFrame() restores the previous top', () => {
    const a = OverlayController.pushFrame();
    const b = OverlayController.pushFrame();
    OverlayController.releaseFrame(b);
    expect(OverlayController.isFrameTop(a)).toBe(true);
    OverlayController.releaseFrame(a);
  });

  it('releasing a non-top token is allowed', () => {
    const a = OverlayController.pushFrame();
    const b = OverlayController.pushFrame();
    OverlayController.releaseFrame(a);
    expect(OverlayController.isFrameTop(b)).toBe(true);
    OverlayController.releaseFrame(b);
  });

  it('isFrameTop() returns false for a never-pushed token', () => {
    const fake = Symbol('not-pushed');
    expect(OverlayController.isFrameTop(fake)).toBe(false);
  });
});

describe('OverlayController — multi-anchor resolution', () => {
  // Lightweight host stub matching the ReactiveControllerHost & HTMLElement
  // shape the controller needs.
  function makeHost(): HTMLElement & { addController: () => void; requestUpdate: () => void; updateComplete: Promise<void> } {
    const el = document.createElement('div') as HTMLElement & {
      addController: () => void;
      requestUpdate: () => void;
      updateComplete: Promise<void>;
    };
    el.addController = () => {};
    el.requestUpdate = () => {};
    el.updateComplete = Promise.resolve();
    return el;
  }

  let host: ReturnType<typeof makeHost>;
  let panel: HTMLElement;

  beforeEach(() => {
    host = makeHost();
    document.body.appendChild(host);
    panel = document.createElement('div');
    panel.style.width = '100px';
    panel.style.height = '50px';
    document.body.appendChild(panel);
  });

  afterEach(() => {
    host.remove();
    panel.remove();
  });

  it('single-anchor trigger returns the element', () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
    });
    // resolveAnchor is protected; verify via positioning side-effect (panel.style.left set).
    controller.position();
    expect(panel.style.left).toBeTruthy();
    anchor.remove();
  });

  it('array trigger picks the first non-null anchor', () => {
    const a = document.createElement('button');
    const b = document.createElement('button');
    document.body.appendChild(a);
    document.body.appendChild(b);
    const controller = new OverlayController(host, {
      anchor: () => [null as unknown as HTMLElement, a, b],
      panel: () => panel,
    });
    controller.position();
    // Just assert positioning ran without error. Multi-anchor *selection* logic
    // gets fleshed out further in M5; here we only validate the controller
    // accepts the array shape.
    expect(panel.style.left).toBeTruthy();
    a.remove();
    b.remove();
  });

  it('null trigger result is a no-op', () => {
    const controller = new OverlayController(host, {
      anchor: () => null,
      panel: () => panel,
    });
    controller.position(); // should not throw
    expect(panel.style.left).toBe('');
  });
});

describe('OverlayController — position-pair selection', () => {
  function makeHost(): HTMLElement & {
    addController: () => void;
    requestUpdate: () => void;
    updateComplete: Promise<void>;
  } {
    const el = document.createElement('div') as HTMLElement & {
      addController: () => void;
      requestUpdate: () => void;
      updateComplete: Promise<void>;
    };
    el.addController = () => {};
    el.requestUpdate = () => {};
    el.updateComplete = Promise.resolve();
    return el;
  }

  /**
   * Stub getBoundingClientRect on an element so positioning can be tested
   * deterministically without depending on jsdom's layout (which is mostly
   * absent for plain divs).
   */
  function stubRect(el: HTMLElement, rect: { left: number; top: number; width: number; height: number }): void {
    el.getBoundingClientRect = () => ({
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    });
  }

  function stubViewport(width: number, height: number): void {
    Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, writable: true, configurable: true });
  }

  let host: ReturnType<typeof makeHost>;
  let anchor: HTMLElement;
  let panel: HTMLElement;

  beforeEach(() => {
    host = makeHost();
    document.body.appendChild(host);
    anchor = document.createElement('button');
    panel = document.createElement('div');
    document.body.appendChild(anchor);
    document.body.appendChild(panel);
    stubViewport(1024, 768);
  });

  afterEach(() => {
    host.remove();
    anchor.remove();
    panel.remove();
  });

  it('default positions: places panel below the anchor when it fits', () => {
    stubRect(anchor, { left: 100, top: 100, width: 80, height: 32 });
    stubRect(panel, { left: 0, top: 0, width: 200, height: 100 });
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
    });
    controller.position();
    expect(panel.style.left).toBe('100px'); // anchor's start (left edge)
    expect(panel.style.top).toBe('132px'); // anchor's bottom (top + height)
  });

  it('flips above when below would overflow the viewport bottom', () => {
    // Anchor near bottom of viewport; panel is tall.
    stubRect(anchor, { left: 100, top: 700, width: 80, height: 32 });
    stubRect(panel, { left: 0, top: 0, width: 200, height: 200 });
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
    });
    controller.position();
    expect(panel.style.top).toBe('500px'); // anchor.top - panel.height
  });

  it('clamps horizontally when start-aligned panel would overflow the right edge', () => {
    // Anchor near right edge; panel is wide.
    stubRect(anchor, { left: 900, top: 100, width: 80, height: 32 });
    stubRect(panel, { left: 0, top: 0, width: 300, height: 100 });
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
    });
    controller.position();
    // Push left so the panel fits: vw(1024) - width(300) - margin(8) = 716.
    expect(panel.style.left).toBe('716px');
  });

  it('honors a custom positions list — center-bottom anchored to top-center', () => {
    stubRect(anchor, { left: 100, top: 400, width: 100, height: 40 });
    stubRect(panel, { left: 0, top: 0, width: 80, height: 30 });
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      positions: [
        { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
      ],
    });
    controller.position();
    // anchor center-x = 150; panel center-x at 150 → left = 150 - 40 = 110.
    expect(panel.style.left).toBe('110px');
    // anchor bottom = 440; panel top edge there → top = 440.
    expect(panel.style.top).toBe('440px');
  });

  it('falls back to the last candidate (then clamps) when no candidate fits', () => {
    // Anchor in a tight corner where neither below nor above fits cleanly.
    stubRect(anchor, { left: 100, top: 700, width: 80, height: 32 });
    stubRect(panel, { left: 0, top: 0, width: 200, height: 300 });
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
    });
    controller.position();
    // Neither below (700+32+300 > 760) nor above (700-300 = 400 > 8) — wait,
    // above DOES fit at 400; let's pick a scenario where neither fits.
    // Panel height 700 forces both candidates over the viewport bounds.
    stubRect(panel, { left: 0, top: 0, width: 200, height: 700 });
    controller.position();
    // Fallback: applies the last candidate (flip above) then clamps. Top
    // would be 700-700 = 0; margin (8) bumps it to 8. Bottom = 8+700=708 — fits.
    expect(panel.style.top).toBe('8px');
  });

  it('respects viewportMargin', () => {
    stubRect(anchor, { left: 900, top: 100, width: 80, height: 32 });
    stubRect(panel, { left: 0, top: 0, width: 300, height: 100 });
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      viewportMargin: 20,
    });
    controller.position();
    // vw(1024) - width(300) - margin(20) = 704.
    expect(panel.style.left).toBe('704px');
  });

  it('respects offsetY in a custom position', () => {
    stubRect(anchor, { left: 100, top: 100, width: 80, height: 32 });
    stubRect(panel, { left: 0, top: 0, width: 200, height: 100 });
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      positions: [
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 12 },
      ],
    });
    controller.position();
    expect(panel.style.top).toBe('144px'); // 132 + 12
  });
});

describe('OverlayController — scroll strategies', () => {
  function makeHost(): HTMLElement & {
    addController: () => void;
    requestUpdate: () => void;
    updateComplete: Promise<void>;
  } {
    const el = document.createElement('div') as HTMLElement & {
      addController: () => void;
      requestUpdate: () => void;
      updateComplete: Promise<void>;
    };
    el.addController = () => {};
    el.requestUpdate = () => {};
    el.updateComplete = Promise.resolve();
    return el;
  }

  function stubRect(el: HTMLElement, rect: { left: number; top: number; width: number; height: number }): void {
    el.getBoundingClientRect = () => ({
      left: rect.left, top: rect.top,
      right: rect.left + rect.width, bottom: rect.top + rect.height,
      width: rect.width, height: rect.height,
      x: rect.left, y: rect.top, toJSON: () => ({}),
    });
  }

  function nextRaf(): Promise<void> {
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  }

  let host: ReturnType<typeof makeHost>;
  let anchor: HTMLElement;
  let panel: HTMLElement;

  beforeEach(() => {
    host = makeHost();
    anchor = document.createElement('button');
    panel = document.createElement('div');
    document.body.appendChild(host);
    document.body.appendChild(anchor);
    document.body.appendChild(panel);
    stubRect(anchor, { left: 100, top: 100, width: 80, height: 32 });
    stubRect(panel, { left: 0, top: 0, width: 200, height: 100 });
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true, configurable: true });
  });

  afterEach(() => {
    host.remove();
    anchor.remove();
    panel.remove();
  });

  it("'reposition' strategy: scroll fires schedulePosition() and re-applies position", async () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
    });
    await controller.open();
    expect(panel.style.top).toBe('132px');

    // Simulate the anchor moving up by 50px (e.g. page scrolled down).
    stubRect(anchor, { left: 100, top: 50, width: 80, height: 32 });
    document.dispatchEvent(new Event('scroll'));
    await nextRaf();
    expect(panel.style.top).toBe('82px');
    controller.close(false);
  });

  it("'close' strategy: scroll closes the overlay", async () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      scrollStrategy: 'close',
    });
    await controller.open();
    expect(controller.isOpen).toBe(true);
    document.dispatchEvent(new Event('scroll'));
    expect(controller.isOpen).toBe(false);
  });

  it("'noop' strategy: scroll is ignored", async () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      scrollStrategy: 'noop',
    });
    await controller.open();
    const initialTop = panel.style.top;
    stubRect(anchor, { left: 100, top: 50, width: 80, height: 32 });
    document.dispatchEvent(new Event('scroll'));
    await nextRaf();
    // No reposition — panel stayed where it was.
    expect(panel.style.top).toBe(initialTop);
    controller.close(false);
  });

  it("'block' strategy: locks document scroll on open, restores on close", async () => {
    const html = document.documentElement;
    html.style.position = '';
    html.style.top = '';
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      scrollStrategy: 'block',
    });
    await controller.open();
    expect(html.style.position).toBe('fixed');
    controller.close(false);
    expect(html.style.position).toBe('');
  });

  it('resize re-applies position', async () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
    });
    await controller.open();
    expect(panel.style.top).toBe('132px');
    stubRect(anchor, { left: 100, top: 50, width: 80, height: 32 });
    window.dispatchEvent(new Event('resize'));
    await nextRaf();
    expect(panel.style.top).toBe('82px');
    controller.close(false);
  });

  it('listeners detach on close (no leak)', async () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
    });
    await controller.open();
    controller.close(false);
    // After close, a scroll event should not reposition the panel.
    stubRect(anchor, { left: 0, top: 0, width: 80, height: 32 });
    const beforeTop = panel.style.top;
    document.dispatchEvent(new Event('scroll'));
    await nextRaf();
    expect(panel.style.top).toBe(beforeTop);
  });
});

describe('OverlayController — sticky on anchor offscreen', () => {
  function makeHost(): HTMLElement & {
    addController: () => void;
    requestUpdate: () => void;
    updateComplete: Promise<void>;
  } {
    const el = document.createElement('div') as HTMLElement & {
      addController: () => void;
      requestUpdate: () => void;
      updateComplete: Promise<void>;
    };
    el.addController = () => {};
    el.requestUpdate = () => {};
    el.updateComplete = Promise.resolve();
    return el;
  }

  function stubRect(el: HTMLElement, rect: { left: number; top: number; width: number; height: number }): void {
    el.getBoundingClientRect = () => ({
      left: rect.left, top: rect.top,
      right: rect.left + rect.width, bottom: rect.top + rect.height,
      width: rect.width, height: rect.height,
      x: rect.left, y: rect.top, toJSON: () => ({}),
    });
  }

  function nextRaf(): Promise<void> {
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  }

  let host: ReturnType<typeof makeHost>;
  let anchor: HTMLElement;
  let panel: HTMLElement;

  beforeEach(() => {
    host = makeHost();
    anchor = document.createElement('button');
    panel = document.createElement('div');
    document.body.appendChild(host);
    document.body.appendChild(anchor);
    document.body.appendChild(panel);
    stubRect(anchor, { left: 100, top: 100, width: 80, height: 32 });
    stubRect(panel, { left: 0, top: 0, width: 200, height: 100 });
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true, configurable: true });
  });

  afterEach(() => {
    host.remove();
    anchor.remove();
    panel.remove();
  });

  it('without sticky: panel follows anchor offscreen', async () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
    });
    await controller.open();
    expect(panel.style.top).toBe('132px');
    // Anchor scrolls way past the viewport bottom.
    stubRect(anchor, { left: 100, top: 2000, width: 80, height: 32 });
    document.dispatchEvent(new Event('scroll'));
    await nextRaf();
    // Default behaviour: panel follows the anchor — far below the viewport,
    // clamped to the bottom edge (viewport height 768 - panel height 100 - margin 8 = 660).
    expect(panel.style.top).toBe('660px');
    controller.close(false);
  });

  it('with sticky=true: panel stays in viewport when anchor scrolls offscreen below', async () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      stickyOnAnchorOffscreen: true,
    });
    await controller.open();
    const stickyTop = panel.style.top;
    // Anchor exits viewport below.
    stubRect(anchor, { left: 100, top: 2000, width: 80, height: 32 });
    document.dispatchEvent(new Event('scroll'));
    await nextRaf();
    // Panel did NOT follow. Its current position is preserved (clamped to viewport).
    expect(panel.style.top).toBe(stickyTop);
    controller.close(false);
  });

  it('with sticky=true: resumes normal positioning when anchor re-enters viewport', async () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      stickyOnAnchorOffscreen: true,
    });
    await controller.open();
    stubRect(anchor, { left: 100, top: 2000, width: 80, height: 32 });
    document.dispatchEvent(new Event('scroll'));
    await nextRaf();
    // Anchor scrolls back into viewport at a different position.
    stubRect(anchor, { left: 100, top: 300, width: 80, height: 32 });
    document.dispatchEvent(new Event('scroll'));
    await nextRaf();
    // Panel tracks the anchor again: 300 + 32 = 332.
    expect(panel.style.top).toBe('332px');
    controller.close(false);
  });

  it('with sticky=true: anchor offscreen to the right also pins the panel', async () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      stickyOnAnchorOffscreen: true,
    });
    await controller.open();
    const stickyLeft = panel.style.left;
    // Anchor exits viewport to the right.
    stubRect(anchor, { left: 5000, top: 100, width: 80, height: 32 });
    document.dispatchEvent(new Event('scroll'));
    await nextRaf();
    expect(panel.style.left).toBe(stickyLeft);
    controller.close(false);
  });
});

describe('OverlayController — multi-anchor selection', () => {
  function makeHost(): HTMLElement & {
    addController: () => void;
    requestUpdate: () => void;
    updateComplete: Promise<void>;
  } {
    const el = document.createElement('div') as HTMLElement & {
      addController: () => void;
      requestUpdate: () => void;
      updateComplete: Promise<void>;
    };
    el.addController = () => {};
    el.requestUpdate = () => {};
    el.updateComplete = Promise.resolve();
    return el;
  }

  function stubRect(el: HTMLElement, rect: { left: number; top: number; width: number; height: number }): void {
    el.getBoundingClientRect = () => ({
      left: rect.left, top: rect.top,
      right: rect.left + rect.width, bottom: rect.top + rect.height,
      width: rect.width, height: rect.height,
      x: rect.left, y: rect.top, toJSON: () => ({}),
    });
  }

  let host: ReturnType<typeof makeHost>;
  let primary: HTMLElement;
  let secondary: HTMLElement;
  let panel: HTMLElement;

  beforeEach(() => {
    host = makeHost();
    primary = document.createElement('button');
    secondary = document.createElement('button');
    panel = document.createElement('div');
    document.body.append(host, primary, secondary, panel);
    stubRect(panel, { left: 0, top: 0, width: 200, height: 100 });
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true, configurable: true });
  });

  afterEach(() => {
    host.remove();
    primary.remove();
    secondary.remove();
    panel.remove();
  });

  it('walks anchors in order; primary anchor wins when its first position fits', () => {
    stubRect(primary, { left: 100, top: 100, width: 80, height: 32 });
    stubRect(secondary, { left: 500, top: 100, width: 80, height: 32 });
    const controller = new OverlayController(host, {
      anchor: () => [primary, secondary],
      panel: () => panel,
    });
    controller.position();
    // Primary anchor's left = 100; positioned below.
    expect(panel.style.left).toBe('100px');
    expect(panel.style.top).toBe('132px');
  });

  it('skips primary anchor when none of its positions fit; uses secondary', () => {
    // Primary near bottom-right corner — below + above both clip.
    stubRect(primary, { left: 900, top: 700, width: 80, height: 32 });
    // Secondary has room.
    stubRect(secondary, { left: 100, top: 100, width: 80, height: 32 });
    const controller = new OverlayController(host, {
      anchor: () => [primary, secondary],
      panel: () => panel,
      positions: [
        // For primary: below clips bottom (700+32+100=832 > 760).
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
      ],
    });
    controller.position();
    // Secondary's left = 100; below = 132.
    expect(panel.style.left).toBe('100px');
    expect(panel.style.top).toBe('132px');
  });

  it('filters null entries inside the trigger array', () => {
    stubRect(primary, { left: 100, top: 100, width: 80, height: 32 });
    const controller = new OverlayController(host, {
      anchor: () => [null as unknown as HTMLElement, primary],
      panel: () => panel,
    });
    controller.position();
    expect(panel.style.left).toBe('100px');
  });

  it('warns when the trigger array filters down to empty', () => {
    let warned = '';
    const originalWarn = console.warn;
    console.warn = (msg: string) => { warned = msg; };
    try {
      const controller = new OverlayController(host, {
        anchor: () => [null as unknown as HTMLElement, null as unknown as HTMLElement],
        panel: () => panel,
      });
      controller.position();
    } finally {
      console.warn = originalWarn;
    }
    expect(warned).toContain('all-null elements');
  });

  it('close(returnFocus) targets the chosen anchor, not the first one', async () => {
    // Primary doesn't fit; secondary does. Focus return should go to secondary.
    stubRect(primary, { left: 900, top: 700, width: 80, height: 32 });
    stubRect(secondary, { left: 100, top: 100, width: 80, height: 32 });
    const controller = new OverlayController(host, {
      anchor: () => [primary, secondary],
      panel: () => panel,
      positions: [
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
      ],
    });
    await controller.open();
    secondary.focus = (() => {
      (secondary as unknown as { focusedFlag: boolean }).focusedFlag = true;
    }) as HTMLElement['focus'];
    primary.focus = (() => {
      (primary as unknown as { focusedFlag: boolean }).focusedFlag = true;
    }) as HTMLElement['focus'];
    controller.close(true);
    expect((secondary as unknown as { focusedFlag?: boolean }).focusedFlag).toBe(true);
    expect((primary as unknown as { focusedFlag?: boolean }).focusedFlag).toBeUndefined();
  });
});

describe('OverlayController — panelWidth strategies', () => {
  function makeHost(): HTMLElement & {
    addController: () => void;
    requestUpdate: () => void;
    updateComplete: Promise<void>;
  } {
    const el = document.createElement('div') as HTMLElement & {
      addController: () => void;
      requestUpdate: () => void;
      updateComplete: Promise<void>;
    };
    el.addController = () => {};
    el.requestUpdate = () => {};
    el.updateComplete = Promise.resolve();
    return el;
  }

  function stubRect(el: HTMLElement, rect: { left: number; top: number; width: number; height: number }): void {
    el.getBoundingClientRect = () => ({
      left: rect.left, top: rect.top,
      right: rect.left + rect.width, bottom: rect.top + rect.height,
      width: rect.width, height: rect.height,
      x: rect.left, y: rect.top, toJSON: () => ({}),
    });
  }

  /**
   * jsdom doesn't compute layout, so `offsetWidth` is always 0 for plain
   * divs. Stub it on the anchor so the panelWidth strategies have a value
   * to read.
   */
  function stubOffsetWidth(el: HTMLElement, width: number): void {
    Object.defineProperty(el, 'offsetWidth', { value: width, configurable: true });
  }

  let host: ReturnType<typeof makeHost>;
  let anchor: HTMLElement;
  let panel: HTMLElement;

  beforeEach(() => {
    host = makeHost();
    anchor = document.createElement('button');
    panel = document.createElement('div');
    document.body.append(host, anchor, panel);
    stubRect(anchor, { left: 100, top: 100, width: 250, height: 32 });
    stubRect(panel, { left: 0, top: 0, width: 200, height: 100 });
    stubOffsetWidth(anchor, 250);
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true, configurable: true });
  });

  afterEach(() => {
    host.remove();
    anchor.remove();
    panel.remove();
  });

  it('panelWidth=null (default): leaves panel CSS width untouched', () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
    });
    controller.position();
    expect(panel.style.width).toBe('');
    expect(panel.style.minWidth).toBe('');
  });

  it("panelWidth='anchor': panel.style.width = anchor.offsetWidth + 'px'", () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      panelWidth: 'anchor',
    });
    controller.position();
    expect(panel.style.width).toBe('250px');
    expect(panel.style.minWidth).toBe('');
  });

  it("panelWidth='anchor-min': sets minWidth, not width", () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      panelWidth: 'anchor-min',
    });
    controller.position();
    expect(panel.style.minWidth).toBe('250px');
    expect(panel.style.width).toBe('');
  });

  it('panelWidth=number: sets a fixed pixel width', () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      panelWidth: 320,
    });
    controller.position();
    expect(panel.style.width).toBe('320px');
  });

  it('panelWidth=string: passes through as CSS', () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      panelWidth: '50vw',
    });
    controller.position();
    expect(panel.style.width).toBe('50vw');
  });

  it('panelWidth recomputes when the anchor resizes', () => {
    const controller = new OverlayController(host, {
      anchor: () => anchor,
      panel: () => panel,
      panelWidth: 'anchor',
    });
    controller.position();
    expect(panel.style.width).toBe('250px');
    // Simulate the anchor growing (e.g., responsive layout).
    stubOffsetWidth(anchor, 400);
    controller.position();
    expect(panel.style.width).toBe('400px');
  });
});
