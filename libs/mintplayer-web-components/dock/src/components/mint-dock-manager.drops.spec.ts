import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import './mint-dock-manager.element';
import type { MintDockManagerElement } from './mint-dock-manager.element';
import type { DockLayoutNode, DockSplitNode, DockStackNode } from '../types/dock-layout';

/**
 * What a drop DOES to the layout, driven through the keyboard move flow.
 *
 * The dock has two ways to move a pane and they deliberately converge: a
 * pointer drag, and a keyboard mode armed with `M` that enumerates the same
 * drop targets and commits through the same `handleDrop`. Only the second is
 * testable here — the first ends in hit-testing against `elementsFromPoint` and
 * rects that jsdom reports as zero — but it reaches the *semantics*, which is
 * the part that decides where the pane ends up.
 *
 * That split is worth being explicit about: these tests cover which node moves
 * where, and the four dock e2e specs cover whether the pointer finds the right
 * target in a real engine. Neither substitutes for the other, and faking rects
 * to simulate the first here would produce a number rather than a guarantee.
 */

const stack = (...panes: string[]): DockStackNode => ({
  kind: 'stack',
  panes,
  activePane: panes[0],
});

const split = (
  direction: 'horizontal' | 'vertical',
  children: DockLayoutNode[],
  sizes?: number[],
): DockSplitNode => ({ kind: 'split', direction, children, sizes });

let dock: MintDockManagerElement;

beforeEach(() => {
  dock = document.createElement('mint-dock-manager') as MintDockManagerElement;
  document.body.appendChild(dock);
});

afterEach(() => {
  dock.remove();
});

const settle = () => (dock as unknown as { updateComplete: Promise<unknown> }).updateComplete;

/** Every pane name in the docked tree, in document order. */
function dockedPanes(): string[] {
  const out: string[] = [];
  const walk = (node: DockLayoutNode | null): void => {
    if (!node) return;
    if (node.kind === 'stack') out.push(...node.panes);
    else node.children.forEach(walk);
  };
  walk(dock.layout.root);
  return out;
}

/** The pane names of each floating window, in order. */
const floatingPanes = (): string[][] =>
  dock.layout.floating.map((window) => {
    const out: string[] = [];
    const walk = (node: DockLayoutNode | null): void => {
      if (!node) return;
      if (node.kind === 'stack') out.push(...node.panes);
      else node.children.forEach(walk);
    };
    walk(window.root);
    return out;
  });

const key = (init: KeyboardEventInit) =>
  new KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true, ...init });

/** The rendered `.dock-stack` whose `data-path` matches. */
const stackAt = (path: string) =>
  dock.shadowRoot!.querySelector<HTMLElement>(`.dock-stack[data-path="${path}"]`);

/** The path of the stack a pane currently sits in, as the renderer stamped it. */
function pathOf(pane: string): { type: 'docked'; segments: number[] } {
  const tab = dock.shadowRoot!.querySelector<HTMLElement>(`.dock-tab[data-pane="${pane}"]`);
  const stackEl = tab?.closest<HTMLElement>('.dock-stack');
  const raw = (stackEl?.dataset['path'] ?? 'd:').replace(/^d:/, '');
  const segments = raw
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => Number.parseInt(segment, 10));
  return { type: 'docked', segments };
}

/*
 * Arming is the one step of the flow jsdom cannot perform. The dock reads the
 * focused tab through `shadowRoot.activeElement`, and jsdom does not surface a
 * button focused inside `mp-tab-control`'s nested shadow root back to the dock
 * root — the same limitation `mint-dock-manager.aria.spec.ts` documents, where
 * the real `M` keystroke is likewise covered by the Playwright and manual
 * screen-reader passes instead.
 *
 * So arming is set directly and EVERYTHING AFTER IT is driven through real
 * keyboard events: the key routing, the zone mapping, the commit and the
 * layout mutation all run exactly as they do for a user.
 */
async function armMove(pane: string): Promise<void> {
  (dock as unknown as { paneMoveMode: unknown }).paneMoveMode = {
    paneName: pane,
    sourcePath: pathOf(pane),
  };
  (dock as unknown as { paneMoveCandidateIndex: number | null }).paneMoveCandidateIndex = null;
  await settle();
}

