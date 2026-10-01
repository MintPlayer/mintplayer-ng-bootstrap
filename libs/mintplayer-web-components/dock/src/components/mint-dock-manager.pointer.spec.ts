import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import './mint-dock-manager.element';
import type { MintDockManagerElement } from './mint-dock-manager.element';
import type { DockLayoutNode, DockLayoutSnapshot, DockSplitNode, DockStackNode } from '../types/dock-layout';

/**
 * The pointer gestures, driven by real pointer events end to end: tab drags,
 * floating-window drags and resizes, and corner resizes.
 *
 * Nothing here invents geometry (R3). Two things make that possible:
 *
 * - **The hit test is a seam.** "Which element is under the pointer" is asked
 *   in one place, `elementsAt`, and the specs answer it by naming elements
 *   that really are rendered (`under = () => [stackAt('d:1')]`). That states a
 *   fact about the pointer, not a coordinate (P2-D4). The ONLY stubbed member
 *   is that seam.
 * - **Everything else is arithmetic on stored numbers** — a floating window's
 *   bounds, the pointer's own deltas — or runs on the zero rects jsdom really
 *   reports. Where a branch depends on a rect's value the spec says so and uses
 *   the real zero-size geometry honestly: jsdom lays every element out as a
 *   zero-size box at the origin, so the one point inside a tab strip is (0, 0).
 *
 * Pointer capture does not exist in jsdom, which turned out to be useful: two
 * handlers set their visual state inside the same `try` as `setPointerCapture`,
 * and so lost it wherever capture was unavailable (P2-D6).
 */

const stack = (...panes: string[]): DockStackNode => ({ kind: 'stack', panes, activePane: panes[0] });

const split = (
  direction: 'horizontal' | 'vertical',
  children: DockLayoutNode[],
  sizes?: number[],
): DockSplitNode => ({ kind: 'split', direction, children, sizes });

const BOUNDS = { left: 100, top: 80, width: 320, height: 200 };

type DockInternals = MintDockManagerElement & {
  shadowRoot: ShadowRoot;
  elementsAt: (x: number, y: number) => Element[];
  renderIntersectionHandles: () => void;
};

let dock: DockInternals;
/** What the hit test reports under the pointer. Re-evaluated on every ask. */
let under: () => Element[];
let layoutEvents: DockLayoutSnapshot[];

beforeEach(() => {
  dock = document.createElement('mint-dock-manager') as DockInternals;
  document.body.appendChild(dock);
  under = () => [];
  dock.elementsAt = () => under();
  layoutEvents = [];
  dock.addEventListener('dock-layout-changed', (event) =>
    layoutEvents.push((event as CustomEvent<DockLayoutSnapshot>).detail),
  );
});

afterEach(() => {
  dock.remove();
  vi.useRealTimers();
});

const settle = () => (dock as unknown as { updateComplete: Promise<unknown> }).updateComplete;

/** Let the deferred drag end (a zero-delay timer) and handle re-renders run. */
const tick = (ms = 10) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function mount(layout: unknown): Promise<void> {
  dock.layout = layout as never;
  await settle();
  // Let the observers' scheduled intersection-handle render run now, so it
  // cannot rebuild the handles mid-test.
  await tick(20);
}

function pointer(
  type: string,
  clientX: number,
  clientY: number,
  init: { pointerId?: number; button?: number; pointerType?: string } = {},
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    composed: true,
    cancelable: true,
    isPrimary: true,
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? 'mouse',
    button: init.button ?? 0,
    buttons: type === 'pointerup' ? 0 : 1,
    clientX,
    clientY,
  });
}

const move = (x: number, y: number, pointerId = 1) => window.dispatchEvent(pointer('pointermove', x, y, { pointerId }));
const release = (x: number, y: number, pointerId = 1) => window.dispatchEvent(pointer('pointerup', x, y, { pointerId }));
const cancel = (x: number, y: number, pointerId = 1) => window.dispatchEvent(pointer('pointercancel', x, y, { pointerId }));

const q = <T extends Element = HTMLElement>(selector: string) => dock.shadowRoot.querySelector<T & HTMLElement>(selector);
const stackAt = (path: string) => q(`.dock-stack[data-path="${path}"]`)!;
const tab = (pane: string) => q(`.dock-tab[data-pane="${pane}"]:not([data-placeholder])`)!;
const joystick = () => q('.dock-drop-joystick')!;
const joystickButton = (zone: string) => q<HTMLButtonElement>(`.dock-drop-joystick__button[data-zone="${zone}"]`)!;
const indicator = () => q('.dock-drop-indicator')!;
const docked = () => q('.dock-docked')!;
const chrome = (index: number) => q(`.dock-floating[data-path="f:${index}"] .dock-floating__chrome`)!;
const floatingWrapper = (index: number) => q(`.dock-floating[data-path="f:${index}"]`)!;

