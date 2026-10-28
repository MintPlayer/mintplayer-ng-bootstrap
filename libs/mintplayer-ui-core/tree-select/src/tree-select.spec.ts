import { describe, expect, it } from 'vitest';
import { indexTree, type TreeNode } from '@mintplayer/ui-core/tree';
import { EMPTY_TREE_SLICE } from '@mintplayer/ui-core/treeview';
import { InMemoryTreeSelectProvider } from './in-memory-provider';
import { cascade, connectTreeSelect, indeterminateIds, valueFor, valueList, type TreeSelectOptions } from './tree-select';

const TREE: TreeNode[] = [
  {
    id: '1',
    label: 'Fruit',
    children: [
      { id: '1a', label: 'Apple' },
      { id: '1b', label: 'Banana' },
    ],
  },
  { id: '2', label: 'Vegetables', children: [{ id: '2a', label: 'Carrot' }] },
];

const node = (id: string) => indexTree(TREE).byId.get(id)!;
const ids = (nodes: readonly TreeNode[]) => nodes.map((n) => n.id).sort();

const options = (o: Partial<TreeSelectOptions> = {}): TreeSelectOptions => ({
  id: 'ts',
  mode: 'single',
  variant: 'textbox',
  value: [],
  nodes: TREE,
  tree: { ...EMPTY_TREE_SLICE, expandedIds: ['1'] },
  cascadeSelect: false,
  query: '',
  open: false,
  loading: false,
  hasProvider: true,
  loaded: true,
  hasMore: false,
  disabled: false,
  placeholder: '',
  showClear: false,
  scrollHeight: '300px',
  label: null,
  announcement: '',
  ...o,
});

describe('cascade', () => {
  it('checks a branch with its loaded descendants, and rolls a full set of children up', () => {
    const index = indexTree(TREE);
    expect(ids(cascade([], node('1'), true, index))).toEqual(['1', '1a', '1b']);
    const one = cascade([], node('1a'), true, index);
    expect(ids(one)).toEqual(['1a']);
    expect(ids(cascade(one, node('1b'), true, index))).toEqual(['1', '1a', '1b']);
  });

  it('unchecking a child unchecks its parent but keeps the sibling', () => {
    const index = indexTree(TREE);
    const all = cascade([], node('1'), true, index);
    expect(ids(cascade(all, node('1a'), false, index))).toEqual(['1b']);
  });
});

it('marks a branch with a chosen descendant indeterminate, never a chosen one', () => {
  expect([...indeterminateIds(TREE, new Set(['1a']))]).toEqual(['1']);
  expect([...indeterminateIds(TREE, new Set(['1', '1a', '1b']))]).toEqual([]);
});

it('converts between the mode value and a list', () => {
  expect(valueList(null)).toEqual([]);
  expect(valueList(node('1a'))).toEqual([node('1a')]);
  expect(valueList([node('1a'), null as unknown as TreeNode])).toEqual([node('1a')]);
  expect(valueFor('single', [node('1a'), node('1b')])).toBe(node('1a'));
  expect(valueFor('single', [])).toBeNull();
  expect(valueFor('multiple', [node('1a')])).toEqual([node('1a')]);
});

