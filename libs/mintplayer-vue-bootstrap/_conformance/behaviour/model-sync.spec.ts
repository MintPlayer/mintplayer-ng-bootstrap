import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import { BsHierarchyChart } from '@mintplayer/vue-bootstrap/charts/hierarchy';
import { BsTreeview, type TreeNode } from '@mintplayer/vue-bootstrap/treeview';
import { BsQueryBuilder, type EntitySchema, type Expression } from '@mintplayer/vue-bootstrap/query-builder';

import { mountEl } from './harness';

/**
 * Three wrappers whose entire job is a two-way binding over state the element
 * owns and changes on its own: which tree nodes are open, which chart node the
 * user has zoomed into, and the expression a query builder has been edited
 * into. Each is an object or array graph, so it travels as a property, and each
 * has a write-back that is the only thing keeping a `v-model` from going stale
 * the moment the user interacts.
 *
 * The write-backs also *copy* — handing the consumer the element's own array
 * would make later edits inside the element mutate application state with no
 * reactivity notification at all, which is the worst of both worlds.
 */

const NODES: TreeNode[] = [
  { id: '1', label: 'One' },
  { id: '2', label: 'Two' },
];

// BsTreeview renders the headless treeview itself (#437): rows are its own
// markup, and the two-way ids write back through update:* events.
describe('BsTreeview — markup and write-back from the headless core', () => {
  const TREE: TreeNode[] = [{ id: 'p', label: 'Parent', children: [{ id: 'c', label: 'Child' }] }, ...NODES];
  const rows = (el: Element) => [...el.querySelectorAll<HTMLElement>('[role="treeitem"]')];

  it('renders a flat row per visible node, with every expanded level', () => {
    const { el } = mountEl(BsTreeview, 'ul.treeview-tree', { props: { items: TREE, expandedIds: ['p'] } });
    expect(el.getAttribute('role')).toBe('tree');
    expect(rows(el).map((r) => r.getAttribute('data-node-id'))).toEqual(['p', 'c', '1', '2']);
    expect(rows(el)[1].getAttribute('aria-level')).toBe('2');
  });

  it('writes a row click back to the selectedIds and expandedIds models', async () => {
    const { wrapper, el } = mountEl(BsTreeview, 'ul.treeview-tree', { props: { items: TREE } });
    rows(el)[0].click();
    await nextTick();
    expect(wrapper.emitted('update:selectedIds')?.at(-1)).toEqual([['p']]);
    expect(wrapper.emitted('update:expandedIds')?.at(-1)).toEqual([['p']]);
  });

  it('copies the ids it writes back, so later edits never alias them', async () => {
    const selectedIds: string[] = [];
    const { wrapper, el } = mountEl(BsTreeview, 'ul.treeview-tree', { props: { items: NODES, selectedIds } });
    rows(el)[1].click();
    await nextTick();
    const written = wrapper.emitted('update:selectedIds')?.at(-1)?.[0] as string[];
    expect(written).toEqual(['2']);
    expect(written).not.toBe(selectedIds);
  });
});

// BsHierarchyChart renders the headless chart itself (#437): nodes are its own
// treeitems, and re-rooting writes back through update:rootId.
describe('BsHierarchyChart — markup and rootId write-back from the headless core', () => {
  const DATA = {
    id: 'root',
    name: 'Root',
    children: [
      { id: 'a', name: 'A', children: [{ id: 'a1', name: 'A1', value: 2 }] },
      { id: 'b', name: 'B', value: 1 },
    ],
  };
  const item = (el: Element, id: string) => el.querySelector<SVGElement>(`[role="treeitem"][data-id="${id}"]`);

  it('renders a treeitem per node of the data graph', () => {
    const { el } = mountEl(BsHierarchyChart, 'div.hierarchy-chart', { props: { data: DATA } });
    expect(item(el, 'a')).not.toBeNull();
    expect(item(el, 'b')).not.toBeNull();
  });

  it('honours a bound rootId', () => {
    const { el } = mountEl(BsHierarchyChart, 'div.hierarchy-chart', { props: { data: DATA, rootId: 'a' } });
    expect(item(el, 'a1')).not.toBeNull();
    expect(item(el, 'b')).toBeNull();
  });

  it('re-renders when the rootId binding changes', async () => {
    const { wrapper, el } = mountEl(BsHierarchyChart, 'div.hierarchy-chart', { props: { data: DATA } });
    await wrapper.setProps({ rootId: 'a' });
    expect(item(el, 'b')).toBeNull();
  });

  it('writes rootId back when the user zooms into a branch', async () => {
    const { wrapper, el } = mountEl(BsHierarchyChart, 'div.hierarchy-chart', { props: { data: DATA } });
    item(el, 'a')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(wrapper.emitted('update:rootId')?.at(-1)).toEqual(['a']);
  });
});

// BsQueryBuilder renders the headless query builder itself (#437): the tree is
// flat rows, and every edit writes back through update:query.
describe('BsQueryBuilder — markup and write-back from the headless core', () => {
  const SCHEMA: EntitySchema[] = [
    { name: 'orders', label: 'Orders', fields: [{ name: 'total', label: 'Total', type: 'number' }] },
  ];
  const QUERY: Expression = {
    kind: 'group',
    id: 'g',
    logic: 'and',
    children: [{ kind: 'condition', id: 'c', field: 'total', operator: 'gt', value: 5 }],
  };
  const act = (el: Element, name: string) => el.querySelector<HTMLElement>(`[data-qb-act="${name}"]`)!;

  it('nests the condition in the list of its group, through the recursive partial', () => {
    const { el } = mountEl(BsQueryBuilder, 'div.query-builder', { props: { schema: SCHEMA, rootEntity: 'orders', query: QUERY } });
    const rows = [...el.querySelectorAll<HTMLElement>('li.qb-row[data-row-id]')];
    expect(rows.map((r) => r.getAttribute('data-row-id'))).toEqual(['g', 'c']);
    expect(rows[1].parentElement!.closest('li.qb-row')).toBe(rows[0]);
  });

  it('writes an edit back to the query model without mutating the input', async () => {
    const { wrapper, el } = mountEl(BsQueryBuilder, 'div.query-builder', { props: { schema: SCHEMA, rootEntity: 'orders', query: QUERY } });
    act(el, 'logic-or').click();
    await nextTick();
    const written = wrapper.emitted('update:query')?.at(-1)?.[0] as Expression;
    expect(written).toMatchObject({ kind: 'group', id: 'g', logic: 'or' });
    expect(written).not.toBe(QUERY);
    expect((QUERY as { logic: string }).logic).toBe('and');
  });

  it('renders a field marked custom through the #editor slot', () => {
    const custom: EntitySchema[] = [{ ...SCHEMA[0], fields: [{ ...SCHEMA[0].fields[0], editor: 'custom' }] }];
    const { el } = mountEl(BsQueryBuilder, 'div.query-builder', {
      props: { schema: custom, rootEntity: 'orders', query: QUERY },
      slots: { editor: `<template #editor="{ ctx }"><output class="custom-editor">{{ ctx.field.name }}={{ ctx.value }}</output></template>` },
    });
    expect(el.querySelector('.custom-editor')?.textContent).toBe('total=5');
  });
});