function panesOf(node: DockLayoutNode | null): string[] {
  if (!node) return [];
  return node.kind === 'stack' ? [...node.panes] : node.children.flatMap(panesOf);
}
const dockedPanes = () => panesOf(dock.layout.root);
const floatingPanes = () => dock.layout.floating.map((window) => panesOf(window.root));

/** Whether the host could overwrite the layout right now (it cannot mid-gesture). */
function hostCanWriteLayout(): boolean {
  const before = JSON.stringify(dock.layout);
  const probe = stack('__probe__');
  const current = dock.layout;
  dock.layout = { ...current, root: probe } as never;
  const accepted = JSON.stringify(dock.layout) !== before;
  if (accepted) dock.layout = current as never;
  return accepted;
}

// ===========================================================================
// Starting a tab drag
// ===========================================================================

describe('pressing a tab', () => {
  beforeEach(() => mount(split('horizontal', [stack('a', 'b'), stack('c')])));

  it('does not start a drag until the pointer has moved five pixels', () => {
    tab('a').dispatchEvent(pointer('pointerdown', 20, 5));
    move(23, 5);
    expect(floatingPanes()).toEqual([]);
    expect(hostCanWriteLayout()).toBe(true);
  });

  it('tears the pane off into a floating window once dragged off its strip', async () => {
    tab('a').dispatchEvent(pointer('pointerdown', 20, 5));
    move(60, 60);
    expect(floatingPanes()).toEqual([['a']]);
    expect(dockedPanes()).toEqual(['b', 'c']);
    await settle();
    expect(q('[role="status"]')!.textContent).toContain('torn off into a floating window');
  });

  it('never starts a drag from a secondary mouse button', () => {
    tab('a').dispatchEvent(pointer('pointerdown', 20, 5, { button: 2 }));
    move(60, 60);
    expect(floatingPanes()).toEqual([]);
  });

  it('treats a release before the threshold as a click and forgets the gesture', () => {
    tab('a').dispatchEvent(pointer('pointerdown', 20, 5));
    release(20, 5);
    move(60, 60);
    expect(floatingPanes()).toEqual([]);
  });

  it('ignores moves from a different pointer while waiting for the threshold', () => {
    tab('a').dispatchEvent(pointer('pointerdown', 20, 5));
    move(60, 60, 7);
    expect(floatingPanes()).toEqual([]);
  });
});

// ===========================================================================
// Reordering inside the source strip — the placeholder
// ===========================================================================