/** Send a key through the dock's own move-mode handler. */
async function press(init: KeyboardEventInit): Promise<void> {
  (dock as unknown as { handlePaneMoveModeKey: (e: KeyboardEvent) => void }).handlePaneMoveModeKey(
    key(init),
  );
  await settle();
}

/** Arm on `pane`, then commit it to `zone` of its own stack. */
async function moveToZone(pane: string, zone: 't' | 'r' | 'b' | 'l' | 'f'): Promise<void> {
  await armMove(pane);
  await press({ key: zone });
}

describe('the rendered tree carries the paths a drop resolves against', () => {
  it('stamps a path on every stack', async () => {
    dock.layout = split('horizontal', [stack('a'), split('vertical', [stack('b'), stack('c')])]) as never;
    await settle();

    const paths = [...dock.shadowRoot!.querySelectorAll('.dock-stack')].map(
      (el) => (el as HTMLElement).dataset['path'],
    );
    expect(paths).toEqual(['d:0', 'd:1/0', 'd:1/1']);
  });

  it('stamps a floating window path on its stacks', async () => {
    dock.layout = {
      root: stack('docked'),
      floating: [{ bounds: { left: 0, top: 0, width: 300, height: 200 }, root: stack('float') }],
      titles: {},
    } as never;
    await settle();

    expect(stackAt('f:0')).not.toBeNull();
  });

  it('renders one tab per pane', async () => {
    dock.layout = stack('a', 'b', 'c') as never;
    await settle();

    expect(dock.shadowRoot!.querySelectorAll('.dock-tab')).toHaveLength(3);
  });
});

describe('splitting a stack with the keyboard', () => {
  /*
   * T/R/B/L split the pane's OWN stack — the one case the enumerated candidate
   * list deliberately leaves out, because these four keys already cover it. The
   * result must be a split whose direction matches the axis of the key.
   */
  it.each([
    ['r', 'horizontal', 1],
    ['l', 'horizontal', 0],
    ['b', 'vertical', 1],
    ['t', 'vertical', 0],
  ] as const)('%s splits the stack %s, with the pane at index %i', async (zone, direction, index) => {
    dock.layout = stack('a', 'b') as never;
    await settle();

    await moveToZone('a', zone);

    const root = dock.layout.root as DockSplitNode;
    expect(root.kind).toBe('split');
    expect(root.direction).toBe(direction);
    expect((root.children[index] as DockStackNode).panes).toEqual(['a']);
  });

  it('leaves the other panes behind in the original stack', async () => {
    dock.layout = stack('a', 'b', 'c') as never;
    await settle();

    await moveToZone('a', 'r');

    const root = dock.layout.root as DockSplitNode;
    expect((root.children[0] as DockStackNode).panes).toEqual(['b', 'c']);
  });

  it('keeps every pane in the layout', async () => {
    dock.layout = stack('a', 'b', 'c') as never;
    await settle();

    await moveToZone('b', 'b');

    expect(dockedPanes().sort()).toEqual(['a', 'b', 'c']);
  });

  // Splitting the only pane out of its own stack would leave an empty stack
  // beside it, which normalization then collapses — leaving the layout exactly
  // as it was.
  it('is a no-op for the only pane in the whole dock', async () => {
    dock.layout = stack('a') as never;
    await settle();

    await moveToZone('a', 'r');

    expect(dockedPanes()).toEqual(['a']);
  });

  it('announces the layout change', async () => {
    const changes: Event[] = [];
    dock.addEventListener('dock-layout-changed', (e) => changes.push(e));
    dock.layout = stack('a', 'b') as never;
    await settle();

    await moveToZone('a', 'r');

    expect(changes.length).toBeGreaterThan(0);
  });

  it('splits a stack that sits inside an existing split', async () => {
    dock.layout = split('horizontal', [stack('a', 'b'), stack('c')]) as never;
    await settle();

    await moveToZone('a', 'b');

    expect(dockedPanes().sort()).toEqual(['a', 'b', 'c']);
    expect(JSON.stringify(dock.layout.root)).toContain('vertical');
  });
});

