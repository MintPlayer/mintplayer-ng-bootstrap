import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './mint-dock-manager.element';
import type { MintDockManagerElement } from './mint-dock-manager.element';

const HOST_LEFT = 0;
const HOST_TOP = 0;
const HOST_WIDTH = 1000;
const HOST_HEIGHT = 600;

const TAB_LEFT = 80;
const TAB_TOP = 40;
const TAB_WIDTH = 120;
const TAB_HEIGHT = 32;

function makeRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

function makePointerEvent(
  type: string,
  init: {
    clientX: number;
    clientY: number;
    pointerId?: number;
    offsetX?: number;
    offsetY?: number;
    button?: number;
    buttons?: number;
    pointerType?: 'mouse' | 'touch' | 'pen';
  },
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    composed: true,
    cancelable: true,
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? 'mouse',
    isPrimary: true,
    button: init.button ?? 0,
    buttons: init.buttons ?? 1,
    clientX: init.clientX,
    clientY: init.clientY,
  });
}

function nextRaf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

describe('mint-dock-manager — drag-to-detach follows the cursor mid-gesture', () => {
  let dock: MintDockManagerElement;

  beforeEach(async () => {
    dock = document.createElement('mint-dock-manager') as MintDockManagerElement;
    document.body.appendChild(dock);

    // jsdom returns zero rects; mock the host bounds so position math works.
    dock.getBoundingClientRect = () => makeRect(HOST_LEFT, HOST_TOP, HOST_WIDTH, HOST_HEIGHT);

    // Single-pane layout: dragging Panel4's tab triggers immediate float-conversion
    // because the source stack would be empty after detach.
    dock.layout = {
      root: { kind: 'stack', panes: ['Panel4'], activePane: 'Panel4' },
      titles: { Panel4: 'Panel 4' },
      floating: [],
    } as never;

    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    // jsdom ShadowRoot has no elementsFromPoint; the dock calls it from
    // findStackAtPoint while updating drop targets mid-drag. Stub to no-op
    // so the drag-follow logic can run without exploding.
    if (dock.shadowRoot) {
      (dock.shadowRoot as unknown as { elementsFromPoint: (x: number, y: number) => Element[] }).elementsFromPoint =
        () => [];
    }
  });

  afterEach(() => {
    dock.remove();
  });

  it('renders the dragged tab header in the dock shadow root', () => {
    const headerSpan = dock.shadowRoot!.querySelector<HTMLElement>('.dock-tab[data-pane="Panel4"]');
    expect(headerSpan).toBeTruthy();
  });

  it('floating wrapper position updates as the cursor moves after detach', async () => {
    const root = dock.shadowRoot!;
    const headerSpan = root.querySelector<HTMLElement>('.dock-tab[data-pane="Panel4"]');
    expect(headerSpan).toBeTruthy();

    // Mock the tab's geometry — the dock reads getBoundingClientRect to capture
    // the source-header bounds for the threshold check.
    headerSpan!.getBoundingClientRect = () => makeRect(TAB_LEFT, TAB_TOP, TAB_WIDTH, TAB_HEIGHT);
    Object.defineProperty(headerSpan, 'offsetWidth', { value: TAB_WIDTH, configurable: true });
    Object.defineProperty(headerSpan, 'offsetHeight', { value: TAB_HEIGHT, configurable: true });

    // ---- 1) pointerdown captures tab metrics + arms the drag-threshold gesture
    const startX = TAB_LEFT + 20;
    const startY = TAB_TOP + 16;
    headerSpan!.dispatchEvent(makePointerEvent('pointerdown', { clientX: startX, clientY: startY }));

    // ---- 2) pointermove past threshold (5px) promotes the gesture to a real
    //         pane drag → beginPaneDrag → single-pane immediate convert →
    //         floating wrapper appears in .dock-floating-layer.
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: startX + 10, clientY: startY + 10 }));
    await nextRaf();
    const floatingLayer = root.querySelector<HTMLElement>('.dock-floating-layer')!;
    const wrapper = floatingLayer.querySelector<HTMLElement>('.dock-floating');
    expect(wrapper).toBeTruthy();
    const initialLeft = parseFloat(wrapper!.style.left || '0');
    const initialTop = parseFloat(wrapper!.style.top || '0');

    // ---- 3) Continued pointermove must move the wrapper.
    const moveDX = 200;
    const moveDY = 150;
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: startX + 10 + moveDX, clientY: startY + 10 + moveDY }));
    await nextRaf();

    const movedLeft = parseFloat(wrapper!.style.left || '0');
    const movedTop = parseFloat(wrapper!.style.top || '0');

    // The wrapper must have moved in the same direction and magnitude as the cursor.
    expect(movedLeft - initialLeft).toBeCloseTo(moveDX, 0);
    expect(movedTop - initialTop).toBeCloseTo(moveDY, 0);
  });
});

