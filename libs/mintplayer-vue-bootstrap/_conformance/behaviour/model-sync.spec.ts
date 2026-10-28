import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import BsHierarchyChart from '../../charts/hierarchy/src/BsHierarchyChart.vue';
import BsQueryBuilder from '../../query-builder/src/BsQueryBuilder.vue';
import { BsTreeview, type TreeNode } from '@mintplayer/vue-bootstrap/treeview';
import type { MpHierarchyChart } from '@mintplayer/web-components/charts/hierarchy';
import type { MpQueryBuilderElement } from '@mintplayer/web-components/query-builder';

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

describe('BsQueryBuilder — property sync and query write-back', () => {
  const SCHEMA = [{ name: 'Person', fields: [] }];
  const QUERY = { type: 'group', operator: 'and', children: [] };

  it('pushes the object props the element cannot receive as attributes', () => {
    const editorRegistry = {};
    const messages = { addRule: 'Add' };
    const { el } = mountEl<MpQueryBuilderElement>(BsQueryBuilder, 'mp-query-builder', {
      props: {
        schema: SCHEMA,
        selectedFields: ['a'],
        sortBy: [{ field: 'a', direction: 'asc' }],
        savedQueries: [],
        editorRegistry,
        messages,
      },
    });
    expect(el.schema).toEqual(SCHEMA);
    expect(el.selectedFields).toEqual(['a']);
    expect(el.sortBy).toHaveLength(1);
    expect(el.editorRegistry).toEqual(editorRegistry);
    expect(el.messages).toEqual(messages);
  });

  it('writes the initial model value to the element query', () => {
    const { el } = mountEl<MpQueryBuilderElement>(BsQueryBuilder, 'mp-query-builder', {
      props: { schema: SCHEMA, modelValue: QUERY },
    });
    expect(el.query).toEqual(QUERY);
  });

  it('pushes a later model change', async () => {
    const { wrapper, el } = mountEl<MpQueryBuilderElement>(BsQueryBuilder, 'mp-query-builder', {
      props: { schema: SCHEMA, modelValue: QUERY },
    });
    const next = { type: 'group', operator: 'or', children: [] };

    await wrapper.setProps({ modelValue: next });

    expect(el.query).toEqual(next);
  });

  // The element wraps the expression in a `tree` field rather than sending it
  // bare, so unwrapping is the whole write-back.
  it('unwraps the tree field of query-change into the model', async () => {
    const { wrapper, el } = mountEl<MpQueryBuilderElement>(BsQueryBuilder, 'mp-query-builder', {
      props: { schema: SCHEMA, modelValue: QUERY },
    });
    const edited = { type: 'group', operator: 'or', children: [] };

    await emit(el, 'query-change', { tree: edited });

    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([edited]);
  });

  it('ignores a query-change with no detail', async () => {
    const { wrapper, el } = mountEl<MpQueryBuilderElement>(BsQueryBuilder, 'mp-query-builder', {
      props: { schema: SCHEMA, modelValue: QUERY },
    });

    await emit(el, 'query-change', undefined);

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
