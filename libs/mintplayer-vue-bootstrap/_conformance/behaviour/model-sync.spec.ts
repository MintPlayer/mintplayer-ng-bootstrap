import { describe, expect, it } from 'vitest';

import BsHierarchyChart from '../../charts/hierarchy/src/BsHierarchyChart.vue';
import BsQueryBuilder from '../../query-builder/src/BsQueryBuilder.vue';
import BsTreeview from '../../treeview/src/BsTreeview.vue';
import type { MpTreeview, TreeNode } from '@mintplayer/web-components/treeview';
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

describe('BsTreeview — property sync and write-back', () => {
  it('pushes items to the element', () => {
    const { el } = mountEl<MpTreeview>(BsTreeview, 'mp-treeview', { props: { items: NODES } });
    expect(el.items).toEqual(NODES);
  });

  it('substitutes an empty array when there are no items', () => {
    const { el } = mountEl<MpTreeview>(BsTreeview, 'mp-treeview');
    expect(el.items).toEqual([]);
  });

  it('defaults the selection mode rather than pushing undefined', () => {
    const { el } = mountEl<MpTreeview>(BsTreeview, 'mp-treeview');
    expect(el.selectionMode).toBe('single');
  });

  it('forwards an explicit selection mode', () => {
    const { el } = mountEl<MpTreeview>(BsTreeview, 'mp-treeview', {
      props: { selectionMode: 'multiple' },
    });
    expect(el.selectionMode).toBe('multiple');
  });

  it('pushes the bound expanded and selected ids', () => {
    const { el } = mountEl<MpTreeview>(BsTreeview, 'mp-treeview', {
      props: { items: NODES, expandedIds: ['1'], selectedIds: ['2'] },
    });
    expect(el.expandedIds).toEqual(['1']);
    expect(el.selectedIds).toEqual(['2']);
  });

  it('re-pushes items when the array is replaced', async () => {
    const { wrapper, el } = mountEl<MpTreeview>(BsTreeview, 'mp-treeview', {
      props: { items: NODES },
    });

    await wrapper.setProps({ items: [NODES[0]] });

    expect(el.items).toHaveLength(1);
  });

  it.each([
    ['tree-node-expand', 'expandedIds'],
    ['tree-node-collapse', 'expandedIds'],
  ])('writes %s back to the %s model', async (event, model) => {
    const { wrapper, el } = mountEl<MpTreeview>(BsTreeview, 'mp-treeview', {
      props: { items: NODES },
    });

    await emit(el, event, { expandedIds: ['1', '2'] });

    expect(wrapper.emitted(`update:${model}`)![0]).toEqual([['1', '2']]);
  });

  it('writes a selection back to the selectedIds model', async () => {
    const { wrapper, el } = mountEl<MpTreeview>(BsTreeview, 'mp-treeview', {
      props: { items: NODES },
    });

    await emit(el, 'tree-node-select', { selectedIds: ['2'] });

    expect(wrapper.emitted('update:selectedIds')![0]).toEqual([['2']]);
  });

  // Copied, not aliased: the element keeps editing its own array, and a shared
  // reference would mutate the consumer state without any notification.
  it('copies the ids out of the event detail', async () => {
    const { wrapper, el } = mountEl<MpTreeview>(BsTreeview, 'mp-treeview', {
      props: { items: NODES },
    });
    const expandedIds = ['1'];

    await emit(el, 'tree-node-expand', { expandedIds });

    expect(wrapper.emitted('update:expandedIds')![0][0]).not.toBe(expandedIds);
  });

  it('ignores an event with no detail', async () => {
    const { wrapper, el } = mountEl<MpTreeview>(BsTreeview, 'mp-treeview', {
      props: { items: NODES },
    });

    await emit(el, 'tree-node-select', undefined);

    expect(wrapper.emitted('update:selectedIds')).toBeUndefined();
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