describe('mint-dock-manager — touch long-press arming', () => {
  let dock: MintDockManagerElement;

  beforeEach(async () => {
    // Fake setTimeout / clearTimeout only — leave requestAnimationFrame real
    // so Lit can flush re-renders normally between assertions.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    dock = document.createElement('mint-dock-manager') as MintDockManagerElement;
    document.body.appendChild(dock);

    dock.getBoundingClientRect = () => makeRect(HOST_LEFT, HOST_TOP, HOST_WIDTH, HOST_HEIGHT);

    dock.layout = {
      root: { kind: 'stack', panes: ['Panel4'], activePane: 'Panel4' },
      titles: { Panel4: 'Panel 4' },
      floating: [],
    } as never;

    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    if (dock.shadowRoot) {
      (dock.shadowRoot as unknown as { elementsFromPoint: (x: number, y: number) => Element[] }).elementsFromPoint =
        () => [];
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    dock.remove();
  });

  function getHeaderSpan(): HTMLElement {
    const headerSpan = dock.shadowRoot!.querySelector<HTMLElement>('.dock-tab[data-pane="Panel4"]');
    if (!headerSpan) throw new Error('header span not rendered');
    headerSpan.getBoundingClientRect = () => makeRect(TAB_LEFT, TAB_TOP, TAB_WIDTH, TAB_HEIGHT);
    return headerSpan;
  }

  function getFloatingWrapper(): HTMLElement | null {
    return dock.shadowRoot!.querySelector<HTMLElement>('.dock-floating-layer .dock-floating');
  }

  it('does not arm a drag immediately on touch pointerdown', () => {
    const headerSpan = getHeaderSpan();
    const startX = TAB_LEFT + 20;
    const startY = TAB_TOP + 16;
    headerSpan.dispatchEvent(makePointerEvent('pointerdown', { clientX: startX, clientY: startY, pointerType: 'touch' }));
    // Advance just enough for the press-feedback timer (150 ms) but not the
    // 600 ms long-press timer.
    vi.advanceTimersByTime(200);
    expect(getFloatingWrapper()).toBeNull();
    expect(headerSpan.getAttribute('data-pressing')).toBe('true');
  });

  it('arms the drag after the long-press hold elapses', async () => {
    const headerSpan = getHeaderSpan();
    const startX = TAB_LEFT + 20;
    const startY = TAB_TOP + 16;
    headerSpan.dispatchEvent(makePointerEvent('pointerdown', { clientX: startX, clientY: startY, pointerType: 'touch' }));
    vi.advanceTimersByTime(700);
    await nextRaf();
    expect(getFloatingWrapper()).toBeTruthy();
    // Press-feedback class must be cleared once the drag is armed.
    expect(headerSpan.getAttribute('data-pressing')).toBeNull();
  });

  it('abandons the gesture if the finger moves past slop before the hold elapses', async () => {
    const headerSpan = getHeaderSpan();
    const startX = TAB_LEFT + 20;
    const startY = TAB_TOP + 16;
    headerSpan.dispatchEvent(makePointerEvent('pointerdown', { clientX: startX, clientY: startY, pointerType: 'touch' }));
    // 30 px move — well past the 10 px slop.
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: startX + 30, clientY: startY, pointerType: 'touch' }));
    vi.advanceTimersByTime(700);
    await nextRaf();
    expect(getFloatingWrapper()).toBeNull();
    expect(headerSpan.getAttribute('data-pressing')).toBeNull();
  });

  it('keeps waiting if the finger trembles within slop', async () => {
    const headerSpan = getHeaderSpan();
    const startX = TAB_LEFT + 20;
    const startY = TAB_TOP + 16;
    headerSpan.dispatchEvent(makePointerEvent('pointerdown', { clientX: startX, clientY: startY, pointerType: 'touch' }));
    // 5 px move — within the 10 px slop.
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: startX + 5, clientY: startY, pointerType: 'touch' }));
    vi.advanceTimersByTime(700);
    await nextRaf();
    expect(getFloatingWrapper()).toBeTruthy();
  });

  it('treats a release before the hold elapses as a tap (no drag)', async () => {
    const headerSpan = getHeaderSpan();
    const startX = TAB_LEFT + 20;
    const startY = TAB_TOP + 16;
    headerSpan.dispatchEvent(makePointerEvent('pointerdown', { clientX: startX, clientY: startY, pointerType: 'touch' }));
    vi.advanceTimersByTime(200);
    window.dispatchEvent(makePointerEvent('pointerup', { clientX: startX, clientY: startY, pointerType: 'touch' }));
    vi.advanceTimersByTime(700);
    await nextRaf();
    expect(getFloatingWrapper()).toBeNull();
    expect(headerSpan.getAttribute('data-pressing')).toBeNull();
  });

  it('abandons the gesture on pointercancel before the hold elapses', async () => {
    const headerSpan = getHeaderSpan();
    const startX = TAB_LEFT + 20;
    const startY = TAB_TOP + 16;
    headerSpan.dispatchEvent(makePointerEvent('pointerdown', { clientX: startX, clientY: startY, pointerType: 'touch' }));
    vi.advanceTimersByTime(200);
    window.dispatchEvent(makePointerEvent('pointercancel', { clientX: startX, clientY: startY, pointerType: 'touch' }));
    vi.advanceTimersByTime(700);
    await nextRaf();
    expect(getFloatingWrapper()).toBeNull();
    expect(headerSpan.getAttribute('data-pressing')).toBeNull();
  });

  it('treats pen as mouse — immediate 5 px arming, no hold required', async () => {
    const headerSpan = getHeaderSpan();
    const startX = TAB_LEFT + 20;
    const startY = TAB_TOP + 16;
    headerSpan.dispatchEvent(makePointerEvent('pointerdown', { clientX: startX, clientY: startY, pointerType: 'pen' }));
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: startX + 10, clientY: startY + 10, pointerType: 'pen' }));
    await nextRaf();
    expect(getFloatingWrapper()).toBeTruthy();
  });
});