describe('dragging a tab along its own strip', () => {
  // jsdom lays the strip out as a zero-size box at the origin, so (0, 0) is
  // the one point that is really inside it. The pointer is put there rather
  // than giving the strip an invented size.
  const IN_STRIP = [0, 0] as const;

  beforeEach(async () => {
    await mount(stack('a', 'b', 'c'));
    under = () => [stackAt('d:')];
    tab('a').dispatchEvent(pointer('pointerdown', 20, 0));
    move(...IN_STRIP);
  });

  it('holds the dragged tab\'s place with a placeholder and hides the real tab', () => {
    const placeholder = q('.dock-tab[data-placeholder="true"]');
    expect(placeholder).not.toBeNull();
    expect(placeholder!.getAttribute('aria-hidden')).toBe('true');
    expect(placeholder!.textContent).toBe('a');
    expect(q('.dock-stack__pane[data-pane="a"]')!.hasAttribute('data-hidden')).toBe(true);
    expect(indicator().dataset['visible']).toBe('false');
  });

  it('moves the placeholder to the insert point without touching the layout yet', () => {
    const headers = Array.from(stackAt('d:').children as HTMLCollectionOf<HTMLElement>)
      .filter((el) => el.classList.contains('dock-tab'))
      .map((el) => (el.dataset['placeholder'] ? '*' : el.dataset['pane']));
    expect(headers).toEqual(['a', 'b', 'c', '*']);
    expect(dockedPanes()).toEqual(['a', 'b', 'c']);
  });

  it('commits the reorder where it is released and re-renders without the placeholder', async () => {
    release(...IN_STRIP);
    expect(dock.layout.root).toMatchObject({ kind: 'stack', panes: ['b', 'c', 'a'], activePane: 'a' });
    expect(q('.dock-tab[data-placeholder]')).toBeNull();
    expect(layoutEvents.at(-1)?.root).toMatchObject({ panes: ['b', 'c', 'a'] });
  });

  it('keeps refusing host layout writes until the deferred drag end has run', async () => {
    release(...IN_STRIP);
    expect(hostCanWriteLayout()).toBe(false);
    await tick();
    expect(hostCanWriteLayout()).toBe(true);
  });

  it('restores the tab when the pointer leaves every stack', () => {
    under = () => [];
    move(...IN_STRIP);
    expect(q('.dock-tab[data-placeholder]')).toBeNull();
    expect(q('.dock-stack__pane[data-pane="a"]')!.hasAttribute('data-hidden')).toBe(false);
  });

  it('drops the placeholder and tears the pane off once the pointer leaves the strip', async () => {
    move(60, 60);
    expect(q('.dock-tab[data-placeholder]')).toBeNull();
    expect(floatingPanes()).toEqual([['a']]);
    expect(dockedPanes()).toEqual(['b', 'c']);

    // Released over nothing: the pane stays where it was torn off to, and the
    // drag end reports the final layout once.
    under = () => [];
    const before = layoutEvents.length;
    release(60, 60);
    await tick();
    expect(floatingPanes()).toEqual([['a']]);
    expect(layoutEvents.length).toBe(before + 1);
  });

  it('ends the drag on pointercancel without committing a reorder', async () => {
    cancel(...IN_STRIP);
    await tick();
    expect(dockedPanes()).toEqual(['a', 'b', 'c']);
    expect(q('.dock-tab[data-placeholder]')).toBeNull();
    expect(hostCanWriteLayout()).toBe(true);
  });
});

// ===========================================================================
// Dropping a dragged pane on a zone
// ===========================================================================

describe('dropping a dragged pane beside another stack', () => {
  beforeEach(async () => {
    await mount(split('horizontal', [stack('a', 'b'), stack('c')], [0.5, 0.5]));
    tab('a').dispatchEvent(pointer('pointerdown', 20, 5));
    under = () => [stackAt('d:1')];
    move(300, 300);
  });

  it('shows the joystick over the stack under the pointer, with no zone chosen yet', () => {
    expect(joystick().dataset['visible']).toBe('true');
    expect(joystick().dataset['path']).toBe('d:1');
    expect(indicator().dataset['visible']).toBe('false');
  });

  it('highlights the zone whose button is under the pointer', () => {
    under = () => [joystickButton('right'), stackAt('d:1')];
    move(310, 300);
    expect(joystick().dataset['zone']).toBe('right');
    expect(joystickButton('right').dataset['active']).toBe('true');
    expect(indicator().dataset['visible']).toBe('true');
  });

  it('docks the pane on that side of the target when released', async () => {
    under = () => [joystickButton('right'), stackAt('d:1')];
    move(310, 300);
    release(310, 300);
    expect(dockedPanes()).toEqual(['b', 'c', 'a']);
    expect(dock.layout.root).toMatchObject({ kind: 'split', direction: 'horizontal' });
    expect(floatingPanes()).toEqual([]);
    await tick();
    expect(joystick().dataset['visible']).toBe('false');
  });

  it('docks below the target when the bottom zone is chosen', () => {
    under = () => [joystickButton('bottom'), stackAt('d:1')];
    move(310, 300);
    release(310, 300);
    const root = dock.layout.root as DockSplitNode;
    expect(panesOf(root.children[1])).toEqual(['c', 'a']);
    expect(root.children[1]).toMatchObject({ kind: 'split', direction: 'vertical' });
  });

  it('adds the pane to the target stack as its active tab on the centre zone', () => {
    under = () => [joystickButton('center'), stackAt('d:1')];
    move(310, 300);
    release(310, 300);
    const root = dock.layout.root as DockSplitNode;
    expect(root.children[1]).toMatchObject({ kind: 'stack', panes: ['c', 'a'], activePane: 'a' });
    expect(floatingPanes()).toEqual([]);
  });

  it('commits a zone the pointer is released on even if no move highlighted it', () => {
    // The joystick is showing but holds no zone; the release itself lands on
    // the button, and the release coordinates are authoritative.
    expect(joystick().dataset['zone']).toBeUndefined();
    under = () => [joystickButton('left'), stackAt('d:1')];
    release(305, 300);
    expect(dockedPanes()).toEqual(['b', 'a', 'c']);
  });

  it('commits nothing when the gesture is cancelled over a zone', async () => {
    under = () => [joystickButton('right'), stackAt('d:1')];
    move(310, 300);
    cancel(310, 300);
    await tick();
    expect(dockedPanes()).toEqual(['b', 'c']);
    expect(floatingPanes()).toEqual([['a']]);
  });

  it('forgets the chosen zone when the pointer moves on to another stack', () => {
    under = () => [joystickButton('right'), stackAt('d:1')];
    move(310, 300);
    under = () => [stackAt('d:0')];
    move(100, 100);
    expect(joystick().dataset['path']).toBe('d:0');
    expect(joystick().dataset['zone']).toBeUndefined();
  });

  it('offers no drop target on the window the pane is being dragged in', () => {
    under = () => [stackAt('f:0')];
    move(320, 300);
    expect(joystick().dataset['path']).toBe('d:1');
  });
});

