import { beforeEach, describe, expect, it } from 'vitest';
import { acquirePortal, currentOverlayContainer, openPaneCount } from './overlay-portal';

/**
 * The container's job is to be an ancestor that does nothing. Most of this file
 * exists to keep it that way — see the containing-block block below.
 */
describe('overlay portal', () => {
  beforeEach(() => {
    // Drain anything a previous test left open.
    while (openPaneCount() > 0) {
      const container = currentOverlayContainer();
      const pane = container?.querySelector<HTMLElement>('.mp-overlay-pane');
      if (!pane) break;
      pane.remove();
      acquirePortal()?.release();
      if (openPaneCount() > 0 && !container?.querySelector('.mp-overlay-pane')) break;
    }
    document.body.innerHTML = '';
  });

  it('creates one container, as the last child of <body>', () => {
    const before = document.body.childElementCount;
    const handle = acquirePortal();
    expect(handle).not.toBeNull();

    const container = currentOverlayContainer();
    expect(container).not.toBeNull();
    expect(container!.tagName.toLowerCase()).toBe('mp-overlay-container');
    expect(document.body.lastElementChild).toBe(container);
    expect(document.body.childElementCount).toBe(before + 1);

    handle!.release();
  });

  it('shares one container across panes and removes it with the last one', () => {
    const a = acquirePortal()!;
    const b = acquirePortal()!;

    expect(document.querySelectorAll('mp-overlay-container')).toHaveLength(1);
    expect(openPaneCount()).toBe(2);
    expect(a.container).not.toBe(b.container);

    a.release();
    expect(currentOverlayContainer()).not.toBeNull();
    expect(openPaneCount()).toBe(1);

    b.release();
    expect(currentOverlayContainer()).toBeNull();
    expect(document.querySelectorAll('mp-overlay-container')).toHaveLength(0);
  });

  it('is idempotent on release', () => {
    const a = acquirePortal()!;
    const b = acquirePortal()!;
    a.release();
    a.release();
    a.release();

    // Double-counting here would strand the container, or tear it down while
    // `b` is still using it. A controller releases on both close() and
    // hostDisconnected(), so this happens in practice.
    expect(openPaneCount()).toBe(1);
    expect(currentOverlayContainer()).not.toBeNull();

    b.release();
    expect(currentOverlayContainer()).toBeNull();
  });

  it('leaves nothing behind over many cycles', () => {
    for (let i = 0; i < 20; i++) acquirePortal()!.release();

    expect(openPaneCount()).toBe(0);
    expect(document.querySelectorAll('mp-overlay-container')).toHaveLength(0);
    expect(document.querySelectorAll('.mp-overlay-pane')).toHaveLength(0);
  });

  it('panes carry no z-index of their own — they stack in DOM order', () => {
    const a = acquirePortal()!;
    const b = acquirePortal()!;

    // The whole point of a shared container: ordering is a DOM question, not a
    // number each component invents. A z-index here would reintroduce exactly
    // the guessing this replaces.
    expect(a.container.style.zIndex).toBe('');
    expect(b.container.style.zIndex).toBe('');
    expect(a.container.compareDocumentPosition(b.container) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    a.release();
    b.release();
  });

  it('does not swallow clicks on the page behind it', () => {
    const handle = acquirePortal()!;
    const container = currentOverlayContainer()!;

    // The container spans the viewport, so it MUST be transparent to pointers;
    // panes opt back in individually.
    expect(container.style.pointerEvents).toBe('none');
    expect(handle.container.style.pointerEvents).toBe('auto');

    handle.release();
  });

  /**
   * The invariant the whole file exists for. Any of these properties on the
   * container would make it the containing block for the `position: fixed`
   * panes inside it, and every panel's viewport coordinates — written by
   * OverlayController from getBoundingClientRect() — would be silently wrong.
   *
   * It fails here rather than as a subtly mispositioned dropdown someone
   * debugs for an afternoon.
   */
  it('never establishes a containing block for its fixed children', () => {
    const handle = acquirePortal()!;
    const container = currentOverlayContainer()!;

    // Read declared PROPERTIES, not the style string. A substring check reports
    // `contain` against the `--mp-overlay-container-z-index` custom property,
    // which is a false positive on the variable's own name.
    for (const property of [
      'transform',
      'filter',
      'backdrop-filter',
      'perspective',
      'contain',
      'will-change',
      'container-type',
    ]) {
      const declared = container.style.getPropertyValue(property);
      expect(declared, `container must not set ${property}`).toBe('');
    }

    expect(container.style.position).toBe('fixed');
    handle.release();
  });
});
