import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import './mint-dock-manager.element';
import type { MintDockManagerElement } from './mint-dock-manager.element';
import type { DockLayoutNode } from '../types/dock-layout';

/**
 * The dock's handler layer: keyboard resizing, drop-target resolution, pane
 * activation and the render-integrity guard.
 *
 * These were filed as permanently uncovered alongside the genuinely
 * geometry-bound drag code, but none of them depends on a measured rect. Some
 * touch one — `showDropIndicator` reads `getBoundingClientRect()` to position
 * the indicator — and that is the distinction this file exists to make: the
 * assertions below are on `dataset` flags, layout-tree state and dispatched
 * events, never on a coordinate. Nothing here fakes a rect (R3), and nothing
 * here needs to.
 *
 * The two keyboard handlers are also the APG keyboard equivalents for the
 * pointer resize gestures, so these are accessibility guarantees as much as
 * coverage.
 */

const stack = (...panes: string[]): DockLayoutNode => ({
  kind: 'stack',
  panes,
  activePane: panes[0],
});

const split = (
  direction: 'horizontal' | 'vertical',
  children: DockLayoutNode[],
  sizes?: number[],
): DockLayoutNode => ({ kind: 'split', direction, children, sizes });

type ResizeEdges = { horizontal: 'start' | 'end' | 'none'; vertical: 'start' | 'end' | 'none' };

/** Private surface these specs drive directly, as the sibling dock specs do. */
type DockInternals = MintDockManagerElement & {
  shadowRoot: ShadowRoot;
  floatingLayerEl: HTMLElement;
  dropJoystick: HTMLElement;
  dropIndicator: HTMLElement;
  dropJoystickTarget: HTMLElement | null;
  debugLayoutIntegrity: boolean;
  rootLayout: DockLayoutNode | null;
  onIntersectionKeyDown: (event: KeyboardEvent, handle: HTMLElement) => void;
  onFloatingResizeKeydown: (
    event: KeyboardEvent,
    index: number,
    wrapper: HTMLElement,
    resizer: HTMLElement,
    edges: ResizeEdges,
  ) => void;
  findDropZoneInTargets: (targets: Iterable<EventTarget>) => string | null;
  findStackInTargets: (targets: Iterable<EventTarget>) => HTMLElement | null;
  extractDropZoneFromEvent: (event: Event) => string | null;
  computeDropZone: (
    stack: HTMLElement,
    point: { clientX: number; clientY: number } | null,
    zoneHint?: string | null,
  ) => string | null;
  showDropIndicator: (stack: HTMLElement, zone: string | null) => void;
  activatePane: (stack: HTMLElement, paneName: string, path: unknown) => void;
  updateFloatingWindowTitle: (index: number) => void;
  verifyProjectionSlots: () => void;
};

let dock: DockInternals;

beforeEach(() => {
  dock = document.createElement('mint-dock-manager') as DockInternals;
  document.body.appendChild(dock);
});

afterEach(() => {
  dock.remove();
  vi.restoreAllMocks();
});

const settle = () => (dock as unknown as { updateComplete: Promise<unknown> }).updateComplete;

function key(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', { cancelable: true, ...init });
}

/**
 * A splitter stand-in the element can find by path, carrying a spy for the
 * command the handler delegates to. A real `<mp-splitter>` would render its own
 * shadow root, which has nothing to do with the contract under test.
 */
function stubSplitter(pathSegments: string, resize = vi.fn()): { el: HTMLElement; resize: ReturnType<typeof vi.fn> } {
  const el = document.createElement('div');
  el.classList.add('dock-split');
  el.dataset['path'] = pathSegments;
  (el as unknown as { resizeDividerBy: unknown }).resizeDividerBy = resize;
  dock.shadowRoot.appendChild(el);
  return { el, resize };
}

function handleWithPairs(pairs: unknown): HTMLElement {
  const handle = document.createElement('div');
  if (pairs !== undefined) handle.dataset['pairs'] = typeof pairs === 'string' ? pairs : JSON.stringify(pairs);
  return handle;
}