describe('dragging the only tab of a floating window', () => {
  it('moves that window with the pointer instead of tearing off a new one', async () => {
    await mount({ root: stack('a'), floating: [{ bounds: { ...BOUNDS }, root: stack('x') }] });
    tab('x').dispatchEvent(pointer('pointerdown', 20, 5));
    move(60, 60);
    const left = parseFloat(floatingWrapper(0).style.left);
    const top = parseFloat(floatingWrapper(0).style.top);
    move(100, 90);
    expect(parseFloat(floatingWrapper(0).style.left) - left).toBe(40);
    expect(parseFloat(floatingWrapper(0).style.top) - top).toBe(30);
    expect(floatingPanes()).toEqual([['x']]);
    expect(floatingWrapper(0).dataset['dragging']).toBe('true');

    release(100, 90);
    await tick();
    expect(floatingWrapper(0).dataset['dragging']).toBeUndefined();
    expect(dock.layout.floating[0].bounds).toMatchObject({ left: left + 40, top: top + 30 });
  });
});

describe('dropping a dragged pane into a floating window', () => {
  it('splits the floating window\'s stack on the chosen side', async () => {
    await mount({ root: stack('a', 'b'), floating: [{ bounds: BOUNDS, root: stack('x') }] });
    tab('a').dispatchEvent(pointer('pointerdown', 20, 5));
    under = () => [stackAt('f:0')];
    move(200, 150);
    under = () => [joystickButton('left'), stackAt('f:0')];
    move(205, 150);
    release(205, 150);

    expect(dockedPanes()).toEqual(['b']);
    expect(floatingPanes()).toEqual([['a', 'x']]);
    expect(dock.layout.floating[0]).toMatchObject({
      activePane: 'a',
      root: { kind: 'split', direction: 'horizontal' },
    });
  });

  it('lifts the joystick above the floating window it is serving', async () => {
    await mount({ root: stack('a', 'b'), floating: [{ bounds: BOUNDS, root: stack('x'), zIndex: 40 }] });
    tab('a').dispatchEvent(pointer('pointerdown', 20, 5));
    under = () => [stackAt('f:0')];
    move(200, 150);
    expect(Number(joystick().style.zIndex)).toBeGreaterThan(40);
    expect(Number(indicator().style.zIndex)).toBeGreaterThan(40);
  });
});

describe('dropping into an empty main area with the joystick', () => {
  beforeEach(async () => {
    await mount({ root: null, floating: [{ bounds: BOUNDS, root: stack('x', 'y') }] });
    tab('x').dispatchEvent(pointer('pointerdown', 20, 5));
    under = () => [docked()];
    move(300, 300);
  });

  it('offers only the centre button over the empty docked surface', () => {
    expect(joystick().dataset['visible']).toBe('true');
    expect(joystickButton('center').dataset['hidden']).toBeUndefined();
    expect(['top', 'right', 'bottom', 'left'].map((zone) => joystickButton(zone).dataset['hidden'])).toEqual([
      'true',
      'true',
      'true',
      'true',
    ]);
  });

  it('ignores a hidden side button even if it is reported under the pointer', () => {
    under = () => [joystickButton('left'), docked()];
    move(305, 300);
    expect(joystick().dataset['zone']).toBeUndefined();
  });

  it('makes the pane the new main layout when released on the centre', () => {
    under = () => [joystickButton('center'), docked()];
    move(305, 300);
    release(305, 300);
    expect(dock.layout.root).toMatchObject({ kind: 'stack', panes: ['x'], activePane: 'x' });
    expect(floatingPanes()).toEqual([['y']]);
  });
});

