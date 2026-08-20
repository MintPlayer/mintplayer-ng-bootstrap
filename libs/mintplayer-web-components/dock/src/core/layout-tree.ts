import type {
  DockFloatingStackLayout,
  DockLayoutNode,
  DockSplitNode,
  DockStackNode,
} from '../types/dock-layout';
import { insertWeight, normalizeSizesArray, normalizeSplitNode } from './sizes';
import type { DockPath, DropZone } from './types';

/**
 * The dock's layout is a tree of splits and stacks, and every drag, drop, close
 * and resize is a transformation of that tree. This module is that algebra,
 * with no DOM in it: the element renders whatever the tree says, so any bug
 * here shows up as a layout that is wrong rather than as an error.
 *
 * Two conventions run through all of it. **A path is a walk of child indices**
 * from a root, so `[]` is the root itself and `[1, 0]` is the first child of the
 * second. And **node identity is by reference**, not by value — two stacks with
 * the same pane list are different nodes, which is what lets a drag move one of
 * two identical-looking stacks.
 */

/** The node at `path`, or null if the walk leaves the tree. */
export function getNodeAtPath(root: DockLayoutNode | null, path: number[]): DockLayoutNode | null {
  if (!root) {
    return null;
  }

  let current: DockLayoutNode | null = root;
  if (path.length === 0) {
    return current;
  }

  for (const segment of path) {
    if (!current || current.kind !== 'split') {
      return null;
    }
    current = current.children[segment] ?? null;
  }

  return current;
}

/**
 * The split that directly contains `child`, and the index it sits at.
 *
 * Returns null for the root itself: the root has no parent, and a caller that
 * needs to replace it has to write the new root rather than splice a child.
 */