const crossing = (hPath: string, hIndex: number, vPath: string, vIndex: number) => [
  { h: { pathStr: hPath, index: hIndex }, v: { pathStr: vPath, index: vIndex } },
];

// ===========================================================================
// onIntersectionKeyDown — the keyboard equivalent of dragging an intersection
// ===========================================================================

describe('onIntersectionKeyDown', () => {
  it('drives the vertical divider for ArrowLeft/ArrowRight', () => {
    const { resize } = stubSplitter('1');
    const handle = handleWithPairs(crossing('0', 3, '1', 2));

    dock.onIntersectionKeyDown(key({ key: 'ArrowRight' }), handle);

    // pairs[0].v — path '1', divider index 2.
    expect(resize).toHaveBeenCalledWith(2, 'ArrowRight', false);
  });

  it('drives the horizontal divider for ArrowUp/ArrowDown', () => {
    const { resize } = stubSplitter('0');
    const handle = handleWithPairs(crossing('0', 3, '1', 2));

    dock.onIntersectionKeyDown(key({ key: 'ArrowUp' }), handle);

    expect(resize).toHaveBeenCalledWith(3, 'ArrowUp', false);
  });

  it.each(['Home', 'End'])(
    'sends %s to the vertical divider, matching the APG convention',
    (k) => {
      const { resize } = stubSplitter('1');
      dock.onIntersectionKeyDown(key({ key: k }), handleWithPairs(crossing('0', 3, '1', 2)));
      expect(resize).toHaveBeenCalledWith(2, k, false);
    },
  );

  it('passes the fine-adjustment flag when Shift is held', () => {
    const { resize } = stubSplitter('1');
    dock.onIntersectionKeyDown(
      key({ key: 'ArrowRight', shiftKey: true }),
      handleWithPairs(crossing('0', 3, '1', 2)),
    );
    expect(resize).toHaveBeenCalledWith(2, 'ArrowRight', true);
  });

  it('claims the key so the browser does not also scroll', () => {
    stubSplitter('1');
    const event = key({ key: 'ArrowRight' });
    dock.onIntersectionKeyDown(event, handleWithPairs(crossing('0', 3, '1', 2)));
    expect(event.defaultPrevented).toBe(true);
  });

  it.each(['Tab', 'Enter', ' ', 'a', 'Escape'])('ignores %s entirely', (k) => {
    const { resize } = stubSplitter('1');
    const event = key({ key: k });

    dock.onIntersectionKeyDown(event, handleWithPairs(crossing('0', 3, '1', 2)));

    expect(resize).not.toHaveBeenCalled();
    // An unhandled key must stay unhandled — swallowing Tab would trap focus.
    expect(event.defaultPrevented).toBe(false);
  });

  it('does nothing when the handle carries no pairs', () => {
    const { resize } = stubSplitter('1');
    dock.onIntersectionKeyDown(key({ key: 'ArrowRight' }), handleWithPairs(undefined));
    expect(resize).not.toHaveBeenCalled();
  });

  it('does nothing, and does not throw, on malformed pairs JSON', () => {
    const { resize } = stubSplitter('1');
    expect(() =>
      dock.onIntersectionKeyDown(key({ key: 'ArrowRight' }), handleWithPairs('{not json')),
    ).not.toThrow();
    expect(resize).not.toHaveBeenCalled();
  });

  it('does nothing when the pairs array is empty', () => {
    const { resize } = stubSplitter('1');
    dock.onIntersectionKeyDown(key({ key: 'ArrowRight' }), handleWithPairs([]));
    expect(resize).not.toHaveBeenCalled();
  });

  it('is inert when the path names no splitter in the tree', () => {
    // A handle left over from a previous layout: the lookup misses and the
    // gesture does nothing rather than throwing.
    const handle = handleWithPairs(crossing('0', 3, '9/9', 2));
    expect(() => dock.onIntersectionKeyDown(key({ key: 'ArrowRight' }), handle)).not.toThrow();
  });
});