// ===========================================================================
// Dragging a whole floating window by its chrome
// ===========================================================================

describe('dragging a floating window by its chrome', () => {
  const layout = (root: DockLayoutNode | null) => ({
    root,
    floating: [
      { bounds: { ...BOUNDS }, root: stack('x') },
      { bounds: { ...BOUNDS, left: 500 }, root: stack('y') },
    ],
  });

  function grab(index: number): void {
    chrome(index).dispatchEvent(pointer('pointerdown', 200, 90));
  }

  it('moves the window by the pointer delta', async () => {
    await mount(layout(stack('a')));
    grab(0);
    move(230, 130);
    expect(floatingWrapper(0).style.left).toBe('130px');
    expect(floatingWrapper(0).style.top).toBe('120px');
    release(230, 130);
    expect(dock.layout.floating[0].bounds).toMatchObject({ left: 130, top: 120 });
  });

  it('merges its panes into a docked stack dropped on the centre', async () => {
    await mount(layout(stack('a')));
    grab(0);
    under = () => [stackAt('d:')];
    move(210, 100);
    under = () => [joystickButton('center'), stackAt('d:')];
    move(215, 100);
    release(215, 100);
    expect(dock.layout.root).toMatchObject({ kind: 'stack', panes: ['a', 'x'], activePane: 'x' });
    expect(floatingPanes()).toEqual([['y']]);
  });

  it('docks it beside a docked stack on a side zone', async () => {
    await mount(layout(stack('a')));
    grab(0);
    under = () => [stackAt('d:')];
    move(210, 100);
    under = () => [joystickButton('top'), stackAt('d:')];
    move(215, 100);
    release(215, 100);
    expect(dock.layout.root).toMatchObject({ kind: 'split', direction: 'vertical' });
    expect(dockedPanes()).toEqual(['x', 'a']);
  });

  it('docks it into another floating window', async () => {
    await mount(layout(stack('a')));
    grab(0);
    under = () => [stackAt('f:1')];
    move(210, 100);
    under = () => [joystickButton('bottom'), stackAt('f:1')];
    move(215, 100);
    release(215, 100);
    expect(floatingPanes()).toEqual([['y', 'x']]);
    expect(dock.layout.floating[0]).toMatchObject({ root: { kind: 'split', direction: 'vertical' } });
  });

  it('becomes the main layout when dropped on an empty docked surface', async () => {
    await mount(layout(null));
    grab(0);
    under = () => [docked()];
    move(210, 100);
    under = () => [joystickButton('center'), docked()];
    move(215, 100);
    release(215, 100);
    expect(dock.layout.root).toMatchObject({ kind: 'stack', panes: ['x'] });
    expect(floatingPanes()).toEqual([['y']]);
  });

  it('offers no target on its own stack', async () => {
    await mount(layout(stack('a')));
    grab(0);
    under = () => [stackAt('f:0')];
    move(210, 100);
    expect(joystick().dataset['visible']).toBe('false');
    release(210, 100);
    expect(floatingPanes()).toEqual([['x'], ['y']]);
  });

  it('drops the target again when the pointer leaves every stack', async () => {
    await mount(layout(stack('a')));
    grab(0);
    under = () => [stackAt('d:')];
    move(210, 100);
    under = () => [joystickButton('center'), stackAt('d:')];
    move(212, 100);
    under = () => [];
    move(400, 400);
    expect(joystick().dataset['visible']).toBe('false');
    release(400, 400);
    expect(floatingPanes()).toEqual([['x'], ['y']]);
    expect(dockedPanes()).toEqual(['a']);
  });

  it('forgets the chosen zone when it moves on to another stack', async () => {
    await mount(layout(stack('a')));
    grab(0);
    under = () => [stackAt('d:')];
    move(210, 100);
    under = () => [joystickButton('left'), stackAt('d:')];
    move(212, 100);
    expect(joystick().dataset['zone']).toBe('left');
    under = () => [stackAt('f:1')];
    move(520, 100);
    expect(joystick().dataset['zone']).toBeUndefined();
  });

  it('commits no drop when the drag is cancelled over a zone', async () => {
    await mount(layout(stack('a')));
    grab(0);
    under = () => [stackAt('d:')];
    move(210, 100);
    under = () => [joystickButton('center'), stackAt('d:')];
    move(215, 100);
    cancel(215, 100);
    expect(floatingPanes()).toEqual([['x'], ['y']]);
    expect(floatingWrapper(0).dataset['dragging']).toBeUndefined();
  });
});

