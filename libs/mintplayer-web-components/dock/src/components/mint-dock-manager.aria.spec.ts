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

describe('mint-dock-manager — keyboard pane move (M to enter, T/R/B/L/F to commit)', () => {
  let dock: MintDockManagerElement;
  beforeEach(async () => {
    dock = document.createElement('mint-dock-manager') as MintDockManagerElement;
    document.body.appendChild(dock);
    dock.getBoundingClientRect = () => makeRect(0, 0, HOST_WIDTH, HOST_HEIGHT);
    dock.layout = {
      root: { kind: 'stack', panes: ['Alpha', 'Beta'], activePane: 'Alpha' },
      titles: { Alpha: 'Alpha', Beta: 'Beta' },
      floating: [],
    } as never;
    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  });
  afterEach(() => dock.remove());

  // The capture-phase keydown listener is wired in firstUpdated, but
  // jsdom's composed-event traversal through nested shadow roots doesn't
  // reliably surface a focused button inside mp-tab-control's shadow root
  // back to the dock root via shadowRoot.activeElement. We exercise the
  // commit pipeline directly: the higher-level "find focused tab + dispatch
  // composed event" path is covered by the manual NVDA + Playwright passes
  // documented in the PRD's §9 test strategy.
  it('commitPaneMoveAsFloat tears off the named pane into a floating window', async () => {
    const internals = dock as unknown as {
      paneMoveMode: { paneName: string; sourcePath: { type: 'docked'; segments: number[] } } | null;
      commitPaneMoveAsFloat: () => void;
    };
    internals.paneMoveMode = { paneName: 'Alpha', sourcePath: { type: 'docked', segments: [] } };
    internals.commitPaneMoveAsFloat();
    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    expect(dock.shadowRoot!.querySelectorAll('.dock-floating').length).toBe(1);
  });

  it('Escape exits move mode without altering the layout', () => {
    const internals = dock as unknown as {
      paneMoveMode: { paneName: string; sourcePath: { type: 'docked'; segments: number[] } } | null;
      handlePaneMoveModeKey: (e: KeyboardEvent) => void;
    };
    internals.paneMoveMode = { paneName: 'Alpha', sourcePath: { type: 'docked', segments: [] } };
    internals.handlePaneMoveModeKey(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect(internals.paneMoveMode).toBeNull();
    expect(dock.shadowRoot!.querySelectorAll('.dock-floating').length).toBe(0);
  });

  it('focus leaving the dock cancels move mode', () => {
    const internals = dock as unknown as {
      paneMoveMode: { paneName: string; sourcePath: { type: 'docked'; segments: number[] } } | null;
      onRootFocusOut: (e: FocusEvent) => void;
    };
    internals.paneMoveMode = { paneName: 'Alpha', sourcePath: { type: 'docked', segments: [] } };
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    internals.onRootFocusOut(new FocusEvent('focusout', { relatedTarget: outside }));
    outside.remove();
    expect(internals.paneMoveMode).toBeNull();
  });

  it('blur to nowhere (relatedTarget null) also cancels move mode', () => {
    const internals = dock as unknown as {
      paneMoveMode: { paneName: string; sourcePath: { type: 'docked'; segments: number[] } } | null;
      onRootFocusOut: (e: FocusEvent) => void;
    };
    internals.paneMoveMode = { paneName: 'Alpha', sourcePath: { type: 'docked', segments: [] } };
    internals.onRootFocusOut(new FocusEvent('focusout', { relatedTarget: null }));
    expect(internals.paneMoveMode).toBeNull();
  });

  it('focus moving WITHIN the dock (shadow or slotted light DOM) keeps move mode armed', () => {
    const internals = dock as unknown as {
      paneMoveMode: { paneName: string; sourcePath: { type: 'docked'; segments: number[] } } | null;
      onRootFocusOut: (e: FocusEvent) => void;
    };
    internals.paneMoveMode = { paneName: 'Alpha', sourcePath: { type: 'docked', segments: [] } };
    const shadowTarget = dock.shadowRoot!.querySelector('.dock-root') as HTMLElement;
    internals.onRootFocusOut(new FocusEvent('focusout', { relatedTarget: shadowTarget }));
    expect(internals.paneMoveMode).not.toBeNull();

    const slotted = document.createElement('div');
    dock.appendChild(slotted);
    internals.onRootFocusOut(new FocusEvent('focusout', { relatedTarget: slotted }));
    slotted.remove();
    expect(internals.paneMoveMode).not.toBeNull();
  });
});

describe('mint-dock-manager — keyboard move announces the actual outcome (4.10)', () => {
  let dock: MintDockManagerElement;
  beforeEach(async () => {
    dock = document.createElement('mint-dock-manager') as MintDockManagerElement;
    document.body.appendChild(dock);
    dock.getBoundingClientRect = () => makeRect(0, 0, HOST_WIDTH, HOST_HEIGHT);
    dock.layout = {
      root: { kind: 'stack', panes: ['Alpha', 'Beta'], activePane: 'Alpha' },
      titles: { Alpha: 'Alpha', Beta: 'Beta' },
      floating: [],
    } as never;
    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  });
  afterEach(() => dock.remove());

  interface MoveInternals {
    paneMoveMode: { paneName: string; sourcePath: unknown } | null;
    commitPaneMoveToZone: (zone: string) => void;
  }
  const live = () => dock.shadowRoot!.querySelector('[role="status"]')!.textContent ?? '';

  it('announces success only when handleDrop actually committed', async () => {
    const internals = dock as unknown as MoveInternals;
    internals.paneMoveMode = { paneName: 'Alpha', sourcePath: { type: 'docked', segments: [] } };
    internals.commitPaneMoveToZone('right');
    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(live()).toContain('docked to right');
  });

  it('announces failure when the source path no longer resolves', async () => {
    const internals = dock as unknown as MoveInternals;
    internals.paneMoveMode = { paneName: 'Alpha', sourcePath: { type: 'floating', index: 99, segments: [] } };
    internals.commitPaneMoveToZone('right');
    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    expect(live()).toContain('Move failed');
    expect(live()).not.toContain('docked to');
  });
});

describe('mint-dock-manager — keyboard drop-target enumeration (arrows cycle, Enter commits)', () => {
  let dock: MintDockManagerElement;

  // Two docked stacks side by side so the enumeration has a target that is not
  // the moving pane's own stack: d:0 holds Alpha, d:1 holds Beta + Gamma.
  beforeEach(async () => {
    dock = document.createElement('mint-dock-manager') as MintDockManagerElement;
    document.body.appendChild(dock);
    dock.getBoundingClientRect = () => makeRect(0, 0, HOST_WIDTH, HOST_HEIGHT);
    dock.layout = {
      root: {
        kind: 'split',
        direction: 'horizontal',
        sizes: [0.5, 0.5],
        children: [
          { kind: 'stack', panes: ['Alpha'], activePane: 'Alpha' },
          { kind: 'stack', panes: ['Beta', 'Gamma'], activePane: 'Beta' },
        ],
      },
      titles: { Alpha: 'Alpha Pane', Beta: 'Beta Pane', Gamma: 'Gamma Pane' },
      floating: [],
    } as never;
    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
  });
  afterEach(() => dock.remove());

  interface CycleInternals {
    paneMoveMode: { paneName: string; sourcePath: unknown } | null;
    paneMoveCandidateIndex: number | null;
    handlePaneMoveModeKey: (e: KeyboardEvent) => void;
    buildPaneMoveCandidates: () => { pathStr: string | null; zone: string; targetTitles: string }[];
  }
  const internalsOf = () => dock as unknown as CycleInternals;
  const live = () => dock.shadowRoot!.querySelector('[role="status"]')!.textContent ?? '';
  const arm = (paneName: string, segments: number[]) => {
    const internals = internalsOf();
    internals.paneMoveMode = { paneName, sourcePath: { type: 'docked', segments } };
    return internals;
  };
  const press = (internals: CycleInternals, key: string) =>
    internals.handlePaneMoveModeKey(new KeyboardEvent('keydown', { key, cancelable: true }));

  it('enumerates four zones per foreign docked stack plus one float candidate', () => {
    const internals = arm('Alpha', [0]);
    const candidates = internals.buildPaneMoveCandidates();
    // Only d:1 is foreign to the moving pane's stack (d:0): 4 zones + float.
    expect(candidates.length).toBe(5);
    expect(candidates.filter((c) => c.pathStr === 'd:1').map((c) => c.zone)).toEqual([
      'top',
      'right',
      'bottom',
      'left',
    ]);
    expect(candidates.at(-1)).toEqual({ pathStr: null, zone: 'float', targetTitles: '' });
    expect(candidates.some((c) => c.pathStr === 'd:0')).toBe(false);
  });

  it('ArrowRight announces the first candidate by zone, target titles and position', () => {
    const internals = arm('Alpha', [0]);
    press(internals, 'ArrowRight');
    expect(internals.paneMoveCandidateIndex).toBe(0);
    expect(live()).toBe('Top of Beta Pane, Gamma Pane, option 1 of 5.');
  });

  it('ArrowDown cycles forward and wraps past the float candidate back to the first', () => {
    const internals = arm('Alpha', [0]);
    const seen = Array.from({ length: 6 }, () => {
      press(internals, 'ArrowDown');
      return live();
    });
    expect(seen).toEqual([
      'Top of Beta Pane, Gamma Pane, option 1 of 5.',
      'Right of Beta Pane, Gamma Pane, option 2 of 5.',
      'Bottom of Beta Pane, Gamma Pane, option 3 of 5.',
      'Left of Beta Pane, Gamma Pane, option 4 of 5.',
      'Float, option 5 of 5.',
      'Top of Beta Pane, Gamma Pane, option 1 of 5.',
    ]);
    expect(internals.paneMoveCandidateIndex).toBe(0);
  });

  it('ArrowLeft / ArrowUp cycle backward, starting at the last candidate', () => {
    const internals = arm('Alpha', [0]);
    press(internals, 'ArrowLeft');
    expect(live()).toBe('Float, option 5 of 5.');
    press(internals, 'ArrowUp');
    expect(live()).toBe('Left of Beta Pane, Gamma Pane, option 4 of 5.');
    expect(internals.paneMoveCandidateIndex).toBe(3);
  });

  it('Enter commits the highlighted candidate into the target stack, not the source', async () => {
    const internals = arm('Alpha', [0]);
    press(internals, 'ArrowRight');
    press(internals, 'ArrowRight');
    expect(live()).toBe('Right of Beta Pane, Gamma Pane, option 2 of 5.');

    press(internals, 'Enter');
    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();

    expect(internals.paneMoveMode).toBeNull();
    expect(internals.paneMoveCandidateIndex).toBeNull();
    expect(live()).toContain('docked to right');

    // Alpha left d:0 (which collapsed away) and is now the right sibling of the
    // Beta/Gamma stack — the same shape a pointer drop on that stack produces.
    const paths = Array.from(dock.shadowRoot!.querySelectorAll<HTMLElement>('.dock-stack')).map(
      (s) => s.dataset['path'],
    );
    expect(paths.length).toBe(2);
    const alphaTab = dock.shadowRoot!.querySelector<HTMLElement>('.dock-tab[data-pane="Alpha"]')!;
    const alphaPath = alphaTab.closest<HTMLElement>('.dock-stack')!.dataset['path'];
    expect(alphaPath).toBe('d:1');
  });

  it('Enter on the float candidate tears the pane off', async () => {
    const internals = arm('Alpha', [0]);
    press(internals, 'ArrowLeft');
    expect(live()).toBe('Float, option 5 of 5.');
    press(internals, 'Enter');
    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;
    await nextRaf();
    expect(dock.shadowRoot!.querySelectorAll('.dock-floating').length).toBe(1);
    expect(internals.paneMoveCandidateIndex).toBeNull();
  });

  it('Enter without a cycled candidate commits nothing and stays armed', () => {
    const internals = arm('Alpha', [0]);
    press(internals, 'Enter');
    expect(internals.paneMoveMode).not.toBeNull();
    expect(live()).not.toContain('docked to');
  });

  it('Escape clears the highlight and reverts nothing', async () => {
    const internals = arm('Alpha', [0]);
    press(internals, 'ArrowRight');
    press(internals, 'Escape');
    await (dock as unknown as { updateComplete: Promise<void> }).updateComplete;

    expect(internals.paneMoveMode).toBeNull();
    expect(internals.paneMoveCandidateIndex).toBeNull();
    expect(live()).toContain('Move cancelled');
    const indicator = dock.shadowRoot!.querySelector<HTMLElement>('.dock-drop-indicator');
    expect(indicator?.dataset['visible']).toBe('false');

    const paths = Array.from(dock.shadowRoot!.querySelectorAll<HTMLElement>('.dock-stack')).map(
      (s) => s.dataset['path'],
    );
    expect(paths).toEqual(['d:0', 'd:1']);
    expect(dock.shadowRoot!.querySelectorAll('.dock-floating').length).toBe(0);
  });

  it('arrows typed into an editable inside a pane cycle nothing', () => {
    const internals = arm('Alpha', [0]);
    const input = document.createElement('input');
    dock.appendChild(input);
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true, composed: true });
    Object.defineProperty(event, 'composedPath', { value: () => [input, dock] });
    internals.handlePaneMoveModeKey(event);
    input.remove();
    expect(internals.paneMoveCandidateIndex).toBeNull();
  });
});