// ===========================================================================
// onFloatingResizeKeydown — keyboard resize of a floating window
// ===========================================================================

describe('onFloatingResizeKeydown', () => {
  const edges: ResizeEdges = { horizontal: 'end', vertical: 'end' };

  beforeEach(async () => {
    dock.layout = {
      root: stack('main'),
      floating: [
        {
          id: 'w0',
          bounds: { left: 10, top: 20, width: 320, height: 240 },
          zIndex: 1,
          root: stack('float'),
        },
      ],
    } as never;
    await settle();
  });

  const invoke = (event: KeyboardEvent, index = 0, e: ResizeEdges = edges) =>
    dock.onFloatingResizeKeydown(
      event,
      index,
      document.createElement('div'),
      document.createElement('div'),
      e,
    );

  it('acts on an arrow key along an edge that can move', () => {
    const changed = vi.fn();
    dock.addEventListener('dock-layout-changed', changed);

    const event = key({ key: 'ArrowRight' });
    invoke(event);

    expect(event.defaultPrevented).toBe(true);
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it.each(['altKey', 'ctrlKey', 'metaKey'])(
    'defers to the browser when %s is held',
    (modifier) => {
      const changed = vi.fn();
      dock.addEventListener('dock-layout-changed', changed);

      const event = key({ key: 'ArrowRight', [modifier]: true });
      invoke(event);

      expect(changed).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    },
  );

  it.each(['Tab', 'Enter', 'Home', 'x'])('ignores the non-arrow key %s', (k) => {
    const changed = vi.fn();
    dock.addEventListener('dock-layout-changed', changed);
    invoke(key({ key: k }));
    expect(changed).not.toHaveBeenCalled();
  });

  it('refuses a horizontal arrow when this resizer owns no horizontal edge', () => {
    // A top/bottom-edge resizer must not move the window sideways.
    const changed = vi.fn();
    dock.addEventListener('dock-layout-changed', changed);

    const event = key({ key: 'ArrowLeft' });
    invoke(event, 0, { horizontal: 'none', vertical: 'end' });

    expect(changed).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('refuses a vertical arrow when this resizer owns no vertical edge', () => {
    const changed = vi.fn();
    dock.addEventListener('dock-layout-changed', changed);

    invoke(key({ key: 'ArrowDown' }), 0, { horizontal: 'end', vertical: 'none' });

    expect(changed).not.toHaveBeenCalled();
  });

  it('does nothing for a window index that does not exist', () => {
    const changed = vi.fn();
    dock.addEventListener('dock-layout-changed', changed);
    invoke(key({ key: 'ArrowRight' }), 7);
    expect(changed).not.toHaveBeenCalled();
  });

  it('stops the key from also reaching the pane behind the resizer', () => {
    const event = key({ key: 'ArrowRight' });
    const stopped = vi.spyOn(event, 'stopPropagation');
    invoke(event);
    expect(stopped).toHaveBeenCalled();
  });
});

// ===========================================================================
// Drop-target resolution — pure searches over event targets
// ===========================================================================

function joystickButton(zone: string): HTMLElement {
  const el = document.createElement('div');
  el.classList.add('dock-drop-joystick__button');
  el.dataset['zone'] = zone;
  return el;
}

describe('findDropZoneInTargets', () => {
  it('returns the zone of the first joystick button in the path', () => {
    const targets = [document.createElement('span'), joystickButton('left'), joystickButton('right')];
    expect(dock.findDropZoneInTargets(targets)).toBe('left');
  });

  it('ignores elements that are not joystick buttons', () => {
    expect(dock.findDropZoneInTargets([document.createElement('div')])).toBeNull();
  });

  it('ignores a joystick button carrying an unrecognised zone', () => {
    expect(dock.findDropZoneInTargets([joystickButton('sideways')])).toBeNull();
  });

  it('ignores a button with no zone at all', () => {
    const el = document.createElement('div');
    el.classList.add('dock-drop-joystick__button');
    expect(dock.findDropZoneInTargets([el])).toBeNull();
  });

  it('skips non-element entries, which composedPath legitimately contains', () => {
    // A real composedPath ends with the document and the window.
    expect(dock.findDropZoneInTargets([document, window, joystickButton('top')])).toBe('top');
  });

  it('returns null for an empty path', () => {
    expect(dock.findDropZoneInTargets([])).toBeNull();
  });
});

describe('findStackInTargets', () => {
  const dockStack = () => {
    const el = document.createElement('div');
    el.classList.add('dock-stack');
    return el;
  };

  it('finds a stack directly in the path', () => {
    const target = dockStack();
    expect(dock.findStackInTargets([document.createElement('span'), target])).toBe(target);
  });

  it('resolves any joystick part back to the stack the joystick is serving', () => {
    // The joystick floats above the stack, so the event path contains the
    // joystick and not the stack it belongs to.
    const served = dockStack();
    dock.dropJoystickTarget = served;

    for (const cls of [
      'dock-drop-joystick',
      'dock-drop-joystick__button',
      'dock-drop-joystick__spacer',
    ]) {
      const part = document.createElement('div');
      part.classList.add(cls);
      expect(dock.findStackInTargets([part])).toBe(served);
    }
  });

  it('does not resolve a joystick part when no stack is being served', () => {
    dock.dropJoystickTarget = null;
    const part = document.createElement('div');
    part.classList.add('dock-drop-joystick__button');
    expect(dock.findStackInTargets([part])).toBeNull();
  });

  it('prefers the first match in path order', () => {
    const first = dockStack();
    const second = dockStack();
    expect(dock.findStackInTargets([first, second])).toBe(first);
  });

  it('returns null when the path holds nothing relevant', () => {
    expect(dock.findStackInTargets([document.createElement('p'), document])).toBeNull();
  });
});

describe('extractDropZoneFromEvent', () => {
  it('reads the zone out of the composed path', () => {
    const event = new Event('drop') as Event & { composedPath: () => EventTarget[] };
    event.composedPath = () => [joystickButton('bottom')];
    expect(dock.extractDropZoneFromEvent(event)).toBe('bottom');
  });

  it('returns null when the composed path holds no joystick button', () => {
    const event = new Event('drop') as Event & { composedPath: () => EventTarget[] };
    event.composedPath = () => [document.createElement('div')];
    expect(dock.extractDropZoneFromEvent(event)).toBeNull();
  });

  it('tolerates an event with no composedPath', () => {
    // Synthetic events from older test doubles and some polyfills lack it.
    const event = { type: 'drop' } as unknown as Event;
    expect(dock.extractDropZoneFromEvent(event)).toBeNull();
  });

  it('returns null for a falsy event rather than throwing', () => {
    expect(dock.extractDropZoneFromEvent(null as unknown as Event)).toBeNull();
  });
});

describe('computeDropZone', () => {
  const dockStack = () => {
    const el = document.createElement('div');
    el.classList.add('dock-stack');
    return el;
  };

  it('honours an explicit zone hint without consulting anything else', () => {
    expect(dock.computeDropZone(dockStack(), null, 'left')).toBe('left');
  });

  it('ignores a hint that is not a real zone', () => {
    expect(dock.computeDropZone(dockStack(), null, 'diagonal')).toBeNull();
  });

  it('stays on the last zone while the pointer is over the joystick', async () => {
    // Browsers report transient coordinates and targets mid-drag; without the
    // sticky branch the highlighted zone flickers off and back on.
    await settle();
    const target = dockStack();
    dock.dropJoystickTarget = target;
    dock.dropJoystick.dataset['zone'] = 'right';

    expect(dock.computeDropZone(target, null, null)).toBe('right');
  });

  it('clears the zone when the joystick is being hovered but holds no zone', async () => {
    await settle();
    const target = dockStack();
    dock.dropJoystickTarget = target;
    delete dock.dropJoystick.dataset['zone'];

    expect(dock.computeDropZone(target, null, null)).toBeNull();
  });

  it('does not go sticky for a stack other than the one the joystick serves', async () => {
    await settle();
    dock.dropJoystickTarget = dockStack();
    dock.dropJoystick.dataset['zone'] = 'right';

    expect(dock.computeDropZone(dockStack(), null, null)).toBeNull();
  });

  it('ignores a point with non-finite coordinates', async () => {
    await settle();
    expect(dock.computeDropZone(dockStack(), { clientX: Number.NaN, clientY: 0 }, null)).toBeNull();
  });
});

// ===========================================================================
// showDropIndicator — visibility and layering, never position
// ===========================================================================

describe('showDropIndicator', () => {
  function stackAt(path: string): HTMLElement {
    const el = document.createElement('div');
    el.classList.add('dock-stack');
    el.dataset['path'] = path;
    return el;
  }

  beforeEach(async () => {
    dock.layout = split('horizontal', [stack('a'), stack('b')]) as never;
    await settle();
  });

  it('marks the indicator visible for a zone', () => {
    dock.showDropIndicator(stackAt('0'), 'left');
    expect(dock.dropIndicator.dataset['visible']).toBe('true');
  });

  it('hides the indicator when there is no zone, but still shows the joystick', () => {
    // Hovering a stack offers the joystick; only choosing a zone previews it.
    dock.showDropIndicator(stackAt('0'), null);
    expect(dock.dropIndicator.dataset['visible']).toBe('false');
    expect(dock.dropJoystick.dataset['visible']).toBe('true');
  });

  it.each(['left', 'right', 'top', 'bottom', 'center'])(
    'accepts the %s zone and reveals the indicator',
    (zone) => {
      dock.showDropIndicator(stackAt('0'), zone);
      expect(dock.dropIndicator.dataset['visible']).toBe('true');
    },
  );

  it('records which stack the joystick belongs to', () => {
    dock.showDropIndicator(stackAt('1'), 'left');
    expect(dock.dropJoystick.dataset['path']).toBe('1');
  });

  it('unhides the joystick, which starts hidden', () => {
    dock.dropJoystick.hidden = true;
    dock.showDropIndicator(stackAt('0'), 'left');
    expect(dock.dropJoystick.hidden).toBe(false);
  });

  it('layers the joystick above the indicator', () => {
    dock.showDropIndicator(stackAt('0'), 'left');
    expect(Number(dock.dropJoystick.style.zIndex)).toBeGreaterThan(
      Number(dock.dropIndicator.style.zIndex),
    );
  });

  it('shows nothing over the pane being dragged, or its ancestors', async () => {
    // Dropping a node into itself is meaningless, so it must not even be
    // offered — the guard is the same one that refuses the drop.
    (dock as unknown as { dragState: unknown }).dragState = {
      sourcePath: { type: 'docked', segments: [0, 1] },
    };
    dock.dropIndicator.dataset['visible'] = 'untouched';

    dock.showDropIndicator(stackAt('0'), 'left');

    expect(dock.dropIndicator.dataset['visible']).toBe('untouched');
  });

  it('still offers a sibling of the dragged pane', () => {
    (dock as unknown as { dragState: unknown }).dragState = {
      sourcePath: { type: 'docked', segments: [0] },
    };
    dock.showDropIndicator(stackAt('1'), 'left');
    expect(dock.dropIndicator.dataset['visible']).toBe('true');
  });
});

// ===========================================================================
// Pane activation, floating titles, and the render-integrity guard
// ===========================================================================

describe('activatePane', () => {
  beforeEach(async () => {
    dock.layout = stack('a', 'b') as never;
    await settle();
  });

  it('records the active pane on the element and in the tree', () => {
    const el = document.createElement('div');
    el.classList.add('dock-stack');

    dock.activatePane(el, 'b', { type: 'docked', segments: [] });

    expect(el.dataset['activePane']).toBe('b');
    expect(dock.layout.root).toMatchObject({ activePane: 'b' });
  });

  it('announces the change so a two-way binding sees it', () => {
    const changed = vi.fn();
    dock.addEventListener('dock-layout-changed', changed);

    dock.activatePane(document.createElement('div'), 'b', { type: 'docked', segments: [] });

    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('marks the element even when the path resolves to nothing', () => {
    // The DOM write happens first and unconditionally; only the tree update is
    // guarded. A stale path must not leave the strip showing the wrong tab.
    const el = document.createElement('div');
    dock.activatePane(el, 'b', { type: 'docked', segments: [9, 9] });
    expect(el.dataset['activePane']).toBe('b');
  });
});

describe('updateFloatingWindowTitle', () => {
  beforeEach(async () => {
    dock.layout = {
      root: stack('main'),
      floating: [
        {
          id: 'w0',
          bounds: { left: 0, top: 0, width: 320, height: 240 },
          zIndex: 1,
          root: stack('alpha', 'beta'),
          activePane: 'alpha',
        },
      ],
    } as never;
    await settle();
  });

  const titleEl = () => dock.floatingLayerEl.querySelector<HTMLElement>('.dock-floating__title');

  it('names the window after its active pane', () => {
    dock.updateFloatingWindowTitle(0);
    expect(titleEl()?.textContent).toBe('alpha');
  });

  it('follows the active pane when it changes', () => {
    (dock as unknown as { floatingLayouts: Array<{ activePane: string }> })
      .floatingLayouts[0].activePane = 'beta';

    dock.updateFloatingWindowTitle(0);

    expect(titleEl()?.textContent).toBe('beta');
  });

  it('prefers a registered display title over the raw pane name', () => {
    (dock as unknown as { titles: Record<string, string> }).titles = { alpha: 'Properties' };
    dock.updateFloatingWindowTitle(0);
    expect(titleEl()?.textContent).toBe('Properties');
  });

  it('does nothing for a window index that does not exist', () => {
    const before = titleEl()?.textContent;
    expect(() => dock.updateFloatingWindowTitle(7)).not.toThrow();
    expect(titleEl()?.textContent).toBe(before);
  });
});

describe('verifyProjectionSlots', () => {
  it('does nothing at all unless the debug attribute is on', async () => {
    dock.layout = stack('a') as never;
    await settle();
    dock.debugLayoutIntegrity = false;
    dock.rootLayout = stack('never-rendered') as never;

    expect(() => dock.verifyProjectionSlots()).not.toThrow();
  });

  it('passes when every pane in the tree has a slot', async () => {
    dock.setAttribute('debug-layout-integrity', '');
    dock.layout = split('horizontal', [stack('a'), stack('b')]) as never;
    await settle();

    expect(() => dock.verifyProjectionSlots()).not.toThrow();
  });

  it('throws, naming the pane, when the tree holds one the renderer never drew', async () => {
    // The guard exists to turn a silent "pane vanished" into a loud failure
    // during development, so the message has to identify which one.
    dock.setAttribute('debug-layout-integrity', '');
    dock.layout = stack('a') as never;
    await settle();
    dock.rootLayout = stack('a', 'ghost') as never;

    expect(() => dock.verifyProjectionSlots()).toThrow(/ghost/);
  });

  it('checks floating windows too, not only the docked tree', async () => {
    dock.setAttribute('debug-layout-integrity', '');
    dock.layout = stack('a') as never;
    await settle();
    (dock as unknown as { floatingLayouts: unknown[] }).floatingLayouts = [
      { id: 'w', bounds: { left: 0, top: 0, width: 1, height: 1 }, zIndex: 1, root: stack('phantom') },
    ];

    expect(() => dock.verifyProjectionSlots()).toThrow(/phantom/);
  });
});