// ===========================================================================
// Resizing a floating window with the pointer
// ===========================================================================

describe('resizing a floating window with the pointer', () => {
  beforeEach(() => mount({ root: stack('a'), floating: [{ bounds: { ...BOUNDS }, root: stack('x') }] }));

  const resizer = (edge: string) => q(`.dock-floating__resizer--${edge}`)!;

  it('marks the handle as resizing even where pointer capture is unavailable', () => {
    // jsdom has no setPointerCapture. The attribute used to be set inside the
    // same try, so it was lost wherever capture threw.
    resizer('right').dispatchEvent(pointer('pointerdown', 420, 150));
    expect(resizer('right').dataset['resizing']).toBe('true');
  });

  it('widens the window by the pointer delta when the right edge is dragged', () => {
    resizer('right').dispatchEvent(pointer('pointerdown', 420, 150));
    move(470, 150);
    expect(floatingWrapper(0).style.width).toBe('370px');
    expect(floatingWrapper(0).style.left).toBe('100px');
  });

  it('moves the origin with the edge when the top-left corner is dragged', () => {
    resizer('top-left').dispatchEvent(pointer('pointerdown', 100, 80));
    move(80, 50);
    const style = floatingWrapper(0).style;
    expect([style.left, style.top, style.width, style.height]).toEqual(['80px', '50px', '340px', '230px']);
  });

  it('commits the new bounds and clears the resizing state on release', () => {
    resizer('bottom').dispatchEvent(pointer('pointerdown', 250, 280));
    move(250, 330);
    release(250, 330);
    expect(resizer('bottom').dataset['resizing']).toBeUndefined();
    expect(layoutEvents.at(-1)?.floating[0].bounds).toMatchObject({ height: 250 });
    expect(hostCanWriteLayout()).toBe(true);
  });

  it('ignores a different pointer', () => {
    resizer('right').dispatchEvent(pointer('pointerdown', 420, 150));
    move(600, 150, 9);
    release(600, 150, 9);
    expect(floatingWrapper(0).style.width).toBe('320px');
    expect(resizer('right').dataset['resizing']).toBe('true');
  });

  it('ends on pointercancel, keeping the size reached so far', () => {
    resizer('right').dispatchEvent(pointer('pointerdown', 420, 150));
    move(440, 150);
    cancel(440, 150);
    expect(resizer('right').dataset['resizing']).toBeUndefined();
    expect(dock.layout.floating[0].bounds.width).toBe(340);
  });

  it('brings the window it resizes to the front', async () => {
    await mount({
      root: stack('a'),
      floating: [
        { bounds: { ...BOUNDS }, root: stack('x') },
        { bounds: { ...BOUNDS }, root: stack('y'), zIndex: 30 },
      ],
    });
    q('.dock-floating[data-path="f:0"] .dock-floating__resizer--right')!.dispatchEvent(pointer('pointerdown', 420, 150));
    expect(Number(floatingWrapper(0).style.zIndex)).toBeGreaterThan(30);
  });
});

// ===========================================================================
// Corner (intersection) resize
// ===========================================================================

