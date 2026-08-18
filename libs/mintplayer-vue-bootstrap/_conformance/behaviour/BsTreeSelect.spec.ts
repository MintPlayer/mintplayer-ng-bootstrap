import { describe, expect, it } from 'vitest';
import { h } from 'vue';

import BsTreeSelect from '../../tree-select/src/BsTreeSelect.vue';
import type { MpTreeSelect, TreeNode } from '@mintplayer/web-components/tree-select';

import { emit, mountEl } from './harness';

/**
 * `BsTreeSelect` is the largest Vue wrapper, and none of what it does is
 * visible in its template: a `provider` object and `TreeNode` values cannot
 * ride a DOM attribute, so every configuration prop is written to the element
 * as a property, and every per-node template is a Vue scoped slot materialised
 * into a detached container and handed to the element as a render-*callback*.
 *
 * The bridge is where the leaks are. Each container is a live Vue render scope,
 * so the wrapper keeps an LRU of them and must unmount both the evictions and
 * whatever is still open at teardown — a missed `render(null, container)` keeps
 * the consumer's component tree alive for as long as the page lives.
 */

const NODES: TreeNode[] = [
  { id: '1', label: 'One' },
  { id: '2', label: 'Two' },
];

const provider = { getRoots: () => Promise.resolve(NODES), getChildren: () => Promise.resolve([]) };

function mountSelect(options: Record<string, unknown> = {}) {
  return mountEl<MpTreeSelect>(BsTreeSelect, 'mp-tree-select', options);
}

describe('BsTreeSelect — configuration reaches the element as properties', () => {
  it('applies the documented defaults', () => {
    const { el } = mountSelect();
    expect(el.mode).toBe('single');
    expect(el.variant).toBe('textbox');
    expect(el.cascadeSelect).toBe(false);
    expect(el.placeholder).toBe('');
    expect(el.showClear).toBe(false);
    expect(el.panelScrollHeight).toBe('300px');
    expect(el.searchDebounceMs).toBe(200);
    expect(el.disabled).toBe(false);
  });

  it('forwards every configuration prop', () => {
    const { el } = mountSelect({
      props: {
        mode: 'multiple',
        variant: 'button',
        cascadeSelect: true,
        placeholder: 'Pick one',
        showClear: true,
        panelScrollHeight: '120px',
        searchDebounceMs: 50,
        disabled: true,
      },
    });
    expect(el.mode).toBe('multiple');
    expect(el.variant).toBe('button');
    expect(el.cascadeSelect).toBe(true);
    expect(el.placeholder).toBe('Pick one');
    expect(el.showClear).toBe(true);
    expect(el.panelScrollHeight).toBe('120px');
    expect(el.searchDebounceMs).toBe(50);
    expect(el.disabled).toBe(true);
  });

  // By value, not identity: Vue delivers props through a reactive Proxy, so the
  // element receives a wrapper around the consumer's object.
  it('hands the provider object over as a property', () => {
    const { el } = mountSelect({ props: { provider } });
    expect(el.provider).toEqual(provider);
  });

  it('re-syncs when a prop changes after mount', async () => {
    const { wrapper, el } = mountSelect({ props: { placeholder: 'before' } });

    await wrapper.setProps({ placeholder: 'after', disabled: true });

    expect(el.placeholder).toBe('after');
    expect(el.disabled).toBe(true);
  });
});

describe('BsTreeSelect — v-model', () => {
  it('writes the initial model value to the element', () => {
    const { el } = mountSelect({ props: { modelValue: NODES[0] } });
    expect(el.value).toEqual(NODES[0]);
  });

  it('defaults to null rather than undefined', () => {
    const { el } = mountSelect();
    expect(el.value).toBeNull();
  });

  it('pushes a later model change to the element', async () => {
    const { wrapper, el } = mountSelect({ props: { modelValue: NODES[0] } });

    await wrapper.setProps({ modelValue: NODES[1] });

    expect(el.value).toEqual(NODES[1]);
  });

  it('normalises a cleared model to null for the element', async () => {
    const { wrapper, el } = mountSelect({ props: { modelValue: NODES[0] } });

    await wrapper.setProps({ modelValue: undefined });

    expect(el.value).toBeNull();
  });

  it('writes the element value-change back to the model', async () => {
    const { wrapper, el } = mountSelect({ props: { modelValue: null } });

    await emit(el, 'value-change', { value: NODES[1] });

    expect(wrapper.emitted('update:modelValue')![0]).toEqual([NODES[1]]);
  });

  // A cleared selection arrives as an event with no value at all, and the model
  // must become null rather than undefined — `undefined` would make a bound ref
  // read as "never set" instead of "explicitly empty".
  it('normalises a cleared selection to null', async () => {
    const { wrapper, el } = mountSelect({ props: { modelValue: NODES[0] } });

    await emit(el, 'value-change', undefined);

    expect(wrapper.emitted('update:modelValue')![0]).toEqual([null]);
  });
});

