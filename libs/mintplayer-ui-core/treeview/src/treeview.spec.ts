import { describe, expect, it } from 'vitest';
import type { TreeNode } from '@mintplayer/ui-core/tree';
import { connectTreeview, mergeLoaded, treeviewLabel, type TreeviewOptions } from './treeview';

const TREE: TreeNode[] = [
  { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] },
  { id: 'b', label: 'B', lazy: true },
  { id: 'c', label: 'C', iconKey: 'doc' },
];

const options = (o: Partial<TreeviewOptions> = {}): TreeviewOptions => ({
  id: 't',
  nodes: TREE,
  expanded: new Set(),
  selected: new Set(),
  mode: 'single',
  focusedId: null,
  loading: new Set(),
  errors: {},
  hideBorders: false,
  label: null,
  announcement: '',
  ...o,
});

describe('connectTreeview', () => {
  it('renders the visible nodes as flat rows, every expanded level included', () => {
    const view = connectTreeview(options({ expanded: new Set(['a']) }));
    expect(view.rows.map((r) => r.key)).toEqual(['a', 'a1', 'b', 'c']);
    expect(view.rows.map((r) => r.item['aria-level'])).toEqual([1, 2, 1, 1]);
    expect(view.rows[1].style).toEqual({ '--mp-treeview-level': '2' });
    expect(view.rows.every((r) => r.item['data-mps'] === undefined)).toBe(true);
  });

  it('puts one tab stop on the first row until a row is focused', () => {
    const stops = (o: Partial<TreeviewOptions>) => connectTreeview(options(o)).rows.filter((r) => r.item['tabindex'] === 0).map((r) => r.key);
    expect(stops({})).toEqual(['a']);
    expect(stops({ focusedId: 'c' })).toEqual(['c']);
  });

  it('marks lazy nodes expandable, loading rows busy and failed rows described', () => {
    const view = connectTreeview(options({ loading: new Set(['b']), errors: { c: 'nope' } }));
    const [, b, c] = view.rows;
    expect(b.item['aria-expanded']).toBe('false');
    expect(b.item['aria-busy']).toBe('true');
    expect(b.loading).toBe(true);
    expect(c.item['aria-expanded']).toBeNull();
    expect(c.item['aria-describedby']).toBe(c.errorBag['id']);
    expect(c.error).toBe('nope');
  });

  it('names the tree, drops its role while empty and resolves icons', () => {
    expect(connectTreeview(options({ label: 'Files', mode: 'multiple' })).tree).toMatchObject({
      role: 'tree',
      'aria-label': 'Files',
      'aria-multiselectable': 'true',
    });
    expect(connectTreeview(options({ nodes: [] })).tree['role']).toBe('presentation');
    const view = connectTreeview(options({ iconResolver: (key) => `<svg data-k="${key}"></svg>` }));
    expect(view.rows[2].icon).toBe('<svg data-k="doc"></svg>');
    expect(view.rows[0].icon).toBeNull();
  });

  it('omits aria-selected when selection is off', () => {
    const view = connectTreeview(options({ mode: 'none', selected: new Set(['a']) }));
    expect(view.rows[0].item['aria-selected']).toBeNull();
    expect(view.rows[0].item['data-selected']).toBe('true');
  });
});

describe('mergeLoaded', () => {
  it('hands a lazy node its loaded children, at any depth, and keeps untouched nodes', () => {
    const merged = mergeLoaded(TREE, { b: [{ id: 'b1', label: 'B1' }] });
    expect(merged[1].children?.map((n) => n.id)).toEqual(['b1']);
    expect(merged[0]).toBe(TREE[0]);
    expect(merged[2]).toBe(TREE[2]);
  });

  it("prefers the consumer's own children once they arrive", () => {
    const withChildren: TreeNode[] = [{ id: 'b', label: 'B', children: [{ id: 'x', label: 'X' }] }];
    expect(mergeLoaded(withChildren, { b: [{ id: 'b1', label: 'B1' }] })[0].children?.map((n) => n.id)).toEqual(['x']);
  });
});

it('fills a label template', () => {
  expect(treeviewLabel('{label} loaded, {count} items.', { label: 'Docs', count: 3 })).toBe('Docs loaded, 3 items.');
});