describe('dragging an intersection handle', () => {
  const LAYOUT = split('horizontal', [stack('a'), split('vertical', [stack('b'), stack('c')], [0.7, 0.3])], [0.6, 0.4]);

  let handle: HTMLElement;
  const sizes = () => {
    const root = dock.layout.root as DockSplitNode;
    return [root.sizes, (root.children[1] as DockSplitNode).sizes];
  };

  beforeEach(async () => {
    await mount(LAYOUT);
    dock.renderIntersectionHandles();
    handle = q('.dock-intersection-handle')!;
  });

  it('renders one handle where the two splitters cross', () => {
    expect(handle).not.toBeNull();
    expect(JSON.parse(handle.dataset['pairs']!)).toEqual([
      { h: { pathStr: 'd:1', index: 0 }, v: { pathStr: 'd:', index: 0 } },
    ]);
  });

  it('marks the handle as resizing even where pointer capture is unavailable', () => {
    handle.dispatchEvent(pointer('pointerdown', 50, 50));
    expect(handle.dataset['resizing']).toBe('true');
    expect(handle.classList.contains('hovering')).toBe(true);
  });

  it('keeps the stored split weights when the panels have no measured size', () => {
    // Normalizing a zero pixel total used to overwrite both splits' sizes
    // with [], erasing the layout on the first corner move.
    const before = sizes();
    handle.dispatchEvent(pointer('pointerdown', 50, 50));
    move(90, 80);
    expect(sizes()).toEqual(before);
  });

  it('refuses host layout writes while held and accepts them once released', () => {
    handle.dispatchEvent(pointer('pointerdown', 50, 50));
    expect(hostCanWriteLayout()).toBe(false);
    release(50, 50);
    expect(handle.dataset['resizing']).toBe('false');
    expect(hostCanWriteLayout()).toBe(true);
  });

  it('is not ended by a different pointer', () => {
    handle.dispatchEvent(pointer('pointerdown', 50, 50));
    release(50, 50, 4);
    expect(handle.dataset['resizing']).toBe('true');
  });

  it('ends on pointercancel', () => {
    handle.dispatchEvent(pointer('pointerdown', 50, 50));
    cancel(50, 50);
    expect(handle.dataset['resizing']).toBe('false');
    expect(hostCanWriteLayout()).toBe(true);
  });

  it('keeps the held handle alive when the handles re-render mid-drag', () => {
    handle.dispatchEvent(pointer('pointerdown', 50, 50));
    dock.renderIntersectionHandles();
    expect(q('.dock-intersection-handle')).toBe(handle);
    expect(handle.isConnected).toBe(true);
  });

  it('does nothing when the splitters it names are gone', () => {
    handle.dataset['pairs'] = JSON.stringify([{ h: { pathStr: '7', index: 0 }, v: { pathStr: '8', index: 0 } }]);
    handle.dispatchEvent(pointer('pointerdown', 50, 50));
    expect(handle.dataset['resizing']).toBeUndefined();
    expect(hostCanWriteLayout()).toBe(true);
  });

  it('treats a malformed handle dataset as nothing to resize', () => {
    handle.dataset['pairs'] = '{not json';
    delete handle.dataset['key'];
    expect(() => handle.dispatchEvent(pointer('pointerdown', 50, 50))).not.toThrow();
    expect(handle.dataset['resizing']).toBeUndefined();
  });

  it('survives a handle re-render mid-drag when only one of its splitters resolved', () => {
    // The re-render fast path read both axes unconditionally and threw when
    // one of them had not resolved at pointerdown.
    handle.dataset['pairs'] = JSON.stringify([{ h: { pathStr: 'd:1', index: 0 }, v: { pathStr: 'd:9', index: 0 } }]);
    handle.dispatchEvent(pointer('pointerdown', 50, 50));
    expect(handle.dataset['resizing']).toBe('true');
    expect(() => dock.renderIntersectionHandles()).not.toThrow();
    move(60, 70);
    release(60, 70);
    expect(hostCanWriteLayout()).toBe(true);
  });

  it('equalizes both splits on double-click and restores them on the next', () => {
    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    const [outer, inner] = sizes();
    expect(outer![0]).toBeCloseTo(0.5, 10);
    expect(inner![0]).toBeCloseTo(0.5, 10);

    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    expect(sizes()).toEqual([[0.6, 0.4], [0.7, 0.3]]);
  });
});