export function findParentSplit(
  node: DockLayoutNode | null,
  child: DockLayoutNode,
): { parent: DockSplitNode; index: number } | null {
  if (!node || node === child) {
    return null;
  }

  if (node.kind !== 'split') {
    return null;
  }

  const index = node.children.indexOf(child);
  if (index !== -1) {
    return { parent: node, index };
  }

  for (let i = 0; i < node.children.length; i += 1) {
    const result = findParentSplit(node.children[i], child);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Swap `target` for `replacement` and return the (possibly new) root.
 *
 * The return value matters: replacing the root cannot be done by mutation, so
 * the replacement itself comes back and the caller must assign it. A target
 * that is not in the tree leaves the root untouched rather than throwing —
 * a drag whose source vanished mid-gesture is a normal event, not an error.
 */
export function replaceNodeInTree(
  root: DockLayoutNode | null,
  target: DockLayoutNode,
  replacement: DockLayoutNode,
): DockLayoutNode | null {
  if (!root) {
    return replacement;
  }

  if (root === target) {
    return replacement;
  }

  const parentInfo = findParentSplit(root, target);
  if (!parentInfo) {
    return root;
  }

  parentInfo.parent.children[parentInfo.index] = replacement;
  normalizeSplitNode(parentInfo.parent);
  return root;
}

/**
 * Place `newNode` next to `targetNode` on the side `zone` names.
 *
 * Two cases, and choosing the wrong one is what produces a tree that renders
 * correctly today and degenerates after a few drags. When the target's parent
 * already runs along the needed axis the newcomer is spliced in as a sibling,
 * keeping the split flat. Only when the axis differs is a new split introduced
 * around the target.
 */
export function dockNodeBeside(
  root: DockLayoutNode | null,
  targetNode: DockStackNode,
  newNode: DockLayoutNode,
  zone: DropZone,
): DockLayoutNode | null {
  const orientation = zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical';
  const placeBefore = zone === 'left' || zone === 'top';
  const parentInfo = findParentSplit(root, targetNode);

  if (parentInfo && parentInfo.parent.direction === orientation) {
    const insertIndex = placeBefore ? parentInfo.index : parentInfo.index + 1;
    parentInfo.parent.children.splice(insertIndex, 0, newNode);
    parentInfo.parent.sizes = insertWeight(
      parentInfo.parent.sizes,
      insertIndex,
      parentInfo.parent.children.length,
    );
    return root ?? newNode;
  }

  const split: DockSplitNode = {
    kind: 'split',
    direction: orientation,
    children: placeBefore ? [newNode, targetNode] : [targetNode, newNode],
    sizes: [0.5, 0.5],
  };

  return replaceNodeInTree(root, targetNode, split);
}

/** Visit every stack in document order, with the path that reaches it. */
export function forEachStack(
  node: DockLayoutNode | null,
  visitor: (stack: DockStackNode, path: number[]) => void,
  path: number[] = [],
): void {
  if (!node) {
    return;
  }

  if (node.kind === 'stack') {
    visitor(node, path);
    return;
  }

  node.children.forEach((child, index) => forEachStack(child, visitor, [...path, index]));
}

/** The first stack whose tab list contains `pane`. */
export function findStackContainingPane(
  node: DockLayoutNode | null,
  pane: string,
): DockStackNode | null {
  let result: DockStackNode | null = null;
  forEachStack(node, (stack) => {
    if (!result && stack.panes.includes(pane)) {
      result = stack;
    }
  });
  return result;
}

/**
 * A pane to surface when one must be chosen for the user — the first stack's
 * active tab, or its first tab when the active one is stale.
 */
export function findFirstPaneName(node: DockLayoutNode | null): string | null {
  let found: string | null = null;
  forEachStack(node, (stack) => {
    if (found || stack.panes.length === 0) {
      return;
    }
    if (stack.activePane && stack.panes.includes(stack.activePane)) {
      found = stack.activePane;
    } else {
      found = stack.panes[0];
    }
  });
  return found;
}

/** Every pane name in the tree, in document order, duplicates included. */
export function collectPaneNames(node: DockLayoutNode | null): string[] {
  const panes: string[] = [];
  forEachStack(node, (stack) => {
    stack.panes.forEach((pane) => panes.push(pane));
  });
  return panes;
}

/**
 * Drop `pane` from `stack`, repairing the active tab, and report whether the
 * stack is now empty (which is the caller's cue to normalize the tree that
 * contains it — this function cannot reach it).
 */
export function removePaneFromStack(stack: DockStackNode, pane: string): boolean {
  stack.panes = stack.panes.filter((p) => p !== pane);
  if (!stack.panes.includes(stack.activePane ?? '')) {
    if (stack.panes.length > 0) {
      stack.activePane = stack.panes[0];
    } else {
      delete stack.activePane;
    }
  }

  return stack.panes.length === 0;
}

/**
 * Bottom-up layout sanitizer. Returns a normalized version of `node` where:
 * - Empty stacks (panes.length === 0) are dropped (returned as null).
 * - A stack's `activePane` is repaired if it no longer references one of `panes`.
 * - Splits whose direction matches a child split are flattened, with sizes
 *   combined multiplicatively so the resulting on-screen pixel layout is
 *   identical to the pre-merge one.
 * - Splits with 0 children become null. Splits with 1 child are unwrapped.
 *
 * Idempotent: passing the result back through this function yields the same
 * structure. Mutates the input tree in place but only returns nodes that
 * remain part of the layout.
 */
export function normalizeLayoutNode(node: DockLayoutNode | null): DockLayoutNode | null {
  if (!node) return null;

  if (node.kind === 'stack') {
    if (node.panes.length === 0) return null;
    if (!node.activePane || !node.panes.includes(node.activePane)) {
      node.activePane = node.panes[0];
    }
    return node;
  }

  const slotSizes = normalizeSizesArray(node.sizes, node.children.length);

  // Pair each child with its slot weight, drop nulls, then expand any
  // same-direction child split into its grandchildren with sizes scaled
  // multiplicatively. A 0.4 slot containing [0.3, 0.7] becomes [0.12, 0.28].
  const survivors = node.children
    .map((child, i) => ({ child: normalizeLayoutNode(child), slot: slotSizes[i] }))
    .filter((p): p is { child: DockLayoutNode; slot: number } => p.child !== null)
    .flatMap(({ child, slot }) => {
      if (child.kind === 'split' && child.direction === node.direction) {
        const innerSizes = normalizeSizesArray(child.sizes, child.children.length);
        return child.children.map((grandchild, idx) => ({
          child: grandchild,
          slot: slot * innerSizes[idx],
        }));
      }
      return [{ child, slot }];
    });

  if (survivors.length === 0) return null;
  if (survivors.length === 1) return survivors[0].child;

  node.children = survivors.map((s) => s.child);
  node.sizes = normalizeSizesArray(
    survivors.map((s) => s.slot),
    survivors.length,
  );
  return node;
}

/**
 * A structural copy, so a layout handed in by a consumer is never mutated by a
 * later drag and a snapshot handed out never changes underneath them. The
 * layout is plain JSON by construction, which is what makes the cheap
 * round-trip valid here.
 */
export function cloneLayoutNode(layout: DockLayoutNode): DockLayoutNode;
export function cloneLayoutNode(layout: DockLayoutNode | null): DockLayoutNode | null;
export function cloneLayoutNode(layout: DockLayoutNode | null): DockLayoutNode | null {
  if (!layout) {
    return null;
  }

  return JSON.parse(JSON.stringify(layout)) as DockLayoutNode;
}

/** How many panes a subtree holds. A stack contributes its pane count; a split, the sum of its children. */
export function countPanesInTree(node: DockLayoutNode | null): number {
  if (!node) {
    return 0;
  }
  if (node.kind === 'stack') {
    return node.panes.length;
  }
  return node.children.reduce((total, child) => total + countPanesInTree(child), 0);
}

/**
 * The split node a path addresses, in whichever layer the path names, or null
 * when the path leaves the tree or lands on a stack.
 *
 * Returning null rather than throwing is what makes a stale `data-path` on a
 * handle harmless: the layout changed under it, the lookup misses, and the
 * gesture does nothing.
 */
export function resolveSplitNode(
  path: DockPath,
  rootLayout: DockLayoutNode | null,
  floatingLayouts: readonly DockFloatingStackLayout[],
): DockSplitNode | null {
  const root = path.type === 'docked'
    ? rootLayout
    : floatingLayouts[path.index]?.root ?? null;
  if (!root) {
    return null;
  }

  const node = getNodeAtPath(root, path.segments);
  return node && node.kind === 'split' ? node : null;
}

/**
 * Give a floating window a complete, finite set of bounds and a detached root.
 *
 * Every field is defended because floating layouts arrive from the `layout`
 * attribute, i.e. from JSON a consumer wrote: a missing `bounds`, a NaN left
 * from a bad parse, or a window sized to nothing would each render an
 * unusable window rather than fail loudly. The minimums (160x120) are the
 * smallest size at which a window's chrome is still operable.
 */
export function normalizeFloatingLayout(
  layout: DockFloatingStackLayout,
): DockFloatingStackLayout {
  const bounds = layout.bounds ?? { left: 0, top: 0, width: 320, height: 200 };
  return {
    id: layout.id,
    bounds: {
      left: Number.isFinite(bounds.left) ? bounds.left : 0,
      top: Number.isFinite(bounds.top) ? bounds.top : 0,
      width: Number.isFinite(bounds.width) ? Math.max(bounds.width, 160) : 320,
      height: Number.isFinite(bounds.height) ? Math.max(bounds.height, 120) : 200,
    },
    zIndex: layout.zIndex,
    root: layout.root ? cloneLayoutNode(layout.root) : null,
    activePane: layout.activePane,
  };
}
