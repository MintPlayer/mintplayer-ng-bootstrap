import { describe, expect, it } from 'vitest';

import type { DockLayoutNode, DockSplitNode, DockStackNode } from '../types/dock-layout';
import {
  cloneLayoutNode,
  collectPaneNames,
  dockNodeBeside,
  findFirstPaneName,
  findParentSplit,
  findStackContainingPane,
  forEachStack,
  getNodeAtPath,
  normalizeLayoutNode,
  removePaneFromStack,
  replaceNodeInTree,
} from './layout-tree';
import { formatPath, parsePath, pathsEqual, type DockPath } from './types';

/**
 * The dock's layout algebra. Every drag, drop, close and resize is a
 * transformation of this tree, and a wrong one produces a layout that renders
 * happily and is simply not what the user asked for — no error, no console
 * warning, just a pane in the wrong place or a split that grows an extra level
 * every time something is dragged through it.
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

describe('getNodeAtPath', () => {
  const a = stack('a');
  const b = stack('b');
  const c = stack('c');
  const inner = split('vertical', [b, c]);
  const root = split('horizontal', [a, inner]);

  it('returns the root for the empty path', () => {
    expect(getNodeAtPath(root, [])).toBe(root);
  });

  it('walks one level', () => {
    expect(getNodeAtPath(root, [0])).toBe(a);
    expect(getNodeAtPath(root, [1])).toBe(inner);
  });

  it('walks several levels', () => {
    expect(getNodeAtPath(root, [1, 1])).toBe(c);
  });

  it('returns null for a missing child', () => {
    expect(getNodeAtPath(root, [5])).toBeNull();
    expect(getNodeAtPath(root, [1, 9])).toBeNull();
  });

  // A path that tries to descend into a stack is not merely absent, it is
  // ill-formed — and it happens whenever a stale path outlives a drag that
  // replaced a split with the stack it contained.
  it('returns null when the path descends into a stack', () => {
    expect(getNodeAtPath(root, [0, 0])).toBeNull();
  });

  it('returns null for an empty layout', () => {
    expect(getNodeAtPath(null, [])).toBeNull();
    expect(getNodeAtPath(null, [0])).toBeNull();
  });
});

describe('findParentSplit', () => {
  it('finds a direct child', () => {
    const a = stack('a');
    const root = split('horizontal', [a, stack('b')]);
    expect(findParentSplit(root, a)).toEqual({ parent: root, index: 0 });
  });

  it('finds a deeply nested child', () => {
    const c = stack('c');
    const inner = split('vertical', [stack('b'), c]);
    const root = split('horizontal', [stack('a'), inner]);
    expect(findParentSplit(root, c)).toEqual({ parent: inner, index: 1 });
  });

  // The root has no parent, and a caller that assumed one would splice into a
  // split that does not exist. Replacing the root is a different operation.
  it('returns null for the root itself', () => {
    const root = split('horizontal', [stack('a')]);
    expect(findParentSplit(root, root)).toBeNull();
  });

  it('returns null for a node that is not in the tree', () => {
    const root = split('horizontal', [stack('a')]);
    expect(findParentSplit(root, stack('stranger'))).toBeNull();
  });

  it('returns null for an empty layout or a bare stack root', () => {
    const only = stack('a');
    expect(findParentSplit(null, only)).toBeNull();
    expect(findParentSplit(only, only)).toBeNull();
  });

  // Identity, not equality: two stacks holding the same panes are different
  // nodes, and this is what lets a drag move one of two identical-looking ones.
  it('matches by identity rather than by value', () => {
    const target = stack('a');
    const twin = stack('a');
    const root = split('horizontal', [twin, target]);
    expect(findParentSplit(root, target)?.index).toBe(1);
  });
});

describe('replaceNodeInTree', () => {
  it('swaps a nested node in place and keeps the root', () => {
    const b = stack('b');
    const replacement = stack('x');
    const root = split('horizontal', [stack('a'), b]);

    expect(replaceNodeInTree(root, b, replacement)).toBe(root);
    expect(root.children[1]).toBe(replacement);
  });

  // Replacing the root cannot be done by mutation, so the caller has to take
  // the return value. A caller that ignores it keeps rendering the old tree.
  it('returns the replacement when the target is the root', () => {
    const root = stack('a');
    const replacement = split('horizontal', [stack('a'), stack('b')]);
    expect(replaceNodeInTree(root, root, replacement)).toBe(replacement);
  });

  it('returns the replacement when there is no tree yet', () => {
    const replacement = stack('a');
    expect(replaceNodeInTree(null, stack('other'), replacement)).toBe(replacement);
  });

  // A drag whose source vanished mid-gesture is an ordinary event, not an
  // error — the tree is left exactly as it was.
  it('leaves the tree untouched when the target is absent', () => {
    const root = split('horizontal', [stack('a')]);
    const before = JSON.stringify(root);
    expect(replaceNodeInTree(root, stack('gone'), stack('x'))).toBe(root);
    expect(JSON.stringify(root)).toBe(before);
  });

  it('renormalizes the parent weights after the swap', () => {
    const b = stack('b');
    const root = split('horizontal', [stack('a'), b], [7, 3]);

    replaceNodeInTree(root, b, stack('x'));

    expect(root.sizes).toEqual([0.7, 0.3]);
  });
});

describe('dockNodeBeside', () => {
  /*
   * The whole point of the function is choosing between splicing and wrapping.
   * Splicing into an existing split of the right axis keeps the tree flat;
   * wrapping every time would grow one level per drop and produce a tree that
   * looks identical on screen while normalization has to keep undoing it.
   */
  it('splices into a parent that already runs the right way', () => {
    const target = stack('b');
    const root = split('horizontal', [stack('a'), target]);

    const result = dockNodeBeside(root, target, stack('new'), 'right') as DockSplitNode;

    expect(result).toBe(root);
    expect(result.children).toHaveLength(3);
    expect((result.children[2] as DockStackNode).panes).toEqual(['new']);
  });

  it('splices before the target for a left drop', () => {
    const target = stack('b');
    const root = split('horizontal', [stack('a'), target]);

    const result = dockNodeBeside(root, target, stack('new'), 'left') as DockSplitNode;

    expect((result.children[1] as DockStackNode).panes).toEqual(['new']);
  });

  it('wraps the target in a new split when the axis differs', () => {
    const target = stack('b');
    const root = split('horizontal', [stack('a'), target]);

    dockNodeBeside(root, target, stack('new'), 'bottom');

    const wrapper = root.children[1] as DockSplitNode;
    expect(wrapper.kind).toBe('split');
    expect(wrapper.direction).toBe('vertical');
    expect(wrapper.children).toEqual([target, expect.objectContaining({ panes: ['new'] })]);
  });

  it('puts the newcomer first for a top drop', () => {
    const target = stack('b');
    const root = split('horizontal', [stack('a'), target]);

    dockNodeBeside(root, target, stack('new'), 'top');

    expect(((root.children[1] as DockSplitNode).children[0] as DockStackNode).panes).toEqual(['new']);
  });

  it('splits an even 50/50 when it wraps', () => {
    const target = stack('b');
    const root = split('horizontal', [stack('a'), target]);

    dockNodeBeside(root, target, stack('new'), 'bottom');

    expect((root.children[1] as DockSplitNode).sizes).toEqual([0.5, 0.5]);
  });

  it('wraps a bare stack root and returns the new root', () => {
    const root = stack('a');

    const result = dockNodeBeside(root, root, stack('new'), 'right') as DockSplitNode;

    expect(result.kind).toBe('split');
    expect(result.direction).toBe('horizontal');
    expect(result.children[0]).toBe(root);
  });

  it('reweights the parent when it splices', () => {
    const target = stack('b');
    const root = split('horizontal', [stack('a'), target], [0.5, 0.5]);

    dockNodeBeside(root, target, stack('new'), 'right');

    expect(root.sizes?.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(root.sizes).toHaveLength(3);
  });

  it.each([
    ['left', 'horizontal'],
    ['right', 'horizontal'],
    ['top', 'vertical'],
    ['bottom', 'vertical'],
  ] as const)('maps the %s zone to a %s split', (zone, direction) => {
    const target = stack('a');
    const result = dockNodeBeside(target, target, stack('new'), zone) as DockSplitNode;
    expect(result.direction).toBe(direction);
  });
});

