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
