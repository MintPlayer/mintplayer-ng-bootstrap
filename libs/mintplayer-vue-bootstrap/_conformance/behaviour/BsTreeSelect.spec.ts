import { beforeAll, describe, expect, it } from 'vitest';
import { h } from 'vue';

import { BsTreeSelect, InMemoryTreeSelectProvider, type TreeNode } from '@mintplayer/vue-bootstrap/tree-select';

import { mountEl } from './harness';

/**
 * `BsTreeSelect` renders the headless tree-select itself (#437). The core's spec
 * and the Lit element's spec cover the behaviour; this pins what is Vue's own:
 * `v-model` writes back through `update:value`, and scoped slots render as Vue
 * content in the rows and chips.
 *
 * jsdom has no popover: a minimal `showPopover` fires the `toggle` event the
 * core listens for.
 */

beforeAll(() => {
  HTMLElement.prototype.showPopover = function (this: HTMLElement) {
    this.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'open', oldState: 'closed' }));
  };
  HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
    this.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'closed', oldState: 'open' }));
  };
});

const NODES: TreeNode[] = [
  { id: '1', label: 'One' },
  { id: '2', label: 'Two' },
];

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function mountSelect(options: Record<string, unknown> = {}) {
  const props = { provider: new InMemoryTreeSelectProvider(NODES), searchDebounceMs: 0, ...((options['props'] as object) ?? {}) };
  return mountEl(BsTreeSelect, 'div.tree-select', { ...options, props, attachTo: document.body });
}

async function open(el: Element) {
  el.querySelector<HTMLInputElement>('input.ts-search')!.focus();
  await settle();
  await settle();
}

describe('BsTreeSelect', () => {
  it('renders a combobox named by the consumer aria-label', () => {
    const { el, wrapper } = mountSelect({ attrs: { 'aria-label': 'Numbers' } });
    const input = el.querySelector('input.ts-search')!;
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-label')).toBe('Numbers');
    wrapper.unmount();
  });

  it('writes a pick back through update:value', async () => {
    const { el, wrapper } = mountSelect();
    await open(el);
    el.querySelector<HTMLElement>('[role="treeitem"][data-node-id="2"]')!.click();
    await settle();
    expect(wrapper.emitted('update:value')?.at(-1)).toEqual([expect.objectContaining({ id: '2' })]);
    wrapper.unmount();
  });

  it('renders the suggestion and item scoped slots as Vue content', async () => {
    const { el, wrapper } = mountSelect({
      props: { mode: 'multiple', value: [NODES[0]] },
      slots: {
        item: ({ node }: { node: TreeNode }) => h('b', `item:${node.label}`),
        suggestion: ({ node }: { node: TreeNode }) => h('i', `row:${node.label}`),
      },
    });
    await open(el);
    expect(el.querySelector('.ts-chip-label b')?.textContent).toBe('item:One');
    expect(el.querySelector('[data-node-id="2"] i')?.textContent).toBe('row:Two');
    wrapper.unmount();
  });
});
