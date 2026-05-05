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