describe('an intersection inside a floating window', () => {
  // The same split shape docked and floating, so both layers render splitters
  // at the same tree positions. A splitter used to be stamped with its tree
  // segments only ("", "1"), which made the two layers' splitters
  // indistinguishable: every floating intersection resolved to — and resized
  // — the DOCKED split at the same position.
  const shape = (a: string, b: string, c: string, outer: number[], inner: number[]) =>
    split('horizontal', [stack(a), split('vertical', [stack(b), stack(c)], inner)], outer);

  type IntersectionInternals = DockInternals & {
    onIntersectionDoubleClick: (event: MouseEvent, handle: HTMLElement) => void;
    onIntersectionKeyDown: (event: KeyboardEvent, handle: HTMLElement) => void;
  };

  let floatingHandle: HTMLElement;
  let floatingOuter: HTMLElement;

  beforeEach(async () => {
    await mount({
      root: shape('a', 'b', 'c', [0.6, 0.4], [0.7, 0.3]),
      floating: [{ bounds: BOUNDS, root: shape('x', 'y', 'z', [0.9, 0.1], [0.8, 0.2]) }],
    });
    const [outer, inner] = Array.from(dock.shadowRoot.querySelectorAll<HTMLElement>('.dock-floating .dock-split'));
    floatingOuter = outer;
    // The pairs a handle over the floating crossing carries: each splitter's
    // own stamped path, exactly as renderIntersectionHandles reads them.
    floatingHandle = document.createElement('div');
    floatingHandle.dataset['pairs'] = JSON.stringify([
      { h: { pathStr: inner.dataset['path'], index: 0 }, v: { pathStr: outer.dataset['path'], index: 0 } },
    ]);
  });

  it('gives floating splitters a path distinct from the docked ones', () => {
    const paths = (selector: string) =>
      Array.from(dock.shadowRoot.querySelectorAll<HTMLElement>(selector)).map((el) => el.dataset['path']);
    expect(paths('.dock-docked .dock-split')).toEqual(['d:', 'd:1']);
    expect(paths('.dock-floating .dock-split')).toEqual(['f:0', 'f:0/1']);
  });

  it('equalizes the floating window\'s splits on double-click and leaves the docked ones alone', () => {
    (dock as IntersectionInternals).onIntersectionDoubleClick(new MouseEvent('dblclick'), floatingHandle);
    const floatingRoot = dock.layout.floating[0].root as DockSplitNode;
    expect(floatingRoot.sizes![0]).toBeCloseTo(0.5, 10);
    expect((floatingRoot.children[1] as DockSplitNode).sizes![0]).toBeCloseTo(0.5, 10);
    const dockedRoot = dock.layout.root as DockSplitNode;
    expect(dockedRoot.sizes).toEqual([0.6, 0.4]);
    expect((dockedRoot.children[1] as DockSplitNode).sizes).toEqual([0.7, 0.3]);
  });

  it('sends keyboard resizes to the floating splitter under the handle', () => {
    const resize = vi.fn();
    (floatingOuter as unknown as { resizeDividerBy: unknown }).resizeDividerBy = resize;
    (dock as IntersectionInternals).onIntersectionKeyDown(
      new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }),
      floatingHandle,
    );
    expect(resize).toHaveBeenCalledWith(0, 'ArrowRight', false);
  });
});

// ===========================================================================
// Arming keyboard move mode with M
// ===========================================================================

describe('pressing M on a focused tab', () => {
  beforeEach(() =>
    mount({ root: split('horizontal', [stack('a', 'b'), stack('c')]), titles: { a: 'Alpha' } }),
  );

  /** Focus the real role=tab button mp-tab-control renders for a pane. */
  async function focusTab(pane: string): Promise<HTMLElement> {
    const header = tab(pane);
    const control = header.closest('mp-tab-control') as HTMLElement & { updateComplete: Promise<unknown> };
    await control.updateComplete;
    const button = control.shadowRoot!.querySelector<HTMLElement>(`[id="${header.dataset['tabId']}-header-button"]`)!;
    button.focus();
    return button;
  }

  const keydown = (target: EventTarget, init: KeyboardEventInit) => {
    const event = new KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };

  const live = () => q('[role="status"]')!.textContent ?? '';

  it('arms move mode for that pane and announces the keymap', async () => {
    const button = await focusTab('a');
    const event = keydown(button, { key: 'm' });
    await settle();
    expect(event.defaultPrevented).toBe(true);
    expect(live()).toContain('Move mode for pane Alpha');
  });

  it('then commits the next command key against the armed pane', async () => {
    const button = await focusTab('a');
    keydown(button, { key: 'M', shiftKey: true });
    keydown(button, { key: 'f' });
    expect(floatingPanes()).toEqual([['a']]);
    expect(dockedPanes()).toEqual(['b', 'c']);
  });

  it('does not arm on a modified M, which belongs to someone else', async () => {
    const button = await focusTab('a');
    const event = keydown(button, { key: 'm', ctrlKey: true });
    keydown(button, { key: 'f' });
    expect(event.defaultPrevented).toBe(false);
    expect(floatingPanes()).toEqual([]);
  });

  it('does not arm when the focused element is not a tab', async () => {
    const other = joystickButton('center');
    other.focus();
    const event = keydown(other, { key: 'm' });
    expect(event.defaultPrevented).toBe(false);
    keydown(other, { key: 'f' });
    expect(floatingPanes()).toEqual([]);
  });

  it('does not arm when nothing inside the dock has focus', () => {
    const event = keydown(q('.dock-root')!, { key: 'm' });
    expect(event.defaultPrevented).toBe(false);
  });
});