describe('connectTreeSelect', () => {
  it('is a combobox controlling a tree, named by its label', () => {
    const view = connectTreeSelect(options({ label: 'Food', open: true }));
    expect(view.input).toMatchObject({ role: 'combobox', 'aria-haspopup': 'tree', 'aria-expanded': 'true', 'aria-label': 'Food' });
    expect(view.input['aria-controls']).toBe(view.tree.tree['id']);
    expect(view.tree.tree).toMatchObject({ role: 'tree', 'aria-label': 'Food' });
    expect(view.panel).toMatchObject({ popover: 'auto', id: 'ts-panel', role: null });
  });

  it('falls back to the placeholder, then "Search", for its name', () => {
    expect(connectTreeSelect(options({ placeholder: 'Pick food' })).input['aria-label']).toBe('Pick food');
    expect(connectTreeSelect(options()).input['aria-label']).toBe('Search');
  });

  it('marks chosen rows aria-selected in multiple mode, aria-checked (mixed for a partial branch) in checkbox mode', () => {
    const multiple = connectTreeSelect(options({ mode: 'multiple', value: [node('1a')] }));
    expect(multiple.tree.tree['aria-multiselectable']).toBe('true');
    expect(multiple.rows.map((r) => r.item['aria-selected'])).toEqual(['false', 'true', 'false', 'false']);
    const checkbox = connectTreeSelect(options({ mode: 'checkbox', cascadeSelect: true, value: [node('1a')] }));
    expect(checkbox.rows.map((r) => r.item['aria-checked'])).toEqual(['mixed', 'true', 'false', 'false']);
    expect(checkbox.rows.every((r) => r.item['aria-selected'] === null)).toBe(true);
    expect(checkbox.rows.map((r) => r.check?.['data-state'])).toEqual(['mixed', 'checked', 'unchecked', 'unchecked']);
    expect(connectTreeSelect(options()).rows.every((r) => r.check === null)).toBe(true);
  });

  it('names chip remove buttons after their node, and drops them inside the button variant', () => {
    const value = [node('1a'), node('2a')];
    const view = connectTreeSelect(options({ mode: 'multiple', value, labels: { remove: 'Drop {label}' } }));
    expect(view.chips.map((c) => c.remove?.['aria-label'])).toEqual(['Drop Apple', 'Drop Carrot']);
    expect(connectTreeSelect(options({ mode: 'multiple', value, variant: 'button' })).chips.every((c) => c.remove === null)).toBe(true);
  });

  it('shows the clear button only with a selection, and the panel search only in the button variant', () => {
    expect(connectTreeSelect(options({ showClear: true })).clear).toBeNull();
    expect(connectTreeSelect(options({ showClear: true, value: [node('1a')] })).clear?.['aria-label']).toBe('Clear');
    expect(connectTreeSelect(options()).panelSearch).toBeNull();
    const button = connectTreeSelect(options({ variant: 'button' }));
    expect(button.panelSearch?.['aria-label']).toBe('Search');
    expect(button.button).toMatchObject({ popovertarget: 'ts-panel', 'aria-haspopup': 'tree' });
    expect(button.panel['role']).toBe('dialog');
  });

  it('says which body the panel shows', () => {
    expect(connectTreeSelect(options({ hasProvider: false })).noProvider).toBe(true);
    expect(connectTreeSelect(options({ loading: true, loaded: false, nodes: [] })).busy).toBe(true);
    expect(connectTreeSelect(options({ nodes: [], query: 'x' })).noResults).toBe(true);
    expect(connectTreeSelect(options({ nodes: [] })).noItems).toBe(true);
    expect(connectTreeSelect(options()).showTree).toBe(true);
    expect(connectTreeSelect(options({ loading: true })).panel['aria-busy']).toBe('true');
  });

  it('hides the single value while a query is typed', () => {
    expect(connectTreeSelect(options({ value: [node('1a')] })).single).toBe(node('1a'));
    expect(connectTreeSelect(options({ value: [node('1a')], query: 'ap' })).single).toBeNull();
  });
});

describe('InMemoryTreeSelectProvider', () => {
  const signal = () => new AbortController().signal;

  it('matches search on id as well as label, and returns nothing for a blank query', async () => {
    const p = new InMemoryTreeSelectProvider(TREE);
    expect((await p.search('2a', { signal: signal() })).nodes.map((n) => n.id)).toEqual(['2a']);
    expect((await p.search('   ', { signal: signal() })).nodes).toEqual([]);
  });

  it('returns no children for an unknown parent', async () => {
    const p = new InMemoryTreeSelectProvider(TREE);
    expect((await p.loadChildren('nope', { offset: 0, signal: signal() })).nodes).toEqual([]);
  });

  it('waits out the artificial latency, then rejects if aborted meanwhile', async () => {
    const p = new InMemoryTreeSelectProvider(TREE, { delayMs: 5 });
    const controller = new AbortController();
    const pending = p.loadRoots({ offset: 0, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    const ok = await p.loadRoots({ offset: 0, signal: signal() });
    expect(ok.nodes.map((n) => n.id)).toEqual(['1', '2']);
  });

  it('clamps a negative offset to the first page', async () => {
    const p = new InMemoryTreeSelectProvider(TREE, { pageSize: 1 });
    const page = await p.loadRoots({ offset: -5, signal: signal() });
    expect(page.nodes.map((n) => n.id)).toEqual(['1']);
    expect(page.hasMore).toBe(true);
  });
});