describe('mint-dock-manager — touch swipe scrolls the tabstrip', () => {
  let dock: MintDockManagerElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    dock = document.createElement('mint-dock-manager') as MintDockManagerElement;
    document.body.appendChild(dock);
    dock.getBoundingClientRect = () => makeRect(HOST_LEFT, HOST_TOP, HOST_WIDTH, HOST_HEIGHT);

    // Multi-pane stack so the strip has several tabs and can overflow.
    dock.layout = {
      root: { kind: 'stack', panes: ['A', 'B', 'C', 'D', 'E'], activePane: 'A' },
      titles: { A: 'Alpha', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo' },
      floating: [],
    } as never;

    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    if (dock.shadowRoot) {
      (dock.shadowRoot as unknown as { elementsFromPoint: (x: number, y: number) => Element[] }).elementsFromPoint =
        () => [];
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    dock.remove();
  });

  function getStripUl(): HTMLElement {
    const stack = dock.shadowRoot!.querySelector('mp-tab-control');
    if (!stack) throw new Error('mp-tab-control not rendered');
    const ul = stack.shadowRoot?.querySelector<HTMLElement>('ul.nav.nav-tabs');
    if (!ul) throw new Error('strip <ul> not rendered');
    // jsdom returns 0 for scrollWidth/clientWidth; mock to force overflow.
    Object.defineProperty(ul, 'scrollWidth', { configurable: true, value: 600 });
    Object.defineProperty(ul, 'clientWidth', { configurable: true, value: 200 });
    return ul;
  }

  function getHeaderSpan(pane: string): HTMLElement {
    const headerSpan = dock.shadowRoot!.querySelector<HTMLElement>(`.dock-tab[data-pane="${pane}"]`);
    if (!headerSpan) throw new Error(`header span for ${pane} not rendered`);
    headerSpan.getBoundingClientRect = () => makeRect(TAB_LEFT, TAB_TOP, TAB_WIDTH, TAB_HEIGHT);
    return headerSpan;
  }

  it('horizontal swipe before the long-press fires drives ul.scrollLeft and does not undock', async () => {
    const ul = getStripUl();
    const headerSpan = getHeaderSpan('A');
    const startX = TAB_LEFT + 20;
    const startY = TAB_TOP + 16;

    headerSpan.dispatchEvent(makePointerEvent('pointerdown', { clientX: startX, clientY: startY, pointerType: 'touch' }));
    // First move: 30 px left, past the 10 px slop. Enters `scrolling`,
    // applies the initial delta to scrollLeft.
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: startX - 30, clientY: startY, pointerType: 'touch' }));
    expect(ul.scrollLeft).toBe(30);
    // Subsequent moves continue to scroll directly.
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: startX - 60, clientY: startY, pointerType: 'touch' }));
    expect(ul.scrollLeft).toBe(60);

    // Long-press timer would fire here in real time — but since we entered
    // `scrolling`, the timer was cleared. No undock.
    vi.advanceTimersByTime(700);
    await nextRaf();
    expect(dock.shadowRoot!.querySelector('.dock-floating-layer .dock-floating')).toBeNull();
  });

  it('vertical swipe past slop abandons — no scroll and no drag', async () => {
    const ul = getStripUl();
    const headerSpan = getHeaderSpan('A');
    const startX = TAB_LEFT + 20;
    const startY = TAB_TOP + 16;

    headerSpan.dispatchEvent(makePointerEvent('pointerdown', { clientX: startX, clientY: startY, pointerType: 'touch' }));
    // 30 px vertical move, well past slop, but |dy| > |dx| → abandoned.
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: startX, clientY: startY + 30, pointerType: 'touch' }));
    expect(ul.scrollLeft).toBe(0);

    vi.advanceTimersByTime(700);
    await nextRaf();
    expect(dock.shadowRoot!.querySelector('.dock-floating-layer .dock-floating')).toBeNull();
  });

  it('horizontal swipe on a non-overflowing strip abandons — does not pretend to scroll', async () => {
    const stack = dock.shadowRoot!.querySelector('mp-tab-control')!;
    const ul = stack.shadowRoot!.querySelector<HTMLElement>('ul.nav.nav-tabs')!;
    // Override the helper's overflow mock — clientWidth >= scrollWidth.
    Object.defineProperty(ul, 'scrollWidth', { configurable: true, value: 200 });
    Object.defineProperty(ul, 'clientWidth', { configurable: true, value: 600 });

    const headerSpan = getHeaderSpan('A');
    const startX = TAB_LEFT + 20;
    const startY = TAB_TOP + 16;

    headerSpan.dispatchEvent(makePointerEvent('pointerdown', { clientX: startX, clientY: startY, pointerType: 'touch' }));
    window.dispatchEvent(makePointerEvent('pointermove', { clientX: startX - 30, clientY: startY, pointerType: 'touch' }));
    expect(ul.scrollLeft).toBe(0);

    vi.advanceTimersByTime(700);
    await nextRaf();
    expect(dock.shadowRoot!.querySelector('.dock-floating-layer .dock-floating')).toBeNull();
  });
});