describe('floating a pane with the keyboard', () => {
  it('tears the pane off into a floating window', async () => {
    dock.layout = stack('a', 'b') as never;
    await settle();

    await moveToZone('a', 'f');

    expect(floatingPanes()).toEqual([['a']]);
    expect(dockedPanes()).toEqual(['b']);
  });

  it('gives the new window usable bounds', async () => {
    dock.layout = stack('a', 'b') as never;
    await settle();

    await moveToZone('a', 'f');

    const bounds = dock.layout.floating[0].bounds;
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
  });

  /*
   * The last pane CAN be torn off, leaving the main area empty — and that is
   * deliberate rather than an oversight. `handleDrop` carries an explicit
   * branch for dropping onto a dock with no root at all, which is the path
   * that brings the pane back, so an empty main area is a state the dock is
   * built to recover from rather than one it has to prevent.
   */
  it('allows the last pane to be floated, leaving an empty main area', async () => {
    dock.layout = stack('a') as never;
    await settle();

    await moveToZone('a', 'f');

    expect(dockedPanes()).toEqual([]);
    expect(floatingPanes()).toEqual([['a']]);
  });

  it('renders no docked stack once the main area is empty', async () => {
    dock.layout = stack('a') as never;
    await settle();

    await moveToZone('a', 'f');
    await settle();

    expect(dock.shadowRoot!.querySelectorAll('.dock-stack[data-path^="d:"]')).toHaveLength(0);
    expect(dock.shadowRoot!.querySelectorAll('.dock-floating')).toHaveLength(1);
  });

  it('renders the floating window it created', async () => {
    dock.layout = stack('a', 'b') as never;
    await settle();

    await moveToZone('a', 'f');
    await settle();

    expect(dock.shadowRoot!.querySelectorAll('.dock-floating')).toHaveLength(1);
  });
});

