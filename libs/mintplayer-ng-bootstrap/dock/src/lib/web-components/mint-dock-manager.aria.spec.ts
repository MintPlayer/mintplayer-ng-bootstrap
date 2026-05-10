import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mint-dock-manager.element';
import type { MintDockManagerElement } from './mint-dock-manager.element';

const HOST_WIDTH = 1000;
const HOST_HEIGHT = 600;

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

async function nextRaf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function mountWithFloating(): Promise<MintDockManagerElement> {
  const dock = document.createElement('mint-dock-manager') as MintDockManagerElement;
  document.body.appendChild(dock);
  dock.getBoundingClientRect = () => makeRect(0, 0, HOST_WIDTH, HOST_HEIGHT);
  dock.layout = {
    root: { kind: 'stack', panes: ['Docked'], activePane: 'Docked' },
    titles: { Docked: 'Docked Pane', Floater: 'My Floater' },
    floating: [
      {
        bounds: { left: 100, top: 80, width: 320, height: 200 },
        root: { kind: 'stack', panes: ['Floater'], activePane: 'Floater' },
        activePane: 'Floater',
      },
    ],
  } as never;
  await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
  await nextRaf();
  return dock;
}

describe('mint-dock-manager — floating pane ARIA dialog wiring', () => {
  let dock: MintDockManagerElement;
  beforeEach(async () => {
    dock = await mountWithFloating();
  });
  afterEach(() => dock.remove());

  it('floating pane wrapper has role="dialog" + aria-modal="false"', () => {
    const wrapper = dock.shadowRoot!.querySelector<HTMLElement>('.dock-floating')!;
    expect(wrapper.getAttribute('role')).toBe('dialog');
    expect(wrapper.getAttribute('aria-modal')).toBe('false');
  });

  it('floating pane is labelled by its title element via aria-labelledby', () => {
    const wrapper = dock.shadowRoot!.querySelector<HTMLElement>('.dock-floating')!;
    const labelledBy = wrapper.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const title = dock.shadowRoot!.querySelector<HTMLElement>(`#${labelledBy}`);
    expect(title?.textContent).toBe('My Floater');
  });

  it('renders a close button with a descriptive aria-label', () => {
    const close = dock.shadowRoot!.querySelector<HTMLButtonElement>('.dock-floating__close');
    expect(close).not.toBeNull();
    expect(close!.getAttribute('aria-label')).toBe('Close pane: My Floater');
    expect(close!.tagName).toBe('BUTTON');
  });

  it('clicking close removes the floating pane', async () => {
    const close = dock.shadowRoot!.querySelector<HTMLButtonElement>('.dock-floating__close')!;
    close.click();
    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    expect(dock.shadowRoot!.querySelector('.dock-floating')).toBeNull();
  });
});

describe('mint-dock-manager — floating-pane resizers', () => {
  let dock: MintDockManagerElement;
  beforeEach(async () => {
    dock = await mountWithFloating();
  });
  afterEach(() => dock.remove());

  it('every resizer has role="separator"', () => {
    const resizers = Array.from(dock.shadowRoot!.querySelectorAll<HTMLElement>('.dock-floating__resizer'));
    expect(resizers.length).toBe(8);
    for (const r of resizers) {
      expect(r.getAttribute('role')).toBe('separator');
    }
  });

  it('pure-edge resizers carry aria-orientation', () => {
    const top = dock.shadowRoot!.querySelector<HTMLElement>('.dock-floating__resizer--top')!;
    const left = dock.shadowRoot!.querySelector<HTMLElement>('.dock-floating__resizer--left')!;
    expect(top.getAttribute('aria-orientation')).toBe('horizontal');
    expect(left.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('corner resizers omit aria-orientation (neither value is correct)', () => {
    const corner = dock.shadowRoot!.querySelector<HTMLElement>('.dock-floating__resizer--top-left')!;
    expect(corner.hasAttribute('aria-orientation')).toBe(false);
  });

  it('resizer aria-labels describe the edge / corner', () => {
    const topLeft = dock.shadowRoot!.querySelector<HTMLElement>('.dock-floating__resizer--top-left')!;
    expect(topLeft.getAttribute('aria-label')).toContain('top');
    expect(topLeft.getAttribute('aria-label')).toContain('left');
  });
});

describe('mint-dock-manager — live announcer', () => {
  let dock: MintDockManagerElement;
  beforeEach(async () => {
    dock = await mountWithFloating();
  });
  afterEach(() => dock.remove());

  it('renders a polite role="status" region in the shadow tree', () => {
    const live = dock.shadowRoot!.querySelector('[role="status"]');
    expect(live).not.toBeNull();
    expect(live!.getAttribute('aria-live')).toBe('polite');
  });
});

// Intersection handles' creation in renderIntersectionHandles depends on
// real layout (getBoundingClientRect on dividers + a setTimeout(5) gate).
// jsdom returns 0×0 rects for every element, which collapses every divider
// to coordinate (0,0) and the algorithm produces zero intersections — so a
// unit-level "render then click the handle" test isn't viable here. The
// keyboard delegation path is covered at the splitter side via
// MpSplitter.resizeDividerBy() (see mp-splitter.aria.spec.ts).