describe('mint-dock-manager — computeHeaderInsertIndex excludes the dragged tab', () => {
  // mp-tab-control's strip refreshes on a microtask after data-hidden is set.
  // beginPaneDrag calls updateDraggedFloatingPositionFromPoint synchronously
  // right after preparePaneDragSource, so computeHeaderInsertIndex runs before
  // that refresh — the dragged button is still in the strip's shadow. Without
  // the explicit exclusion, the loop counts the dragged tab as a real target
  // and the placeholder gets appended past the live tabs (visible on touch
  // long-press, where the finger doesn't move and the user sees the
  // mis-positioned placeholder for the duration of the hold).
  let dock: MintDockManagerElement;

  beforeEach(async () => {
    dock = document.createElement('mint-dock-manager') as MintDockManagerElement;
    document.body.appendChild(dock);
    dock.getBoundingClientRect = () => makeRect(HOST_LEFT, HOST_TOP, HOST_WIDTH, HOST_HEIGHT);

    dock.layout = {
      root: { kind: 'stack', panes: ['A', 'B', 'C'], activePane: 'A' },
      titles: { A: 'Alpha', B: 'Bravo', C: 'Charlie' },
      floating: [],
    } as never;

    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  });

  afterEach(() => {
    dock.remove();
  });

  it('returns the dragged tab\'s original index, not the appended end', () => {
    const stack = dock.shadowRoot!.querySelector('mp-tab-control') as HTMLElement;
    const draggedPane = 'B';
    const draggedHeader = stack.querySelector<HTMLElement>(
      `.dock-tab[data-pane="${draggedPane}"]`,
    )!;
    const draggedContent = stack.querySelector<HTMLElement>(
      `.dock-stack__pane[data-pane="${draggedPane}"]`,
    )!;

    // Reproduce the synchronous state ensureHeaderDragPlaceholder leaves
    // behind right before mp-tab-control's MutationObserver gets a chance to
    // refresh its strip: dragged content has data-hidden, placeholder span
    // is in light DOM before the dragged header, but shadow buttons are
    // still [A, B, C].
    draggedContent.setAttribute('data-hidden', '');
    const phHeader = document.createElement('span');
    phHeader.setAttribute('slot', '__dock-placeholder__-header');
    phHeader.classList.add('dock-tab');
    phHeader.dataset['placeholder'] = 'true';
    phHeader.dataset['tabId'] = '__dock-placeholder__';
    stack.insertBefore(phHeader, draggedHeader);

    // Set dragState so the function knows which pane is being dragged.
    (dock as unknown as { dragState: unknown }).dragState = { pane: draggedPane };

    // Stub each strip button's geometry. A:[0,60), B:[60,120), C:[120,180).
    const buttons = Array.from(
      stack.shadowRoot!.querySelectorAll<HTMLButtonElement>('button.nav-link'),
    );
    expect(buttons.length).toBe(3);
    buttons[0].getBoundingClientRect = () => makeRect(0, 0, 60, 32);
    buttons[1].getBoundingClientRect = () => makeRect(60, 0, 60, 32);
    buttons[2].getBoundingClientRect = () => makeRect(120, 0, 60, 32);

    // clientX = 90 → center of B. Pre-fix the loop would count B as a real
    // target and return 2 (index past B), which clamps to length-2 of
    // [A, C] in updateHeaderDragPlaceholderPosition → null ref → APPEND.
    // Post-fix targets = [A, C], the loop returns 1 (insert before C),
    // which lands the placeholder between A and C — i.e. B's old spot.
    const idx = (
      dock as unknown as {
        computeHeaderInsertIndex(stack: HTMLElement, clientX: number): number;
      }
    ).computeHeaderInsertIndex(stack, 90);
    expect(idx).toBe(1);
  });
});

