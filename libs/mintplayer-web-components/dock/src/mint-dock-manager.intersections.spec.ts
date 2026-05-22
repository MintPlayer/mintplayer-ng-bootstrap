import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mint-dock-manager.element';
import type { MintDockManagerElement } from './mint-dock-manager.element';
// jsdom returns zero rects; build explicit ones and bypass `getSplitterDividers`
// so the renderer reads them via the path the unit-under-test owns.
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

function makeDivider(rect: DOMRect): HTMLElement {
  const el = document.createElement('div');
  el.classList.add('divider');
  el.getBoundingClientRect = () => rect;
  return el;
}

function appendSplitter(
  parent: HTMLElement,
  direction: 'horizontal' | 'vertical',
  pathStr: string,
): HTMLElement {
  // Plain div is fine — the renderer matches `.dock-split` by class, not tag.
  // Avoiding `<mp-splitter>` here side-steps its real shadow-root rendering,
  // which is irrelevant to the layer-isolation contract we're testing.
  const splitter = document.createElement('div');
  splitter.classList.add('dock-split');
  splitter.dataset['direction'] = direction;
  splitter.dataset['path'] = pathStr;
  parent.appendChild(splitter);
  return splitter;
}

function appendFloatingWrapper(parent: HTMLElement, index: number): HTMLElement {
  const float = document.createElement('div');
  float.classList.add('dock-floating');
  // Mirrors renderFloatingPanes (mint-dock-manager.element.ts:545+):
  // each floating wrapper carries its formatPath() identity (`f:<index>`).
  float.dataset['path'] = `f:${index}`;
  parent.appendChild(float);
  return float;
}

type DockInternals = MintDockManagerElement & {
  shadowRoot: ShadowRoot;
  getSplitterDividers: (splitter: HTMLElement) => HTMLElement[];
  renderIntersectionHandles: () => void;
};

describe('mint-dock-manager — renderIntersectionHandles layer isolation', () => {
  let dock: DockInternals;

  beforeEach(async () => {
    dock = document.createElement('mint-dock-manager') as DockInternals;
    document.body.appendChild(dock);
    dock.getBoundingClientRect = () => makeRect(0, 0, 1000, 600);
    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
  });

  afterEach(() => {
    dock.remove();
  });

  it('does not pair a docked h-divider with a floating-pane v-divider that coincidentally aligns', () => {
    const shadow = dock.shadowRoot;
    const dockedEl = shadow.querySelector('.dock-docked') as HTMLElement;
    const floatingLayer = shadow.querySelector('.dock-floating-layer') as HTMLElement;

    // Docked vertical-split → its divider is horizontal (full-width line at y≈300).
    const dockedSplitter = appendSplitter(dockedEl, 'vertical', '');
    // Floating pane 0 with one horizontal-split → its divider is vertical (line at x≈300).
    const float = appendFloatingWrapper(floatingLayer, 0);
    const floatSplitter = appendSplitter(float, 'horizontal', '');

    const hDiv = makeDivider(makeRect(0, 295, 1000, 10));
    const vDiv = makeDivider(makeRect(295, 100, 10, 400));

    dock.getSplitterDividers = (s) => {
      if (s === dockedSplitter) return [hDiv];
      if (s === floatSplitter) return [vDiv];
      return [];
    };

    dock.renderIntersectionHandles();

    const handles = shadow.querySelectorAll('.dock-intersection-handle');
    expect(handles.length).toBe(0);
  });

  it('does not pair dividers from two different floating panes that coincidentally align', () => {
    const shadow = dock.shadowRoot;
    const floatingLayer = shadow.querySelector('.dock-floating-layer') as HTMLElement;

    const float0 = appendFloatingWrapper(floatingLayer, 0);
    const splitter0 = appendSplitter(float0, 'vertical', '');
    const float1 = appendFloatingWrapper(floatingLayer, 1);
    const splitter1 = appendSplitter(float1, 'horizontal', '');

    const hDiv = makeDivider(makeRect(50, 295, 800, 10));
    const vDiv = makeDivider(makeRect(295, 100, 10, 400));

    dock.getSplitterDividers = (s) => {
      if (s === splitter0) return [hDiv];
      if (s === splitter1) return [vDiv];
      return [];
    };

    dock.renderIntersectionHandles();

    const handles = shadow.querySelectorAll('.dock-intersection-handle');
    expect(handles.length).toBe(0);
  });

  it('still renders the handle for a real same-layer crossing in the docked layer', () => {
    const shadow = dock.shadowRoot;
    const dockedEl = shadow.querySelector('.dock-docked') as HTMLElement;

    const vSplit = appendSplitter(dockedEl, 'vertical', '');
    const hSplit = appendSplitter(dockedEl, 'horizontal', '0');

    const hDiv = makeDivider(makeRect(0, 295, 1000, 10));
    const vDiv = makeDivider(makeRect(295, 100, 10, 400));

    dock.getSplitterDividers = (s) => {
      if (s === vSplit) return [hDiv];
      if (s === hSplit) return [vDiv];
      return [];
    };

    dock.renderIntersectionHandles();

    const handles = shadow.querySelectorAll('.dock-intersection-handle');
    expect(handles.length).toBe(1);
  });

  it('still renders the handle for a real same-layer crossing inside a floating pane', () => {
    const shadow = dock.shadowRoot;
    const floatingLayer = shadow.querySelector('.dock-floating-layer') as HTMLElement;

    const float = appendFloatingWrapper(floatingLayer, 0);
    const vSplit = appendSplitter(float, 'vertical', '');
    const hSplit = appendSplitter(float, 'horizontal', '0');

    const hDiv = makeDivider(makeRect(20, 295, 400, 10));
    const vDiv = makeDivider(makeRect(195, 100, 10, 400));

    dock.getSplitterDividers = (s) => {
      if (s === vSplit) return [hDiv];
      if (s === hSplit) return [vDiv];
      return [];
    };

    dock.renderIntersectionHandles();

    const handles = shadow.querySelectorAll('.dock-intersection-handle');
    expect(handles.length).toBe(1);
  });
});