describe('forEachStack', () => {
  it('visits a single stack at the root path', () => {
    const seen: [string[], number[]][] = [];
    forEachStack(stack('a'), (s, path) => seen.push([s.panes, path]));
    expect(seen).toEqual([[['a'], []]]);
  });

  it('visits every stack in document order with its path', () => {
    const tree = split('horizontal', [stack('a'), split('vertical', [stack('b'), stack('c')])]);
    const seen: [string, number[]][] = [];

    forEachStack(tree, (s, path) => seen.push([s.panes[0], path]));

    expect(seen).toEqual([
      ['a', [0]],
      ['b', [1, 0]],
      ['c', [1, 1]],
    ]);
  });

  // The paths it hands out are the ones `getNodeAtPath` consumes; if the two
  // ever disagree, a drop resolves to the wrong node.
  it('produces paths that resolve back to the same stacks', () => {
    const tree = split('horizontal', [stack('a'), split('vertical', [stack('b'), stack('c')])]);

    forEachStack(tree, (s, path) => {
      expect(getNodeAtPath(tree, path)).toBe(s);
    });
  });

  it('does nothing for an empty layout', () => {
    const seen: unknown[] = [];
    forEachStack(null, (s) => seen.push(s));
    expect(seen).toEqual([]);
  });
});