describe('mint-dock-manager — layout normalization', () => {
  let dock: MintDockManagerElement;

  type AnyNode = {
    kind: 'split' | 'stack';
    direction?: 'horizontal' | 'vertical';
    sizes?: number[];
    children?: AnyNode[];
    panes?: string[];
    activePane?: string;
  };

  function normalize(node: AnyNode | null): AnyNode | null {
    return (
      dock as unknown as { normalizeLayoutNode(n: AnyNode | null): AnyNode | null }
    ).normalizeLayoutNode(node);
  }

  function stack(...panes: string[]): AnyNode {
    return { kind: 'stack', panes, activePane: panes[0] };
  }

  function split(
    direction: 'horizontal' | 'vertical',
    sizes: number[],
    ...children: AnyNode[]
  ): AnyNode {
    return { kind: 'split', direction, sizes, children };
  }

  beforeEach(() => {
    dock = document.createElement('mint-dock-manager') as MintDockManagerElement;
    document.body.appendChild(dock);
  });

  afterEach(() => {
    dock.remove();
  });

  // --- structural cleanup ---------------------------------------------------

  it('returns null for an empty stack', () => {
    expect(normalize({ kind: 'stack', panes: [] })).toBeNull();
  });

  it('returns null for a split with zero children', () => {
    expect(normalize(split('horizontal', [], ))).toBeNull();
  });

  it('unwraps a split with a single child (gap C origin)', () => {
    const out = normalize(split('horizontal', [1], stack('a')));
    expect(out).toMatchObject({ kind: 'stack', panes: ['a'] });
  });

  it('drops empty stacks from a split before deciding length', () => {
    // V[empty, stack(b), empty] → unwrapped to stack(b)
    const out = normalize(
      split(
        'vertical',
        [0.3, 0.4, 0.3],
        { kind: 'stack', panes: [] },
        stack('b'),
        { kind: 'stack', panes: [] },
      ),
    );
    expect(out).toMatchObject({ kind: 'stack', panes: ['b'] });
  });

  // --- gap-targeted scenarios ----------------------------------------------

  it('gap A — flattens a same-direction child surfaced by a length-1 collapse', () => {
    // V[ V[stack(a), stack(b)] alone in its slot ] should bubble up to a flat
    // V split at this level. Modeled as: V[ inner V[a, b] ] which collapses
    // to V[a, b] then merges into a parent if same direction.
    // Single-direct-child: collapse, then re-test from above.
    const out = normalize(
      split('vertical', [1.0], split('vertical', [0.4, 0.6], stack('a'), stack('b'))),
    );
    expect(out).toMatchObject({
      kind: 'split',
      direction: 'vertical',
      children: [
        { kind: 'stack', panes: ['a'] },
        { kind: 'stack', panes: ['b'] },
      ],
    });
  });

  it('gap B — flattens H[stack, H[stack, stack]] (multi-stack floating graft)', () => {
    const out = normalize(
      split(
        'horizontal',
        [0.5, 0.5],
        stack('p1'),
        split('horizontal', [0.5, 0.5], stack('p5'), stack('floating')),
      ),
    );
    expect(out).toMatchObject({
      kind: 'split',
      direction: 'horizontal',
      children: [
        { kind: 'stack', panes: ['p1'] },
        { kind: 'stack', panes: ['p5'] },
        { kind: 'stack', panes: ['floating'] },
      ],
    });
    expect((out as AnyNode).children).toHaveLength(3);
  });

  it('gap C — flattens V[V[stack, stack], stack] (wrap-then-flatten residue)', () => {
    const out = normalize(
      split(
        'vertical',
        [0.6, 0.4],
        split('vertical', [0.4, 0.6], stack('a'), stack('b')),
        stack('c'),
      ),
    );
    expect(out).toMatchObject({
      kind: 'split',
      direction: 'vertical',
      children: [
        { kind: 'stack', panes: ['a'] },
        { kind: 'stack', panes: ['b'] },
        { kind: 'stack', panes: ['c'] },
      ],
    });
  });

  it("user's repro: dragging panel-4 right of panel-3 produces a flat root", () => {
    // After this PR's normalize step, the artificial intermediate produced by
    // dockNodeBeside's wrap branch ought to be flattened so the user-observed
    // redundant H wrapper does not appear.
    const out = normalize(
      split(
        'horizontal',
        [0.5, 0.5],
        stack('p1', 'p2'),
        split('horizontal', [0.5, 0.5], stack('p3'), stack('p4')),
      ),
    );
    expect((out as AnyNode).kind).toBe('split');
    const flat = (out as AnyNode).children!;
    expect(flat).toHaveLength(3);
    expect(flat[0]).toMatchObject({ panes: ['p1', 'p2'] });
    expect(flat[1]).toMatchObject({ panes: ['p3'] });
    expect(flat[2]).toMatchObject({ panes: ['p4'] });
  });

  it('does NOT flatten a child split with the opposite direction', () => {
    const input = split(
      'horizontal',
      [0.5, 0.5],
      stack('a'),
      split('vertical', [0.5, 0.5], stack('b'), stack('c')),
    );
    const out = normalize(input);
    expect(out).toMatchObject({
      kind: 'split',
      direction: 'horizontal',
      children: [
        { kind: 'stack', panes: ['a'] },
        {
          kind: 'split',
          direction: 'vertical',
          children: [{ panes: ['b'] }, { panes: ['c'] }],
        },
      ],
    });
  });

  // --- size redistribution --------------------------------------------------

  it('combines sizes multiplicatively when merging same-direction children', () => {
    const out = normalize(
      split(
        'horizontal',
        [0.7, 0.3],
        stack('a'),
        split('horizontal', [0.3, 0.7], stack('b'), stack('c')),
      ),
    ) as AnyNode;
    expect(out.sizes).toHaveLength(3);
    // Outer slot for 'a' is 0.7 (kept); merged children get 0.3 * [0.3, 0.7] = [0.09, 0.21].
    // Sum = 0.7 + 0.09 + 0.21 = 1.0 (no renormalization adjustment needed).
    expect(out.sizes![0]).toBeCloseTo(0.7, 6);
    expect(out.sizes![1]).toBeCloseTo(0.09, 6);
    expect(out.sizes![2]).toBeCloseTo(0.21, 6);
    expect(out.sizes!.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 6);
  });

  it('renormalizes size sums to 1 after merging', () => {
    // Provide non-normalized sizes; result must still sum to 1.
    const out = normalize(
      split(
        'horizontal',
        [3, 1], // non-normalized
        stack('a'),
        split('horizontal', [4, 6], stack('b'), stack('c')),
      ),
    ) as AnyNode;
    expect(out.sizes!.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10);
  });

  // --- activePane repair ---------------------------------------------------

  it('repairs a stale activePane on a stack', () => {
    const out = normalize({ kind: 'stack', panes: ['a', 'b'], activePane: 'gone' });
    expect(out).toMatchObject({ activePane: 'a' });
  });

  it('keeps a valid activePane untouched', () => {
    const out = normalize({ kind: 'stack', panes: ['a', 'b'], activePane: 'b' });
    expect(out).toMatchObject({ activePane: 'b' });
  });

  // --- idempotency ---------------------------------------------------------

  it('is idempotent (normalize(normalize(x)) deep-equals normalize(x))', () => {
    const inputs: AnyNode[] = [
      stack('a'),
      split('horizontal', [0.5, 0.5], stack('a'), stack('b')),
      split(
        'vertical',
        [0.4, 0.6],
        split('vertical', [0.3, 0.7], stack('a'), stack('b')),
        stack('c'),
      ),
      split(
        'horizontal',
        [0.7, 0.3],
        stack('a'),
        split('horizontal', [0.3, 0.7], stack('b'), stack('c')),
      ),
    ];
    inputs
      .map((input) => {
        const once = JSON.parse(JSON.stringify(normalize(JSON.parse(JSON.stringify(input)))));
        const twice = JSON.parse(JSON.stringify(normalize(JSON.parse(JSON.stringify(once)))));
        return { once, twice };
      })
      .map(({ once, twice }) => expect(twice).toEqual(once));
  });

  // --- intake (gap D) ------------------------------------------------------

  it('gap D — layout setter sanitizes empty stacks on intake', () => {
    dock.layout = {
      root: split('horizontal', [0.5, 0.5], { kind: 'stack', panes: [] }, stack('only')),
      floating: [],
      titles: {},
    } as never;
    const snap = dock.layout.root as AnyNode;
    expect(snap).toMatchObject({ kind: 'stack', panes: ['only'] });
  });

  it('gap D — layout setter flattens nested same-direction splits on intake', () => {
    dock.layout = {
      root: split(
        'vertical',
        [0.6, 0.4],
        split('vertical', [0.5, 0.5], stack('a'), stack('b')),
        stack('c'),
      ),
      floating: [],
      titles: {},
    } as never;
    const out = dock.layout.root as AnyNode;
    expect(out.kind).toBe('split');
    expect(out.children).toHaveLength(3);
    expect(out.children![0]).toMatchObject({ panes: ['a'] });
    expect(out.children![1]).toMatchObject({ panes: ['b'] });
    expect(out.children![2]).toMatchObject({ panes: ['c'] });
  });

  // --- floating windows ----------------------------------------------------

  it('drops a floating window whose root collapses to null on intake', () => {
    dock.layout = {
      root: stack('docked'),
      floating: [
        {
          bounds: { left: 0, top: 0, width: 200, height: 200 },
          root: { kind: 'stack', panes: [] },
        },
      ],
      titles: {},
    } as never;
    expect(dock.layout.floating).toHaveLength(0);
  });

  it('repairs a stale activePane on a floating window during normalize', () => {
    dock.layout = {
      root: stack('docked'),
      floating: [
        {
          bounds: { left: 0, top: 0, width: 200, height: 200 },
          root: stack('a', 'b'),
          activePane: 'ghost',
        },
      ],
      titles: {},
    } as never;
    expect(dock.layout.floating[0].activePane).toBe('a');
  });
});
