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
      trigger: () => anchor,
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
      trigger: () => [null as unknown as HTMLElement, a, b],
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
      trigger: () => null,
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
      trigger: () => anchor,
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
      trigger: () => anchor,
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
      trigger: () => anchor,
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
      trigger: () => anchor,
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
      trigger: () => anchor,
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
      trigger: () => anchor,
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
      trigger: () => anchor,
      panel: () => panel,
      positions: [
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 12 },
      ],
    });
    controller.position();
    expect(panel.style.top).toBe('144px'); // 132 + 12
  });
});
