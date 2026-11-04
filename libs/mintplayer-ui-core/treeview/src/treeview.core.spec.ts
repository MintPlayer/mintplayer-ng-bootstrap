import type { TreeNode } from '@mintplayer/ui-core/tree';
import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { treeviewCore, type TreeviewInputs } from './treeview.core';
import type { TreeviewView } from './treeview';

const ITEMS: TreeNode[] = [
  { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] },
  { id: 'b', label: 'B', lazy: true },
  { id: 'c', label: 'C' },
];

const inputs = (o: Partial<TreeviewInputs> = {}): TreeviewInputs => ({
  items: ITEMS,
  expandedIds: [],
  selectedIds: [],
  selectionMode: 'single',
  hideBorders: false,
  inputLabel: 'Files',
  ...o,
});

// The template is `mp-host`: the root bag lands on the host itself.
const markup = ({ view }: { view: TreeviewView }, host: HTMLElement) => {
  applyBag(host, view.root);
  return [
    el('ul', view.tree, ...view.rows.map((row) => el('li', row.item, el('span', row.chevron), el('span', view.label, row.node.label)))),
    el('div', view.live, view.announcement),
  ];
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const mount = (o: Partial<TreeviewInputs> = {}) => {
  const h = hostCore(treeviewCore, inputs(o), { markup });
  h.attach();
  const row = (id: string) => h.host.querySelector<HTMLElement>(`[data-node-id="${id}"]`)!;
  const click = (id: string, init: MouseEventInit = {}) => {
    row(id).dispatchEvent(new MouseEvent('click', { bubbles: true, ...init }));
    h.render();
  };
  return { ...h, row, click };
};

afterEach(() => document.body.replaceChildren());

describe('treeviewCore', () => {
  it('seeds its state, keeping one selection in single mode', () => {
    const h = hostCore(treeviewCore, inputs({ selectedIds: ['a', 'c'], expandedIds: ['a'] }));
    expect(h.state()).toMatchObject({ selectedIds: ['a'], expandedIds: ['a'], focusedId: null });
    const fallback = hostCore(treeviewCore, inputs({ selectedIds: undefined as never, expandedIds: undefined as never, items: undefined as never }));
    expect(fallback.state()).toMatchObject({ selectedIds: [], expandedIds: [] });
    expect(fallback.props().view.rows).toEqual([]);
  });

  it('hands the tab stop back to the first row when the focused node left the tree', () => {
    const h = hostCore(treeviewCore, inputs(), { label: 'Named' });
    h.state().focusedId = 'gone';
    const { view } = h.props();
    expect(view.rows[0].item['tabindex']).toBe(0);
    expect(view.tree['aria-label']).toBe('Named');
  });

  it('selects a clicked row and emits the selection, expanding a folder', () => {
    const h = mount();
    h.click('a');
    expect(h.state().selectedIds).toEqual(['a']);
    expect(h.events('selectedIdsChange')).toEqual([['a']]);
    expect(h.events('nodeSelect')).toEqual([{ node: ITEMS[0], selectedIds: ['a'] }]);
    expect(h.events('expandedIdsChange')).toEqual([['a']]);
    expect(h.events('nodeExpand')).toEqual([{ node: ITEMS[0], expandedIds: ['a'] }]);
    h.click('a');
    expect(h.events('nodeCollapse')).toEqual([{ node: ITEMS[0], expandedIds: [] }]);
  });

  it('toggles rows in and out of a multiple selection with Ctrl', () => {
    const h = mount({ selectionMode: 'multiple' });
    h.click('c');
    h.click('a', { ctrlKey: true });
    expect(h.state().selectedIds).toEqual(['c', 'a']);
    h.click('c', { ctrlKey: true });
    expect(h.state().selectedIds).toEqual(['a']);
  });

  it('never selects in none mode', () => {
    const h = mount({ selectionMode: 'none' });
    h.click('c');
    expect(h.state().selectedIds).toEqual([]);
    expect(h.events('nodeSelect')).toEqual([]);
  });

  it('loads a lazy node, announcing it, and reports a failure', async () => {
    const loadChildren = vi.fn(async () => [{ id: 'b1', label: 'B1' }]);
    const h = mount({ loadChildren, labels: { loaded: '{label}: {count}' } });
    h.row('b').querySelector<HTMLElement>('[data-tree-chevron]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(h.state().loadingIds).toEqual(['b']);
    await settle();
    expect(h.events('nodeExpand')).toEqual([{ node: ITEMS[1], expandedIds: ['b'], loadedChildren: [{ id: 'b1', label: 'B1' }] }]);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(h.state().announcement).toBe('B: 1');
    h.render();
    expect(h.host.querySelector('[data-node-id="b1"]')).not.toBeNull();

    const failing = mount({ loadChildren: () => Promise.reject(new Error('x')) });
    failing.host.querySelectorAll<HTMLElement>('[data-node-id="b"] [data-tree-chevron]')[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    expect(failing.events('nodeLoadError')).toHaveLength(1);
    failing.dispose();
    h.dispose();
  });

  it('follows the consumer expandedIds / selectedIds, and re-fits the selection when the mode narrows', () => {
    const h = mount({ selectionMode: 'multiple', selectedIds: ['a', 'c'] });
    h.setInputs({ expandedIds: ['a'] });
    expect(h.state().expandedIds).toEqual(['a']);
    h.setInputs({ expandedIds: undefined as never });
    expect(h.state().expandedIds).toEqual([]);
    h.setInputs({ selectedIds: ['c'] });
    expect(h.state().selectedIds).toEqual(['c']);
    h.setInputs({ selectedIds: undefined as never });
    expect(h.state().selectedIds).toEqual([]);

    h.setInputs({ selectedIds: ['a', 'c'] });
    h.setInputs({ selectionMode: 'single' });
    expect(h.state().selectedIds).toEqual(['a']);
    expect(h.events('selectedIdsChange').at(-1)).toEqual(['a']);
    h.setInputs({ selectionMode: 'multiple' });
    expect(h.events('selectedIdsChange')).toHaveLength(1);
    h.setInputs({ hideBorders: true });
  });
});