describe('findStackContainingPane', () => {
  const tree = split('horizontal', [stack('a', 'b'), stack('c')]);

  it('finds the stack holding the pane', () => {
    expect(findStackContainingPane(tree, 'b')).toBe(tree.children[0]);
    expect(findStackContainingPane(tree, 'c')).toBe(tree.children[1]);
  });

  it('returns null for an unknown pane', () => {
    expect(findStackContainingPane(tree, 'zzz')).toBeNull();
  });

  it('returns the first match when a pane appears twice', () => {
    const duplicated = split('horizontal', [stack('dup'), stack('dup')]);
    expect(findStackContainingPane(duplicated, 'dup')).toBe(duplicated.children[0]);
  });

  it('returns null for an empty layout', () => {
    expect(findStackContainingPane(null, 'a')).toBeNull();
  });
});

describe('findFirstPaneName', () => {
  it('prefers the first stack active tab', () => {
    const tree = split('horizontal', [{ kind: 'stack', panes: ['a', 'b'], activePane: 'b' }, stack('c')]);
    expect(findFirstPaneName(tree)).toBe('b');
  });

  // A stale `activePane` is the normal aftermath of closing a tab, so falling
  // back rather than returning a name that no longer exists is the contract.
  it('falls back to the first tab when the active one is stale', () => {
    const tree: DockLayoutNode = { kind: 'stack', panes: ['a', 'b'], activePane: 'gone' };
    expect(findFirstPaneName(tree)).toBe('a');
  });

  it('falls back when there is no active tab at all', () => {
    const tree: DockLayoutNode = { kind: 'stack', panes: ['a'] };
    expect(findFirstPaneName(tree)).toBe('a');
  });

  it('skips an empty stack and takes the next one', () => {
    const tree = split('horizontal', [{ kind: 'stack', panes: [] }, stack('b')]);
    expect(findFirstPaneName(tree)).toBe('b');
  });

  it('returns null for an empty layout', () => {
    expect(findFirstPaneName(null)).toBeNull();
    expect(findFirstPaneName({ kind: 'stack', panes: [] })).toBeNull();
  });
});