describe('BsTreeSelect — scoped slots become render callbacks', () => {
  it('installs no callbacks when no slot is given', () => {
    const { el } = mountSelect();
    expect(el.itemTemplate).toBeUndefined();
    expect(el.buttonTemplate).toBeUndefined();
    expect(el.headerTemplate).toBeUndefined();
  });

  it('installs a callback for each slot the consumer provides', () => {
    const { el } = mountSelect({
      slots: {
        item: () => h('span', 'i'),
        suggestion: () => h('span', 's'),
        button: () => h('span', 'b'),
        header: () => h('span', 'h'),
        footer: () => h('span', 'f'),
        noResults: () => h('span', 'n'),
        enterSearchTerm: () => h('span', 'e'),
      },
    });
    expect(typeof el.itemTemplate).toBe('function');
    expect(typeof el.suggestionTemplate).toBe('function');
    expect(typeof el.buttonTemplate).toBe('function');
    expect(typeof el.headerTemplate).toBe('function');
    expect(typeof el.footerTemplate).toBe('function');
    expect(typeof el.noResultsTemplate).toBe('function');
    expect(typeof el.enterSearchTermTemplate).toBe('function');
  });

  it('renders the slot content into the element the callback returns', () => {
    const { el } = mountSelect({
      slots: { item: (scope: { node: TreeNode }) => h('b', scope.node.label) },
    });

    const rendered = el.itemTemplate!(NODES[0], '');

    expect(rendered).toBeInstanceOf(HTMLElement);
    expect((rendered as HTMLElement).textContent).toBe('One');
  });

  it('passes the search query into the item slot', () => {
    const seen: string[] = [];
    const { el } = mountSelect({
      slots: {
        item: (scope: { query: string }) => {
          seen.push(scope.query);
          return h('b', 'x');
        },
      },
    });

    el.itemTemplate!(NODES[0], 'que');

    expect(seen).toEqual(['que']);
  });

  // One container per node, reused across renders — a fresh element every call
  // would detach whatever the WC had already placed in the DOM.
  it('reuses one container per node', () => {
    const { el } = mountSelect({ slots: { item: () => h('b', 'x') } });

    const first = el.itemTemplate!(NODES[0], '');
    const again = el.itemTemplate!(NODES[0], '');
    const other = el.itemTemplate!(NODES[1], '');

    expect(again).toBe(first);
    expect(other).not.toBe(first);
  });

  it('gives the value slot the current selection', () => {
    const seen: unknown[] = [];
    const { el } = mountSelect({
      slots: {
        button: (scope: { value: unknown }) => {
          seen.push(scope.value);
          return h('b', 'v');
        },
      },
    });

    el.buttonTemplate!(NODES[0]);

    expect(seen).toEqual([NODES[0]]);
  });

  // The containers hold live Vue render scopes; leaving them mounted keeps the
  // consumer's whole subtree alive after the tree-select is gone.
  it('unmounts every container on teardown', () => {
    const { wrapper, el } = mountSelect({ slots: { item: () => h('b', 'x') } });
    const container = el.itemTemplate!(NODES[0], '') as HTMLElement;
    expect(container.textContent).toBe('x');

    wrapper.unmount();

    expect(container.textContent).toBe('');
  });
});

describe('BsTreeSelect — the template cache is bounded', () => {
  // Browsing a large server tree would otherwise accumulate a container and a
  // render scope per node visited, for the lifetime of the page.
  it('evicts and unmounts the oldest container past the cap', () => {
    const { el } = mountSelect({ slots: { item: () => h('b', 'x') } });
    const MAX = 400;

    const oldest = el.itemTemplate!({ id: 'n0', label: 'n0' }, '') as HTMLElement;
    for (let i = 1; i <= MAX; i++) {
      el.itemTemplate!({ id: `n${i}`, label: `n${i}` }, '');
    }

    expect(oldest.textContent).toBe('');
  });

  // Re-rendering a node refreshes its position in the LRU, so a node the user
  // keeps looking at is not evicted by traffic elsewhere in the tree.
  it('keeps a recently re-rendered node alive', () => {
    const { el } = mountSelect({ slots: { item: () => h('b', 'x') } });
    const MAX = 400;

    const first = el.itemTemplate!({ id: 'n0', label: 'n0' }, '') as HTMLElement;
    for (let i = 1; i < MAX; i++) el.itemTemplate!({ id: `n${i}`, label: `n${i}` }, '');
    el.itemTemplate!({ id: 'n0', label: 'n0' }, '');
    el.itemTemplate!({ id: 'fresh', label: 'fresh' }, '');

    expect(first.textContent).toBe('x');
  });
});