describe('moving between stacks with the enumerated candidates', () => {
  async function cycleAndCommit(pane: string, steps: number): Promise<void> {
    await armMove(pane);
    for (let i = 0; i < steps; i++) await press({ key: 'ArrowRight' });
    await press({ key: 'Enter' });
  }

  it('moves the pane out of the stack it started in', async () => {
    dock.layout = split('horizontal', [stack('a', 'b'), stack('c')]) as never;
    await settle();
    const before = JSON.stringify(dock.layout.root);

    await cycleAndCommit('a', 1);

    expect(dockedPanes().sort()).toEqual(['a', 'b', 'c']);
    expect(JSON.stringify(dock.layout.root)).not.toBe(before);
  });

  it('keeps every pane in the layout however far it is cycled', async () => {
    dock.layout = split('horizontal', [stack('a', 'b'), stack('c'), stack('d')]) as never;
    await settle();

    await cycleAndCommit('a', 3);

    expect(dockedPanes().sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('leaves the layout alone when the move is cancelled', async () => {
    dock.layout = split('horizontal', [stack('a', 'b'), stack('c')]) as never;
    await settle();
    const before = JSON.stringify(dock.layout.root);

    await armMove('a');
    await press({ key: 'ArrowRight' });
    await press({ key: 'Escape' });

    expect(JSON.stringify(dock.layout.root)).toBe(before);
  });
});

describe('the layout stays canonical after every move', () => {
  // Normalization runs at the end of every mutation, so a move can never leave
  // an empty stack, a single-child split, or two nested splits running the same
  // way — the shapes that make the tree grow a level per drag.
  const assertCanonical = (node: DockLayoutNode | null): void => {
    if (!node) return;
    if (node.kind === 'stack') {
      expect(node.panes.length, 'no empty stacks').toBeGreaterThan(0);
      expect(node.panes, 'active pane is real').toContain(node.activePane);
      return;
    }
    expect(node.children.length, 'no single-child splits').toBeGreaterThan(1);
    for (const child of node.children) {
      if (child.kind === 'split') {
        expect(child.direction, 'no same-direction nesting').not.toBe(node.direction);
      }
      assertCanonical(child);
    }
    expect(node.sizes?.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  };

  it.each(['r', 'l', 't', 'b'] as const)('after a %s split', async (zone) => {
    dock.layout = split('horizontal', [stack('a', 'b'), stack('c')]) as never;
    await settle();

    await moveToZone('a', zone);

    assertCanonical(dock.layout.root);
  });

  it('after a float', async () => {
    dock.layout = split('horizontal', [stack('a', 'b'), stack('c')]) as never;
    await settle();

    await moveToZone('a', 'f');

    assertCanonical(dock.layout.root);
    for (const window of dock.layout.floating) assertCanonical(window.root);
  });

  it('after a sequence of moves', async () => {
    dock.layout = split('horizontal', [stack('a', 'b'), stack('c', 'd')]) as never;
    await settle();

    await moveToZone('a', 'r');
    await moveToZone('c', 'b');
    await moveToZone('b', 't');

    assertCanonical(dock.layout.root);
    expect(dockedPanes().sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('closing a floating window', () => {
  it('removes it from the layout', async () => {
    dock.layout = {
      root: stack('docked'),
      floating: [{ bounds: { left: 0, top: 0, width: 300, height: 200 }, root: stack('float') }],
      titles: {},
    } as never;
    await settle();

    dock.shadowRoot!.querySelector<HTMLButtonElement>('.dock-floating__close')!.click();
    await settle();

    expect(dock.layout.floating).toHaveLength(0);
  });

  it('leaves the docked tree alone', async () => {
    dock.layout = {
      root: stack('docked'),
      floating: [{ bounds: { left: 0, top: 0, width: 300, height: 200 }, root: stack('float') }],
      titles: {},
    } as never;
    await settle();

    dock.shadowRoot!.querySelector<HTMLButtonElement>('.dock-floating__close')!.click();
    await settle();

    expect(dockedPanes()).toEqual(['docked']);
  });

  it('announces the change', async () => {
    const changes: Event[] = [];
    dock.layout = {
      root: stack('docked'),
      floating: [{ bounds: { left: 0, top: 0, width: 300, height: 200 }, root: stack('float') }],
      titles: {},
    } as never;
    await settle();
    dock.addEventListener('dock-layout-changed', (e) => changes.push(e));

    dock.shadowRoot!.querySelector<HTMLButtonElement>('.dock-floating__close')!.click();
    await settle();

    expect(changes.length).toBeGreaterThan(0);
  });
});

describe('pane titles', () => {
  it('labels a tab with the title the consumer supplied', async () => {
    dock.layout = { root: stack('a'), floating: [], titles: { a: 'Explorer' } } as never;
    await settle();

    expect(dock.shadowRoot!.textContent).toContain('Explorer');
  });

  it('falls back to the pane name when there is no title', async () => {
    dock.layout = stack('unnamed') as never;
    await settle();

    expect(dock.shadowRoot!.textContent).toContain('unnamed');
  });

  it('titles a floating window from the same map', async () => {
    dock.layout = {
      root: stack('docked'),
      floating: [
        { bounds: { left: 0, top: 0, width: 300, height: 200 }, root: stack('float') },
      ],
      titles: { float: 'Properties' },
    } as never;
    await settle();

    expect(dock.shadowRoot!.querySelector('.dock-floating__title')!.textContent).toContain(
      'Properties',
    );
  });
});

describe('floating window chrome', () => {
  const withFloating = (windows: number, titles: Record<string, string> = {}) => ({
    root: stack('docked'),
    floating: Array.from({ length: windows }, (_unused, i) => ({
      bounds: { left: i * 20, top: i * 20, width: 300, height: 200 },
      root: stack(`float${i}`),
    })),
    titles,
  });

  it('gives each window a dialog role that does not trap focus', async () => {
    dock.layout = withFloating(1) as never;
    await settle();

    const wrapper = dock.shadowRoot!.querySelector('.dock-floating')!;
    expect(wrapper.getAttribute('role')).toBe('dialog');
    expect(wrapper.getAttribute('aria-modal')).toBe('false');
  });

  // A floating pane is a window, not a modal — docked panes behind it stay
  // usable, so trapping focus would be a lie about what the user can reach.
  it('names each window by its own title element', async () => {
    dock.layout = withFloating(1, { float0: 'Properties' }) as never;
    await settle();

    const wrapper = dock.shadowRoot!.querySelector('.dock-floating')!;
    const titleId = wrapper.getAttribute('aria-labelledby')!;
    expect(wrapper.querySelector(`#${titleId}`)!.textContent).toContain('Properties');
  });

  it('gives every window a distinct title id', async () => {
    dock.layout = withFloating(2) as never;
    await settle();

    const ids = [...dock.shadowRoot!.querySelectorAll('.dock-floating')].map((w) =>
      w.getAttribute('aria-labelledby'),
    );
    expect(new Set(ids).size).toBe(2);
  });

  it('names the close button after the pane it closes', async () => {
    dock.layout = withFloating(1, { float0: 'Properties' }) as never;
    await settle();

    expect(
      dock.shadowRoot!.querySelector('.dock-floating__close')!.getAttribute('aria-label'),
    ).toContain('Properties');
  });

  it('stacks later windows above earlier ones', async () => {
    dock.layout = withFloating(3) as never;
    await settle();

    const depths = [...dock.shadowRoot!.querySelectorAll<HTMLElement>('.dock-floating')].map((w) =>
      Number(w.style.zIndex),
    );
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
    expect(new Set(depths).size).toBe(3);
  });

  it('honours a consumer z-index', async () => {
    dock.layout = {
      root: stack('docked'),
      floating: [
        { bounds: { left: 0, top: 0, width: 300, height: 200 }, root: stack('a'), zIndex: 500 },
      ],
      titles: {},
    } as never;
    await settle();

    expect(dock.shadowRoot!.querySelector<HTMLElement>('.dock-floating')!.style.zIndex).toBe('500');
  });

  it('positions and sizes each window from its bounds', async () => {
    dock.layout = withFloating(1) as never;
    await settle();

    const wrapper = dock.shadowRoot!.querySelector<HTMLElement>('.dock-floating')!;
    expect(wrapper.style.width).toBe('300px');
    expect(wrapper.style.height).toBe('200px');
  });

  /*
   * The CSS floor (12rem x 8rem) is dropped inline, so a host smaller than the
   * comfortable minimum can still shrink the window rather than have it
   * overflow the dock — where its chrome would be unreachable.
   */
  it('drops the CSS size floor so a tiny host can still shrink it', async () => {
    dock.layout = withFloating(1) as never;
    await settle();

    const wrapper = dock.shadowRoot!.querySelector<HTMLElement>('.dock-floating')!;
    expect(wrapper.style.minWidth).toBe('0');
    expect(wrapper.style.minHeight).toBe('0');
  });

  /*
   * `renderFloatingPanes` carries an empty-window placeholder reading "No panes
   * configured", and nothing can reach it: normalization runs at the end of
   * every mutation and DROPS any floating window whose root is null, so a
   * window with nothing in it never survives to be rendered. Recorded here
   * rather than tested, because a test would have to construct a state the
   * component does not allow.
   */
  it('drops an empty window rather than rendering a placeholder for it', async () => {
    dock.layout = {
      root: stack('docked'),
      floating: [{ bounds: { left: 0, top: 0, width: 300, height: 200 }, root: null }],
      titles: {},
    } as never;
    await settle();

    expect(dock.layout.floating).toHaveLength(0);
    expect(dock.shadowRoot!.querySelectorAll('.dock-floating')).toHaveLength(0);
  });

  it('closes only the window whose button was pressed', async () => {
    dock.layout = withFloating(2) as never;
    await settle();

    dock.shadowRoot!.querySelectorAll<HTMLButtonElement>('.dock-floating__close')[0].click();
    await settle();

    expect(dock.layout.floating).toHaveLength(1);
    expect(floatingPanes()).toEqual([['float1']]);
  });

  it('renders a resizer on every edge and corner', async () => {
    dock.layout = withFloating(1) as never;
    await settle();

    const resizers = dock.shadowRoot!.querySelectorAll('.dock-floating__resizer');
    expect(resizers.length).toBeGreaterThanOrEqual(8);
    expect([...resizers].every((r) => r.getAttribute('role') === 'separator')).toBe(true);
  });
});