describe('collectPaneNames', () => {
  it('lists every pane in document order', () => {
    const tree = split('horizontal', [stack('a', 'b'), split('vertical', [stack('c'), stack('d')])]);
    expect(collectPaneNames(tree)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns nothing for an empty layout', () => {
    expect(collectPaneNames(null)).toEqual([]);
  });

  // Duplicates are reported rather than deduplicated: a pane appearing twice is
  // a layout defect the caller has to see, not something to paper over.
  it('reports a duplicated pane twice', () => {
    expect(collectPaneNames(split('horizontal', [stack('dup'), stack('dup')]))).toEqual(['dup', 'dup']);
  });
});

describe('removePaneFromStack', () => {
  it('drops the pane and reports the stack is still populated', () => {
    const s = stack('a', 'b');
    expect(removePaneFromStack(s, 'b')).toBe(false);
    expect(s.panes).toEqual(['a']);
  });

  it('reports true once the last pane goes', () => {
    const s = stack('a');
    expect(removePaneFromStack(s, 'a')).toBe(true);
    expect(s.panes).toEqual([]);
  });

  // Closing the active tab has to leave a valid one selected, or the stack
  // renders with nothing showing.
  it('moves the active tab when the active pane is the one removed', () => {
    const s: DockStackNode = { kind: 'stack', panes: ['a', 'b'], activePane: 'a' };
    removePaneFromStack(s, 'a');
    expect(s.activePane).toBe('b');
  });

  it('leaves a still-valid active tab alone', () => {
    const s: DockStackNode = { kind: 'stack', panes: ['a', 'b'], activePane: 'b' };
    removePaneFromStack(s, 'a');
    expect(s.activePane).toBe('b');
  });

  it('drops the active tab entirely when the stack empties', () => {
    const s = stack('a');
    removePaneFromStack(s, 'a');
    expect('activePane' in s).toBe(false);
  });

  it('is a no-op for a pane the stack does not hold', () => {
    const s = stack('a', 'b');
    expect(removePaneFromStack(s, 'zzz')).toBe(false);
    expect(s.panes).toEqual(['a', 'b']);
  });

  it('removes every copy of a duplicated pane', () => {
    const s = stack('dup', 'other', 'dup');
    removePaneFromStack(s, 'dup');
    expect(s.panes).toEqual(['other']);
  });
});

describe('cloneLayoutNode', () => {
  it('returns null for an empty layout', () => {
    expect(cloneLayoutNode(null)).toBeNull();
  });

  it('copies the structure by value', () => {
    const tree = split('horizontal', [stack('a'), stack('b')], [0.3, 0.7]);
    expect(cloneLayoutNode(tree)).toEqual(tree);
  });

  // A consumer's layout must never be mutated by a later drag, and a snapshot
  // handed back must never change underneath them.
  it('shares no nodes with the original', () => {
    const tree = split('horizontal', [stack('a'), stack('b')]);
    const copy = cloneLayoutNode(tree) as DockSplitNode;

    expect(copy).not.toBe(tree);
    expect(copy.children[0]).not.toBe(tree.children[0]);

    (copy.children[0] as DockStackNode).panes.push('injected');
    expect((tree.children[0] as DockStackNode).panes).toEqual(['a']);
  });

  it('copies a deeply nested tree', () => {
    const deep = split('horizontal', [split('vertical', [split('horizontal', [stack('deep')])])]);
    expect(cloneLayoutNode(deep)).toEqual(deep);
  });
});

describe('formatPath', () => {
  /*
   * This string is the join between the pointer and keyboard drop paths: one
   * reads it off `data-path` on the hovered element, the other carries it in
   * its candidate list. If the two ever disagree, a keyboard drop lands
   * somewhere the equivalent pointer drop would not.
   */
  it('formats a docked path', () => {
    expect(formatPath({ type: 'docked', segments: [1, 0] })).toBe('d:1/0');
  });

  it('formats the docked root as a bare prefix', () => {
    expect(formatPath({ type: 'docked', segments: [] })).toBe('d:');
  });

  it('formats a floating window root', () => {
    expect(formatPath({ type: 'floating', index: 2, segments: [] })).toBe('f:2');
  });

  it('formats a path inside a floating window', () => {
    expect(formatPath({ type: 'floating', index: 0, segments: [1, 2] })).toBe('f:0/1/2');
  });

  it('never collides a docked path with a floating one', () => {
    expect(formatPath({ type: 'docked', segments: [0] })).not.toBe(
      formatPath({ type: 'floating', index: 0, segments: [] }),
    );
  });
});

describe('normalizeLayoutNode — the invariants it establishes', () => {
  it('drops an empty stack', () => {
    expect(normalizeLayoutNode({ kind: 'stack', panes: [] })).toBeNull();
  });

  it('unwraps a split down to its only child', () => {
    const only = stack('a');
    expect(normalizeLayoutNode(split('horizontal', [only]))).toBe(only);
  });

  it('collapses a split whose children all vanish', () => {
    expect(
      normalizeLayoutNode(split('horizontal', [{ kind: 'stack', panes: [] }, { kind: 'stack', panes: [] }])),
    ).toBeNull();
  });

  it('flattens a same-direction child into its parent', () => {
    const result = normalizeLayoutNode(
      split('horizontal', [stack('a'), split('horizontal', [stack('b'), stack('c')])]),
    ) as DockSplitNode;

    expect(result.children).toHaveLength(3);
    expect(result.children.every((c) => c.kind === 'stack')).toBe(true);
  });

  it('leaves an opposite-direction child nested', () => {
    const result = normalizeLayoutNode(
      split('horizontal', [stack('a'), split('vertical', [stack('b'), stack('c')])]),
    ) as DockSplitNode;

    expect(result.children).toHaveLength(2);
    expect(result.children[1].kind).toBe('split');
  });

  // Flattening must not move anything on screen: the child's slot is
  // distributed across its grandchildren in proportion, so a 0.4 slot holding
  // 30/70 becomes 0.12 and 0.28.
  it('preserves on-screen geometry when it flattens', () => {
    const result = normalizeLayoutNode(
      split(
        'horizontal',
        [stack('a'), split('horizontal', [stack('b'), stack('c')], [0.3, 0.7])],
        [0.6, 0.4],
      ),
    ) as DockSplitNode;

    expect(result.sizes?.[0]).toBeCloseTo(0.6, 10);
    expect(result.sizes?.[1]).toBeCloseTo(0.12, 10);
    expect(result.sizes?.[2]).toBeCloseTo(0.28, 10);
  });

  it('repairs a stale active tab', () => {
    const result = normalizeLayoutNode({
      kind: 'stack',
      panes: ['a', 'b'],
      activePane: 'gone',
    }) as DockStackNode;
    expect(result.activePane).toBe('a');
  });

  it('leaves a valid active tab alone', () => {
    const result = normalizeLayoutNode({
      kind: 'stack',
      panes: ['a', 'b'],
      activePane: 'b',
    }) as DockStackNode;
    expect(result.activePane).toBe('b');
  });

  it('returns null for an empty layout', () => {
    expect(normalizeLayoutNode(null)).toBeNull();
  });

  // Idempotence is what makes it safe to run at the end of every mutation,
  // which is exactly how the element uses it.
  it('is idempotent over a deliberately messy tree', () => {
    const messy = split(
      'horizontal',
      [
        { kind: 'stack', panes: [] },
        split('horizontal', [stack('b'), split('horizontal', [stack('c')])]),
        split('vertical', [stack('d'), { kind: 'stack', panes: [] }]),
      ],
      [1, 2, 3],
    );

    const once = normalizeLayoutNode(messy);
    const twice = normalizeLayoutNode(JSON.parse(JSON.stringify(once)));

    expect(twice).toEqual(once);
  });

  it('always leaves weights summing to 1', () => {
    const result = normalizeLayoutNode(
      split('horizontal', [stack('a'), stack('b'), stack('c')], [5, 0, 5]),
    ) as DockSplitNode;
    expect(result.sizes?.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
});

/*
 * The cases below were written against the element, reaching in through
 * `dock.normalizeLayoutNode`, and moved here unchanged when the function moved.
 * Each one is a real layout a user produced by dragging — the "gap" names are
 * the original bug reports — so they are kept verbatim rather than rewritten
 * into the vocabulary above.
 */
describe('normalizeLayoutNode — the cases that produced it', () => {
  type AnyNode = {
    kind: 'split' | 'stack';
    direction?: 'horizontal' | 'vertical';
    sizes?: number[];
    children?: AnyNode[];
    panes?: string[];
    activePane?: string;
  };

  function normalize(node: AnyNode | null): AnyNode | null {
    return normalizeLayoutNode(node as unknown as DockLayoutNode | null) as unknown as AnyNode | null;
  }

  function aStack(...panes: string[]): AnyNode {
    return { kind: 'stack', panes, activePane: panes[0] };
  }

  function aSplit(
    direction: 'horizontal' | 'vertical',
    sizes: number[],
    ...children: AnyNode[]
  ): AnyNode {
    return { kind: 'split', direction, sizes, children };
  }

  // --- structural cleanup ---------------------------------------------------

  it('returns null for an empty stack', () => {
    expect(normalize({ kind: 'stack', panes: [] })).toBeNull();
  });

  it('returns null for a split with zero children', () => {
    expect(normalize(aSplit('horizontal', [], ))).toBeNull();
  });

  it('unwraps a split with a single child (gap C origin)', () => {
    const out = normalize(aSplit('horizontal', [1], aStack('a')));
    expect(out).toMatchObject({ kind: 'stack', panes: ['a'] });
  });

  it('drops empty stacks from a split before deciding length', () => {
    // V[empty, aStack(b), empty] → unwrapped to aStack(b)
    const out = normalize(
      aSplit(
        'vertical',
        [0.3, 0.4, 0.3],
        { kind: 'stack', panes: [] },
        aStack('b'),
        { kind: 'stack', panes: [] },
      ),
    );
    expect(out).toMatchObject({ kind: 'stack', panes: ['b'] });
  });

  // --- gap-targeted scenarios ----------------------------------------------

  it('gap A — flattens a same-direction child surfaced by a length-1 collapse', () => {
    // V[ V[aStack(a), aStack(b)] alone in its slot ] should bubble up to a flat
    // V split at this level. Modeled as: V[ inner V[a, b] ] which collapses
    // to V[a, b] then merges into a parent if same direction.
    // Single-direct-child: collapse, then re-test from above.
    const out = normalize(
      aSplit('vertical', [1.0], aSplit('vertical', [0.4, 0.6], aStack('a'), aStack('b'))),
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
      aSplit(
        'horizontal',
        [0.5, 0.5],
        aStack('p1'),
        aSplit('horizontal', [0.5, 0.5], aStack('p5'), aStack('floating')),
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
      aSplit(
        'vertical',
        [0.6, 0.4],
        aSplit('vertical', [0.4, 0.6], aStack('a'), aStack('b')),
        aStack('c'),
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
      aSplit(
        'horizontal',
        [0.5, 0.5],
        aStack('p1', 'p2'),
        aSplit('horizontal', [0.5, 0.5], aStack('p3'), aStack('p4')),
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
    const input = aSplit(
      'horizontal',
      [0.5, 0.5],
      aStack('a'),
      aSplit('vertical', [0.5, 0.5], aStack('b'), aStack('c')),
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
      aSplit(
        'horizontal',
        [0.7, 0.3],
        aStack('a'),
        aSplit('horizontal', [0.3, 0.7], aStack('b'), aStack('c')),
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
      aSplit(
        'horizontal',
        [3, 1], // non-normalized
        aStack('a'),
        aSplit('horizontal', [4, 6], aStack('b'), aStack('c')),
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
      aStack('a'),
      aSplit('horizontal', [0.5, 0.5], aStack('a'), aStack('b')),
      aSplit(
        'vertical',
        [0.4, 0.6],
        aSplit('vertical', [0.3, 0.7], aStack('a'), aStack('b')),
        aStack('c'),
      ),
      aSplit(
        'horizontal',
        [0.7, 0.3],
        aStack('a'),
        aSplit('horizontal', [0.3, 0.7], aStack('b'), aStack('c')),
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
});

/*
 * `parsePath` and `pathsEqual` moved here from the element alongside
 * `formatPath`, which is the function they have to agree with: the pointer drop
 * path formats a path onto `data-path`, and reads it back with `parsePath`. A
 * round-trip that loses anything sends a drop to the wrong node.
 */
describe('parsePath', () => {
  it('reads a docked path', () => {
    expect(parsePath('d:1/0')).toEqual({ type: 'docked', segments: [1, 0] });
  });

  it('reads a floating path', () => {
    expect(parsePath('f:2/1/0')).toEqual({ type: 'floating', index: 2, segments: [1, 0] });
  });

  it('reads a floating window root', () => {
    expect(parsePath('f:0')).toEqual({ type: 'floating', index: 0, segments: [] });
  });

  /*
   * The empty string is a VALID path — the root splitter is tagged
   * `data-path=""`, which is what joining an empty segment array produces.
   * Only null and undefined mean "no path"; conflating the two makes every drop
   * onto the root resolve to nothing at all.
   */
  it('reads the empty string as the docked root', () => {
    expect(parsePath('')).toEqual({ type: 'docked', segments: [] });
    expect(parsePath('d:')).toEqual({ type: 'docked', segments: [] });
  });

  it('reads nothing only for null or undefined', () => {
    expect(parsePath(null)).toBeNull();
    expect(parsePath(undefined)).toBeNull();
  });

  it('accepts a docked path with no prefix', () => {
    expect(parsePath('1/2')).toEqual({ type: 'docked', segments: [1, 2] });
  });

  // A dropped segment beats a NaN one: `NaN` would index the tree as
  // `undefined` and resolve, silently, to the wrong node.
  it('drops a segment it cannot read rather than admitting NaN', () => {
    expect(parsePath('d:1/x/2')).toEqual({ type: 'docked', segments: [1, 2] });
  });

  it('refuses a floating path with no readable index', () => {
    expect(parsePath('f:x')).toBeNull();
  });

  it('tolerates repeated separators', () => {
    expect(parsePath('d:1//2')).toEqual({ type: 'docked', segments: [1, 2] });
  });

  // The property that matters: whatever `formatPath` writes, `parsePath` reads
  // back unchanged. These two are the join between the pointer and keyboard
  // drop paths.
  it('round-trips everything formatPath can produce', () => {
    const paths: DockPath[] = [
      { type: 'docked', segments: [] },
      { type: 'docked', segments: [0] },
      { type: 'docked', segments: [1, 0, 3] },
      { type: 'floating', index: 0, segments: [] },
      { type: 'floating', index: 7, segments: [2] },
      { type: 'floating', index: 3, segments: [0, 1, 2] },
    ];

    for (const path of paths) {
      expect(parsePath(formatPath(path)), formatPath(path)).toEqual(path);
    }
  });
});

describe('pathsEqual', () => {
  it('matches two identical docked paths', () => {
    expect(pathsEqual({ type: 'docked', segments: [1, 0] }, { type: 'docked', segments: [1, 0] })).toBe(
      true,
    );
  });

  it('matches two identical floating paths', () => {
    expect(
      pathsEqual(
        { type: 'floating', index: 1, segments: [0] },
        { type: 'floating', index: 1, segments: [0] },
      ),
    ).toBe(true);
  });

  it('separates the two roots, which both have empty segments', () => {
    expect(
      pathsEqual({ type: 'docked', segments: [] }, { type: 'floating', index: 0, segments: [] }),
    ).toBe(false);
  });

  it('separates two floating windows at the same depth', () => {
    expect(
      pathsEqual(
        { type: 'floating', index: 0, segments: [1] },
        { type: 'floating', index: 1, segments: [1] },
      ),
    ).toBe(false);
  });

  it('separates paths of different depths', () => {
    expect(pathsEqual({ type: 'docked', segments: [1] }, { type: 'docked', segments: [1, 0] })).toBe(
      false,
    );
  });

  it('separates paths that differ at one segment', () => {
    expect(
      pathsEqual({ type: 'docked', segments: [1, 0] }, { type: 'docked', segments: [1, 2] }),
    ).toBe(false);
  });

  it('agrees with formatPath about identity', () => {
    const a: DockPath = { type: 'docked', segments: [1, 0] };
    const b: DockPath = { type: 'docked', segments: [1, 0] };
    expect(pathsEqual(a, b)).toBe(formatPath(a) === formatPath(b));
  });
});
