import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import BsHierarchyChart from '../../charts/hierarchy/src/BsHierarchyChart.vue';
import { BsTreeview, type TreeNode } from '@mintplayer/vue-bootstrap/treeview';
import type { MpHierarchyChart } from '@mintplayer/web-components/charts/hierarchy';
import { BsQueryBuilder, type EntitySchema, type Expression } from '@mintplayer/vue-bootstrap/query-builder';

import { emit, mountEl } from './harness';

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

describe('BsHierarchyChart — property sync and zoom write-back', () => {
  const DATA = { id: 'root', label: 'Root', value: 1, children: [] };

  // By value, not identity: Vue delivers props through a reactive Proxy, so
  // what the element receives wraps the consumer's object rather than being it.
  it('pushes the data graph as a property', () => {
    const { el } = mountEl<MpHierarchyChart>(BsHierarchyChart, 'mp-hierarchy-chart', {
      props: { data: DATA },
    });
    expect(el.data).toEqual(DATA);
  });

  it('forwards the callbacks that cannot be attributes', () => {
    const loadChildren = () => Promise.resolve([]);
    const tooltipFormatter = () => 'tip';
    const labelFormatter = () => 'label';
    const { el } = mountEl<MpHierarchyChart>(BsHierarchyChart, 'mp-hierarchy-chart', {
      props: { data: DATA, loadChildren, tooltipFormatter, labelFormatter },
    });
    expect(el.loadChildren).toBe(loadChildren);
    expect(el.tooltipFormatter).toBe(tooltipFormatter);
    expect(el.labelFormatter).toBe(labelFormatter);
  });

  it('forwards an explicit layout', () => {
    const { el } = mountEl<MpHierarchyChart>(BsHierarchyChart, 'mp-hierarchy-chart', {
      props: { data: DATA, layout: 'treemap' },
    });
    expect(el.layout).toBe('treemap');
  });

  it('pushes the bound rootId', () => {
    const { el } = mountEl<MpHierarchyChart>(BsHierarchyChart, 'mp-hierarchy-chart', {
      props: { data: DATA, rootId: 'root' },
    });
    expect(el.rootId).toBe('root');
  });

  it('re-pushes rootId when the binding changes', async () => {
    const { wrapper, el } = mountEl<MpHierarchyChart>(BsHierarchyChart, 'mp-hierarchy-chart', {
      props: { data: DATA, rootId: 'root' },
    });

    await wrapper.setProps({ rootId: 'child' });

    expect(el.rootId).toBe('child');
  });

  // The chart zooms itself when the user clicks an arc, so the binding is read
  // back off the element rather than out of the event detail.
  it('writes the element rootId back after a zoom', async () => {
    const { wrapper, el } = mountEl<MpHierarchyChart>(BsHierarchyChart, 'mp-hierarchy-chart', {
      props: { data: DATA, rootId: 'root' },
    });
    el.rootId = 'child';

    await emit(el, 'hierarchy-zoom', {});

    expect(wrapper.emitted('update:rootId')!.at(-1)).toEqual(['child']);
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

  it('renders a row per node, the condition one level below its group', () => {
    const { el } = mountEl(BsQueryBuilder, 'div.query-builder', { props: { schema: SCHEMA, rootEntity: 'orders', query: QUERY } });
    const rows = [...el.querySelectorAll<HTMLElement>('li.qb-row[data-row-id]')];
    expect(rows.map((r) => [r.getAttribute('data-row-id'), r.getAttribute('aria-level')])).toEqual([
      ['g', '1'],
      ['c', '2'],
    ]);
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
