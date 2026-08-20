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

describe('the splitter reports a drag back as weights', () => {
  /*
   * `mp-splitter` finishes a divider drag by announcing the resulting PIXEL
   * sizes. The dock converts them back to flex weights, because the layout is
   * resolution-independent — a snapshot saved at one window size has to restore
   * correctly at another.
   */
  const resizeEnd = (splitter: Element, sizes: number[]) =>
    splitter.dispatchEvent(
      new CustomEvent('resize-end', { detail: { sizes }, bubbles: true, composed: true }),
    );

  it('converts pixel sizes into proportional weights', async () => {
    dock.layout = split('horizontal', [stack('a'), stack('b')], [0.5, 0.5]) as never;
    await settle();

    resizeEnd(dock.shadowRoot!.querySelector('.dock-split')!, [300, 100]);
    await settle();

    const sizes = (dock.layout.root as DockSplitNode).sizes!;
    expect(sizes[0] / sizes[1]).toBeCloseTo(3, 6);
  });

  it('keeps the weights summing to what they summed to before', async () => {
    dock.layout = split('horizontal', [stack('a'), stack('b')], [0.5, 0.5]) as never;
    await settle();

    resizeEnd(dock.shadowRoot!.querySelector('.dock-split')!, [300, 100]);
    await settle();

    const sizes = (dock.layout.root as DockSplitNode).sizes!;
    expect(sizes.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('announces the layout change so a host can persist it', async () => {
    const changes: Event[] = [];
    dock.layout = split('horizontal', [stack('a'), stack('b')]) as never;
    await settle();
    dock.addEventListener('dock-layout-changed', (e) => changes.push(e));

    resizeEnd(dock.shadowRoot!.querySelector('.dock-split')!, [300, 100]);
    await settle();

    expect(changes.length).toBeGreaterThan(0);
  });

  /*
   * `resize-end` bubbles, so a nested splitter's drag reaches the outer one's
   * listener too. Applying the INNER sizes to the OUTER node would mangle the
   * outer weights on every inner drag — hence the target check.
   */
  it('ignores a drag that finished in a nested splitter', async () => {
    dock.layout = split(
      'horizontal',
      [stack('a'), split('vertical', [stack('b'), stack('c')], [0.5, 0.5])],
      [0.5, 0.5],
    ) as never;
    await settle();

    const [outer, inner] = [...dock.shadowRoot!.querySelectorAll('.dock-split')];
    resizeEnd(inner, [300, 100]);
    await settle();

    const root = dock.layout.root as DockSplitNode;
    expect(root.sizes![0] / root.sizes![1]).toBeCloseTo(1, 6);
    expect(outer).not.toBe(inner);
  });

  it('applies a nested drag to the nested node', async () => {
    dock.layout = split('horizontal', [
      stack('a'),
      split('vertical', [stack('b'), stack('c')], [0.5, 0.5]),
    ]) as never;
    await settle();

    const inner = [...dock.shadowRoot!.querySelectorAll('.dock-split')][1];
    resizeEnd(inner, [300, 100]);
    await settle();

    const nested = (dock.layout.root as DockSplitNode).children[1] as DockSplitNode;
    expect(nested.sizes![0] / nested.sizes![1]).toBeCloseTo(3, 6);
  });

  it.each([[[]], [[0, 0]]])('ignores unusable sizes %j', async (sizes) => {
    dock.layout = split('horizontal', [stack('a'), stack('b')], [0.5, 0.5]) as never;
    await settle();

    resizeEnd(dock.shadowRoot!.querySelector('.dock-split')!, sizes as number[]);
    await settle();

    expect((dock.layout.root as DockSplitNode).sizes).toEqual([0.5, 0.5]);
  });
});

describe('activating a tab', () => {
  /*
   * **Not reachable under jsdom, and the product code is right.**
   *
   * `renderStack`'s `tab-activate` listener maps the tab id back to a pane with
   * `stack.querySelector(':scope > [data-tab-id=…]')`. The `:scope >` is
   * load-bearing — without the child combinator a nested stack's tabs would
   * match and activate the wrong pane — but **jsdom does not implement
   * `:scope`**: measured here, `stack.querySelector(':scope > *')` returns null
   * on an element with six children, while the same selector without `:scope`
   * finds them. So the lookup always fails and the handler always returns early,
   * whatever the test dispatches.
   *
   * Rewriting the selector to suit the test runner would trade a correct
   * scoping rule for a coverage line. The activation path is covered by the
   * dock e2e specs against a real engine instead; what IS asserted here is the
   * precondition the handler depends on — that every tab carries the id and
   * pane name it will be looked up by, as a direct child of its stack.
   */
  it('gives every tab the id and pane name the activation handler looks up', async () => {
    dock.layout = split('horizontal', [stack('a', 'b'), stack('c')]) as never;
    await settle();

    const tabs = [...dock.shadowRoot!.querySelectorAll<HTMLElement>('.dock-tab')];
    expect(tabs).toHaveLength(3);
    for (const tab of tabs) {
      expect(tab.dataset['tabId'], tab.outerHTML).toBeTruthy();
      expect(tab.dataset['pane'], tab.outerHTML).toBeTruthy();
      expect(tab.parentElement!.classList.contains('dock-stack')).toBe(true);
    }
  });

  it('gives every tab a distinct id', async () => {
    dock.layout = split('horizontal', [stack('a', 'b'), stack('c')]) as never;
    await settle();

    const ids = [...dock.shadowRoot!.querySelectorAll<HTMLElement>('.dock-tab')].map(
      (t) => t.dataset['tabId'],
    );
    expect(new Set(ids).size).toBe(3);
  });

  it('marks the active tab on its own stack', async () => {
    dock.layout = split('horizontal', [
      { kind: 'stack', panes: ['a', 'b'], activePane: 'b' },
      stack('c'),
    ]) as never;
    await settle();

    const [first, second] = [...dock.shadowRoot!.querySelectorAll<HTMLElement>('.dock-stack')];
    const tabB = dock.shadowRoot!.querySelector<HTMLElement>('.dock-tab[data-pane="b"]')!;

    expect(first.getAttribute('active-tab')).toBe(tabB.dataset['tabId']);
    expect(second.dataset['activePane']).toBe('c');
  });
});

describe('dropping into an empty main area', () => {
  /*
   * A dock whose panes have all been floated has no root at all, and
   * `handleDrop` carries a dedicated branch for it: there is no target stack to
   * merge into, so the pane becomes the new root. Without it a user who floated
   * everything could never dock anything again.
   *
   * Driven through `handleDrop` directly because the enumerated keyboard
   * candidates deliberately list only DOCKED stacks — and there are none — so
   * this branch has no keyboard route to it.
   */
  const dropIntoEmptyRoot = async (pane: string): Promise<void> => {
    (dock as unknown as { dragState: unknown }).dragState = {
      pane,
      sourcePath: { type: 'floating', index: 0, segments: [] },
    };
    (dock as unknown as { handleDrop: (p: unknown, z: string) => void }).handleDrop(
      { type: 'docked', segments: [] },
      'center',
    );
    await settle();
  };

  async function floatEverything(): Promise<void> {
    dock.layout = stack('a') as never;
    await settle();
    await moveToZone('a', 'f');
    await settle();
  }

  it('starts from a dock with no root at all', async () => {
    await floatEverything();
    expect(dock.layout.root).toBeNull();
    expect(floatingPanes()).toEqual([['a']]);
  });

  it('accepts a pane back when nothing is docked', async () => {
    await floatEverything();

    await dropIntoEmptyRoot('a');

    expect(dockedPanes()).toEqual(['a']);
  });

  it('empties the floating window, so normalization drops it', async () => {
    await floatEverything();

    await dropIntoEmptyRoot('a');

    expect(dock.layout.floating).toHaveLength(0);
  });

  it('renders the pane back in the main area', async () => {
    await floatEverything();

    await dropIntoEmptyRoot('a');

    expect(dock.shadowRoot!.querySelectorAll('.dock-stack[data-path^="d:"]')).toHaveLength(1);
  });

  it('announces the layout change', async () => {
    await floatEverything();
    const changes: Event[] = [];
    dock.addEventListener('dock-layout-changed', (e) => changes.push(e));

    await dropIntoEmptyRoot('a');

    expect(changes.length).toBeGreaterThan(0);
  });
});

describe('moving a pane out of a floating window', () => {
  async function withFloatedPane(): Promise<void> {
    dock.layout = split('horizontal', [stack('a'), stack('b')]) as never;
    await settle();
    await moveToZone('b', 'f');
    await settle();
  }

  async function armFromFloating(pane: string): Promise<void> {
    (dock as unknown as { paneMoveMode: unknown }).paneMoveMode = {
      paneName: pane,
      sourcePath: { type: 'floating', index: 0, segments: [] },
    };
    (dock as unknown as { paneMoveCandidateIndex: number | null }).paneMoveCandidateIndex = null;
    await settle();
  }

  it('merges it back into a docked stack', async () => {
    await withFloatedPane();
    expect(floatingPanes()).toEqual([['b']]);

    await armFromFloating('b');
    await press({ key: 'ArrowRight' });
    await press({ key: 'Enter' });

    expect(dockedPanes().sort()).toEqual(['a', 'b']);
  });

  it('closes the window it emptied', async () => {
    await withFloatedPane();

    await armFromFloating('b');
    await press({ key: 'ArrowRight' });
    await press({ key: 'Enter' });

    expect(dock.layout.floating).toHaveLength(0);
  });

  it('leaves the docked tree canonical afterwards', async () => {
    await withFloatedPane();

    await armFromFloating('b');
    await press({ key: 'ArrowRight' });
    await press({ key: 'Enter' });

    expect(dock.layout.root).not.toBeNull();
    expect(dockedPanes().sort()).toEqual(['a', 'b']);
  });
});

describe('dropping a pane back onto its own stack', () => {
  /*
   * The one drop that changes tab ORDER rather than layout: a centre drop whose
   * source and target paths are the same stack moves the pane to the end of the
   * header and activates it. It is the reason `handleDrop` checks path equality
   * before the general remove-then-add path — running that path here would
   * remove the pane, then normalization would collapse a stack that briefly had
   * one fewer pane, and a same-stack reorder would destroy the layout.
   *
   * Driven through `handleDrop` directly because the enumerated keyboard
   * candidates skip the pane's own stack: there is no keyboard route to a
   * no-op-looking target, so this branch is pointer-only in the product and
   * pure data here.
   */
  const dropOnSelf = async (pane: string, path: unknown): Promise<void> => {
    (dock as unknown as { dragState: unknown }).dragState = { pane, sourcePath: path };
    (dock as unknown as { handleDrop: (p: unknown, z: string) => void }).handleDrop(path, 'center');
    await settle();
  };

  const floatingPath = (index: number) => ({ type: 'floating', index, segments: [] });

  it('moves the pane to the end of its own header', async () => {
    dock.layout = stack('a', 'b', 'c') as never;
    await settle();

    await dropOnSelf('a', pathOf('a'));

    expect((dock.layout.root as DockStackNode).panes).toEqual(['b', 'c', 'a']);
  });

  it('activates the pane that was dropped', async () => {
    dock.layout = stack('a', 'b', 'c') as never;
    await settle();

    await dropOnSelf('a', pathOf('a'));

    expect((dock.layout.root as DockStackNode).activePane).toBe('a');
  });

  it('is a no-op for a pane that is already last', async () => {
    dock.layout = stack('a', 'b', 'c') as never;
    await settle();

    await dropOnSelf('c', pathOf('c'));

    expect((dock.layout.root as DockStackNode).panes).toEqual(['a', 'b', 'c']);
    expect((dock.layout.root as DockStackNode).activePane).toBe('c');
  });

  it('leaves the other stacks of a split alone', async () => {
    dock.layout = split('horizontal', [stack('a', 'b'), stack('c', 'd')]) as never;
    await settle();

    await dropOnSelf('a', pathOf('a'));

    const root = dock.layout.root as DockSplitNode;
    expect((root.children[0] as DockStackNode).panes).toEqual(['b', 'a']);
    expect((root.children[1] as DockStackNode).panes).toEqual(['c', 'd']);
  });

  it('announces the layout change so a host can persist the new tab order', async () => {
    dock.layout = stack('a', 'b') as never;
    await settle();
    const changes: Event[] = [];
    dock.addEventListener('dock-layout-changed', (e) => changes.push(e));

    await dropOnSelf('a', pathOf('a'));

    expect(changes.length).toBeGreaterThan(0);
  });

  it('marks the drop handled, so the drag does not fall through to a cancel', async () => {
    dock.layout = stack('a', 'b') as never;
    await settle();

    await dropOnSelf('a', pathOf('a'));

    expect((dock as unknown as { dragState: { dropHandled?: boolean } }).dragState.dropHandled).toBe(
      true,
    );
  });

  it('ignores a pane that is not in the stack it claims to come from', async () => {
    dock.layout = stack('a', 'b') as never;
    await settle();

    await dropOnSelf('ghost', pathOf('a'));

    expect((dock.layout.root as DockStackNode).panes).toEqual(['a', 'b']);
  });

  /*
   * A floating window keeps its own `activePane` alongside the stack node's,
   * because the window chrome reads the former to title itself. Reordering
   * inside a floating stack has to write both, or the title stops matching the
   * tab that is actually showing.
   */
  it('reorders inside a floating window too', async () => {
    dock.layout = {
      root: stack('a'),
      floating: [{ bounds: { left: 10, top: 10, width: 300, height: 200 }, root: stack('x', 'y', 'z') }],
    } as never;
    await settle();

    await dropOnSelf('x', floatingPath(0));

    const root = dock.layout.floating[0].root as DockStackNode;
    expect(root.panes).toEqual(['y', 'z', 'x']);
  });

  it('keeps the floating window title in step with the reordered tab', async () => {
    dock.layout = {
      root: stack('a'),
      floating: [{ bounds: { left: 10, top: 10, width: 300, height: 200 }, root: stack('x', 'y') }],
    } as never;
    await settle();

    await dropOnSelf('x', floatingPath(0));

    const window0 = dock.layout.floating[0];
    expect((window0.root as DockStackNode).activePane).toBe('x');
    expect(window0.activePane).toBe('x');
  });
});

describe('dropping a whole floating window', () => {
  /*
   * Dragging a floating window by its title bar moves the WHOLE window, not one
   * pane: every pane it holds lands in the target, the window closes, and the
   * pane that was showing stays showing. `handleFloatingStackDrop` is a
   * separate path from `handleDrop` for exactly that reason — the unit of the
   * move is a subtree, so an edge zone splits the target against the window's
   * own tree rather than against a single stack.
   *
   * It takes `(sourceIndex, targetPath, zone)` and reads no geometry, so the
   * semantics are drivable here; which window the pointer was over when it was
   * released is the e2e specs' job.
   */
  const drop = async (sourceIndex: number, targetPath: unknown, zone: string): Promise<boolean> => {
    const handled = (
      dock as unknown as {
        handleFloatingStackDrop: (i: number, p: unknown, z: string) => boolean;
      }
    ).handleFloatingStackDrop(sourceIndex, targetPath, zone);
    await settle();
    return handled;
  };

  const win = (root: DockLayoutNode, activePane?: string) => ({
    bounds: { left: 10, top: 10, width: 300, height: 200 },
    root,
    activePane,
  });

  const docked = (...segments: number[]) => ({ type: 'docked', segments });
  const floatingPath = (index: number) => ({ type: 'floating', index, segments: [] });

  it('merges every pane of the window into the target stack', async () => {
    dock.layout = { root: stack('a'), floating: [win(stack('x', 'y'))] } as never;
    await settle();

    expect(await drop(0, docked(), 'center')).toBe(true);

    expect((dock.layout.root as DockStackNode).panes).toEqual(['a', 'x', 'y']);
  });

  it('closes the window it emptied', async () => {
    dock.layout = { root: stack('a'), floating: [win(stack('x', 'y'))] } as never;
    await settle();

    await drop(0, docked(), 'center');

    expect(dock.layout.floating).toHaveLength(0);
  });

  it("keeps the window's showing pane showing", async () => {
    dock.layout = { root: stack('a'), floating: [win(stack('x', 'y'), 'y')] } as never;
    await settle();

    await drop(0, docked(), 'center');

    expect((dock.layout.root as DockStackNode).activePane).toBe('y');
  });

  it('falls back to the first pane when the window names one it does not hold', async () => {
    dock.layout = { root: stack('a'), floating: [win(stack('x', 'y'), 'ghost')] } as never;
    await settle();

    await drop(0, docked(), 'center');

    expect((dock.layout.root as DockStackNode).activePane).toBe('x');
  });

  it('splits the target against the window subtree on an edge zone', async () => {
    dock.layout = { root: stack('a'), floating: [win(split('vertical', [stack('x'), stack('y')]))] } as never;
    await settle();

    expect(await drop(0, docked(), 'right')).toBe(true);

    const root = dock.layout.root as DockSplitNode;
    expect(root.kind).toBe('split');
    expect(root.direction).toBe('horizontal');
    expect(dockedPanes()).toEqual(['a', 'x', 'y']);
  });

  it('adopts the window as the root when nothing is docked', async () => {
    dock.layout = { root: null, floating: [win(stack('x', 'y'))] } as never;
    await settle();

    expect(await drop(0, docked(), 'center')).toBe(true);

    expect(dockedPanes()).toEqual(['x', 'y']);
    expect(dock.layout.floating).toHaveLength(0);
  });

  it('merges one floating window into another', async () => {
    dock.layout = {
      root: stack('a'),
      floating: [win(stack('x')), win(stack('y'))],
    } as never;
    await settle();

    expect(await drop(0, floatingPath(1), 'center')).toBe(true);

    expect(floatingPanes()).toEqual([['y', 'x']]);
  });

  it('splits one floating window against another on an edge zone', async () => {
    dock.layout = {
      root: stack('a'),
      floating: [win(stack('x')), win(stack('y'))],
    } as never;
    await settle();

    expect(await drop(0, floatingPath(1), 'bottom')).toBe(true);

    expect(dock.layout.floating).toHaveLength(1);
    expect((dock.layout.floating[0].root as DockSplitNode).kind).toBe('split');
    expect(floatingPanes()).toEqual([['y', 'x']]);
  });

  it('refuses to drop a window onto itself', async () => {
    dock.layout = { root: stack('a'), floating: [win(stack('x'))] } as never;
    await settle();

    expect(await drop(0, floatingPath(0), 'center')).toBe(false);

    expect(floatingPanes()).toEqual([['x']]);
  });

  it.each([
    ['a source index that is not a window', 3, () => docked()],
    ['a target path that resolves to nothing', 0, () => docked(9, 9)],
  ])('refuses %s', async (_label, index, path) => {
    dock.layout = { root: stack('a'), floating: [win(stack('x'))] } as never;
    await settle();

    expect(await drop(index as number, (path as () => unknown)(), 'center')).toBe(false);

    expect(dockedPanes()).toEqual(['a']);
  });

  it('refuses a window whose root is empty', async () => {
    dock.layout = { root: stack('a'), floating: [win(stack('x'))] } as never;
    await settle();
    (dock as unknown as { floatingLayouts: { root: unknown }[] }).floatingLayouts[0].root = null;

    expect(await drop(0, docked(), 'center')).toBe(false);
  });

  it('announces the layout change', async () => {
    dock.layout = { root: stack('a'), floating: [win(stack('x'))] } as never;
    await settle();
    const changes: Event[] = [];
    dock.addEventListener('dock-layout-changed', (e) => changes.push(e));

    await drop(0, docked(), 'center');

    expect(changes.length).toBeGreaterThan(0);
  });
});

describe('reordering a pane to a chosen position in its header', () => {
  /*
   * Dropping a tab between two other tabs, rather than onto the stack body,
   * moves it to that exact index instead of to the end. Working out WHICH index
   * needs tab-button rects and is geometry-bound — that half lives in
   * `computeHeaderInsertIndex` / `finalizeDropFromPoint` and is covered by the
   * dock e2e specs. What the index MEANS is pure array work, and is asserted
   * here by calling the reorder with an index directly, the same way the drop
   * tests above call `handleDrop` with a path.
   *
   * The clamp is the part worth pinning: `headerInsertIndex` can return
   * `panes.length` for a drop past the last tab, which is one beyond a valid
   * splice target once the pane itself has been removed.
   */
  const reorder = async (pane: string, index: number, path?: unknown): Promise<void> => {
    const location = (
      dock as unknown as { resolveStackLocation: (p: unknown) => unknown }
    ).resolveStackLocation(path ?? pathOf(pane));
    (
      dock as unknown as {
        reorderPaneInLocationAtIndex: (l: unknown, p: string, i: number) => void;
      }
    ).reorderPaneInLocationAtIndex(location, pane, index);
    (dock as unknown as { renderLayout: () => void }).renderLayout();
    await settle();
  };

  const panesNow = () => (dock.layout.root as DockStackNode).panes;

  it.each([
    [0, ['c', 'a', 'b', 'd']],
    [1, ['a', 'c', 'b', 'd']],
    [3, ['a', 'b', 'd', 'c']],
  ])('moves the pane to index %i', async (index, expected) => {
    dock.layout = stack('a', 'b', 'c', 'd') as never;
    await settle();

    await reorder('c', index as number);

    expect(panesNow()).toEqual(expected);
  });

  it('clamps an index past the last tab to the end', async () => {
    dock.layout = stack('a', 'b', 'c') as never;
    await settle();

    await reorder('a', 99);

    expect(panesNow()).toEqual(['b', 'c', 'a']);
  });

  it('clamps a negative index to the front', async () => {
    dock.layout = stack('a', 'b', 'c') as never;
    await settle();

    await reorder('c', -5);

    expect(panesNow()).toEqual(['c', 'a', 'b']);
  });

  it('activates the pane it moved', async () => {
    dock.layout = stack('a', 'b', 'c') as never;
    await settle();

    await reorder('c', 0);

    expect((dock.layout.root as DockStackNode).activePane).toBe('c');
  });

  it('leaves the stack alone when the pane is already at that index', async () => {
    dock.layout = { root: { kind: 'stack', panes: ['a', 'b', 'c'], activePane: 'b' } } as never;
    await settle();

    await reorder('a', 0);

    expect(panesNow()).toEqual(['a', 'b', 'c']);
    expect((dock.layout.root as DockStackNode).activePane).toBe('b');
  });

  it('ignores a pane the stack does not hold', async () => {
    dock.layout = stack('a', 'b') as never;
    await settle();

    await reorder('ghost', 0, pathOf('a'));

    expect(panesNow()).toEqual(['a', 'b']);
  });

  it('keeps a floating window title in step with the reordered tab', async () => {
    dock.layout = {
      root: stack('a'),
      floating: [
        {
          bounds: { left: 10, top: 10, width: 300, height: 200 },
          root: stack('x', 'y', 'z'),
          activePane: 'x',
        },
      ],
    } as never;
    await settle();

    await reorder('z', 0, { type: 'floating', index: 0, segments: [] });

    const window0 = dock.layout.floating[0];
    expect((window0.root as DockStackNode).panes).toEqual(['z', 'x', 'y']);
    expect(window0.activePane).toBe('z');
  });
});
