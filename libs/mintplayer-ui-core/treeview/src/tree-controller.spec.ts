import type { TreeNode } from '@mintplayer/ui-core/tree';
import { attachTreeController, EMPTY_TREE_SLICE, type TreeControllerOptions, type TreeSlice } from './tree-controller';
import { TREEVIEW_LABELS } from './treeview';

const NODES: TreeNode[] = [
  { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] },
  { id: 'b', label: 'B', lazy: true },
  { id: 'c', label: 'C' },
];

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(o: Partial<TreeControllerOptions> = {}, nodes: TreeNode[] = NODES) {
  const root = document.body.appendChild(document.createElement('div'));
  const list = root.appendChild(document.createElement('ul'));
  list.setAttribute('role', 'tree');
  let slice: TreeSlice = { ...EMPTY_TREE_SLICE };
  const rows = () => {
    const visible = nodes.flatMap((n) => [n, ...(slice.expandedIds.includes(n.id) ? (n.children ?? slice.loaded[n.id] ?? []) : [])]);
    list.replaceChildren(...visible.map((n) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'treeitem');
      li.setAttribute('data-node-id', n.id);
      li.tabIndex = n.id === (slice.focusedId ?? 'a') ? 0 : -1;
      const chevron = li.appendChild(document.createElement('span'));
      chevron.setAttribute('data-tree-chevron', '');
      li.append(n.label);
      return li;
    }));
  };
  const calls = { select: [] as [string, boolean][], expanded: [] as string[], announce: [] as string[], failed: [] as string[] };
  const ctl = attachTreeController({
    root,
    list: () => list,
    nodes: () => nodes.map((n) => (slice.loaded[n.id] ? { ...n, children: [...slice.loaded[n.id]] } : n)),
    slice: () => slice,
    patch: (p) => {
      slice = { ...slice, ...p };
      rows();
    },
    multiple: () => false,
    loadChildren: () => null,
    labels: () => TREEVIEW_LABELS,
    announce: (t) => calls.announce.push(t),
    select: (n, additive) => calls.select.push([n.id, additive]),
    expanded: (c) => calls.expanded.push(`${c.type}:${c.node.id}:${c.expandedIds.join(',')}`),
    loadFailed: (n) => calls.failed.push(n.id),
    ...o,
  });
  rows();
  const row = (id: string) => list.querySelector<HTMLElement>(`[data-node-id="${id}"]`)!;
  const key = (id: string, k: string) => {
    const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
    row(id).dispatchEvent(ev);
    return ev;
  };
  return { root, list, ctl, calls, row, key, slice: () => slice };
}

afterEach(() => document.body.replaceChildren());

describe('attachTreeController', () => {
  it('a folder row click selects, focuses and toggles; a leaf only selects', () => {
    const t = setup();
    t.row('a').click();
    expect(t.calls.select).toEqual([['a', false]]);
    expect(t.slice().focusedId).toBe('a');
    expect(t.slice().expandedIds).toEqual(['a']);
    t.row('a').click();
    expect(t.slice().expandedIds).toEqual([]);
    expect(t.calls.expanded).toEqual(['expand:a:a', 'collapse:a:']);

    t.row('c').dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    expect(t.calls.select.at(-1)).toEqual(['c', true]);
  });

  it('the chevron only toggles, and a click hook can consume the click', () => {
    const click = vi.fn(() => true);
    const t = setup({ click });
    t.row('a').querySelector('[data-tree-chevron]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(t.slice().expandedIds).toEqual(['a']);
    expect(click).not.toHaveBeenCalled();
    t.row('c').click();
    expect(click).toHaveBeenCalled();
    expect(t.calls.select).toEqual([]);
  });

  it('ignores clicks and keys outside its rows, on unknown nodes, or from inside a row', () => {
    const t = setup();
    t.root.click();
    const stray = t.list.appendChild(document.createElement('li'));
    stray.setAttribute('role', 'treeitem');
    stray.setAttribute('data-node-id', 'zz');
    stray.click();
    stray.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const inner = t.row('a').appendChild(document.createElement('input'));
    const ev = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
    inner.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    expect(t.calls.select).toEqual([]);
    expect(t.key('a', 'x').defaultPrevented).toBe(false);
  });

  it('moves focus with the arrows, expands and collapses, activates and selects', () => {
    const t = setup();
    expect(t.key('a', 'ArrowDown').defaultPrevented).toBe(true);
    expect(t.slice().focusedId).toBe('b');
    expect(document.activeElement).toBe(t.row('b'));
    t.key('a', 'Home');
    t.key('a', 'ArrowRight');
    expect(t.slice().expandedIds).toEqual(['a']);
    t.key('a', 'ArrowLeft');
    expect(t.slice().expandedIds).toEqual([]);
    t.key('a', 'Enter');
    expect(t.calls.select).toEqual([['a', false]]);
    expect(t.slice().expandedIds).toEqual(['a']);
    t.key('c', 'Enter');
    t.key('c', ' ');
    expect(t.calls.select.at(-1)).toEqual(['c', false]);
  });

  it('loads a lazy node once, announcing, then expands it with the loaded children', async () => {
    let resolve!: (n: TreeNode[]) => void;
    const loader = vi.fn(() => new Promise<TreeNode[]>((r) => (resolve = r)));
    const t = setup({ loadChildren: () => loader });
    t.ctl.expand(NODES[1]);
    t.ctl.expand(NODES[1]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(t.slice().loadingIds).toEqual(['b']);
    expect(t.calls.announce).toEqual(['Loading B.']);
    resolve([{ id: 'b1', label: 'B1' }]);
    await settle();
    expect(t.slice()).toMatchObject({ loadingIds: [], expandedIds: ['b'], loaded: { b: [{ id: 'b1', label: 'B1' }] } });
    expect(t.calls.announce.at(-1)).toBe('B loaded, 1 items.');
    t.ctl.expand(NODES[1]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('records a failed load (also an empty result) and announces it', async () => {
    const t = setup({ loadChildren: () => () => Promise.reject(new Error('nope')) });
    t.ctl.expand(NODES[1]);
    await settle();
    expect(t.slice().errors).toEqual({ b: 'nope' });
    expect(t.calls.failed).toEqual(['b']);
    expect(t.calls.announce.at(-1)).toBe('Loading B failed.');

    const u = setup({ loadChildren: () => () => Promise.reject('plain') }, [{ id: 'x', label: 'X', lazy: true }]);
    u.ctl.expand({ id: 'x', label: 'X', lazy: true });
    await settle();
    expect(u.slice().errors).toEqual({ x: 'plain' });

    const v = setup({ loadChildren: () => () => Promise.resolve(undefined as never) }, [{ id: 'y', label: 'Y', lazy: true }]);
    v.ctl.expand({ id: 'y', label: 'Y', lazy: true });
    await settle();
    expect(v.slice().loaded).toEqual({ y: [] });
  });

  it('expands a lazy node without a loader directly; leaves and collapsed nodes are no-ops', () => {
    const t = setup();
    t.ctl.expand(NODES[2]);
    t.ctl.collapse(NODES[0]);
    expect(t.calls.expanded).toEqual([]);
    t.ctl.expand(NODES[1]);
    expect(t.slice().expandedIds).toEqual(['b']);
  });

  it('moves focus to the tab stop, reports a missing one, and detaches', () => {
    const t = setup();
    expect(t.ctl.focusStop()).toBe(true);
    expect(document.activeElement).toBe(t.row('a'));
    t.list.replaceChildren();
    expect(t.ctl.focusStop()).toBe(false);
    t.ctl.detach();
    t.root.click();
    expect(t.calls.select).toEqual([]);
  });
});
