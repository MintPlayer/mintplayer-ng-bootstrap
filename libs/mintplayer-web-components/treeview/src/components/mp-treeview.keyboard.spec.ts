import { beforeEach, describe, expect, it } from 'vitest';
import './mp-treeview';
import type { MpTreeview, TreeNodeSelectEventDetail } from './mp-treeview';
import type { TreeNode } from '../types';

/**
 * The WAI-ARIA tree keyboard model of `<mp-treeview>` (`onRowKeydown`), the
 * pointer paths that share its helpers, and the lazy-load edge cases. The ARIA
 * spec covers roles and states; this file covers what each key DOES, asserted
 * on focus location (`document.activeElement` — light tier, no retargeting),
 * the expanded set and the emitted events.
 */
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
  { id: '3', label: 'Bread' },
];

async function flush(el: MpTreeview): Promise<void> {
  await el.updateComplete;
  // focusNode defers focus() to the next frame.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await el.updateComplete;
}

async function mount(items: TreeNode[], attrs = ''): Promise<MpTreeview> {
  document.body.innerHTML = `<mp-treeview ${attrs}></mp-treeview>`;
  const el = document.querySelector('mp-treeview') as MpTreeview;
  el.items = items;
  await flush(el);
  return el;
}

function row(el: MpTreeview, id: string): HTMLElement {
  return el.renderRoot.querySelector(`[data-node-id="${id}"]`) as HTMLElement;
}

function press(target: HTMLElement, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...init });
  target.dispatchEvent(ev);
  return ev;
}

function focusedId(): string | null {
  return (document.activeElement as HTMLElement | null)?.getAttribute('data-node-id') ?? null;
}

describe('mp-treeview keyboard navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('moves focus down and up through the visible rows, and stops at both ends', async () => {
    const el = await mount(TREE);
    const down = press(row(el, '1'), 'ArrowDown');
    await flush(el);
    expect(down.defaultPrevented).toBe(true);
    expect(focusedId()).toBe('2');

    press(row(el, '2'), 'ArrowUp');
    await flush(el);
    expect(focusedId()).toBe('1');

    // Already first: ArrowUp stays put rather than wrapping.
    press(row(el, '1'), 'ArrowUp');
    await flush(el);
    expect(focusedId()).toBe('1');
  });

  it('skips collapsed children and walks into expanded ones', async () => {
    const el = await mount(TREE);
    el.expandedIds = ['1'];
    await flush(el);
    press(row(el, '1'), 'ArrowDown');
    await flush(el);
    expect(focusedId()).toBe('1a');
  });

  it('ArrowRight expands a collapsed parent, then moves to its first child', async () => {
    const el = await mount(TREE);
    const expands: string[] = [];
    el.addEventListener('tree-node-expand', (e) => expands.push((e as CustomEvent).detail.node.id));

    press(row(el, '1'), 'ArrowRight');
    await flush(el);
    expect(el.expandedIds).toEqual(['1']);
    expect(expands).toEqual(['1']);

    press(row(el, '1'), 'ArrowRight');
    await flush(el);
    expect(focusedId()).toBe('1a');
    expect(expands).toEqual(['1']);
  });

  it('ArrowRight on a leaf does nothing but still consumes the key', async () => {
    const el = await mount(TREE);
    row(el, '3').focus();
    const ev = press(row(el, '3'), 'ArrowRight');
    await flush(el);
    expect(ev.defaultPrevented).toBe(true);
    expect(el.expandedIds).toEqual([]);
    expect(focusedId()).toBe('3');
  });

  it('ArrowLeft collapses an expanded parent, and from a child moves to the parent', async () => {
    const el = await mount(TREE);
    el.expandedIds = ['1'];
    await flush(el);
    const collapses: string[] = [];
    el.addEventListener('tree-node-collapse', (e) => collapses.push((e as CustomEvent).detail.node.id));

    press(row(el, '1a'), 'ArrowLeft');
    await flush(el);
    expect(focusedId()).toBe('1');
    expect(el.expandedIds).toEqual(['1']);

    press(row(el, '1'), 'ArrowLeft');
    await flush(el);
    expect(el.expandedIds).toEqual([]);
    expect(collapses).toEqual(['1']);
  });

  it('ArrowLeft on a root leaf keeps focus where it is', async () => {
    const el = await mount(TREE);
    row(el, '3').focus();
    press(row(el, '3'), 'ArrowLeft');
    await flush(el);
    expect(focusedId()).toBe('3');
  });

  it('Home and End jump to the first and last visible row', async () => {
    const el = await mount(TREE);
    el.expandedIds = ['2'];
    await flush(el);
    press(row(el, '1'), 'End');
    await flush(el);
    expect(focusedId()).toBe('3');
    press(row(el, '3'), 'Home');
    await flush(el);
    expect(focusedId()).toBe('1');
  });

  it('Enter selects the row and toggles a parent open and shut', async () => {
    const el = await mount(TREE);
    const selects: string[] = [];
    el.addEventListener('tree-node-select', (e) => selects.push((e as CustomEvent<TreeNodeSelectEventDetail>).detail.node.id));

    press(row(el, '2'), 'Enter');
    await flush(el);
    expect(el.selectedIds).toEqual(['2']);
    expect(el.expandedIds).toEqual(['2']);

    press(row(el, '2'), 'Enter');
    await flush(el);
    expect(el.expandedIds).toEqual([]);

    // A leaf is only selected — there is nothing to expand.
    press(row(el, '3'), 'Enter');
    await flush(el);
    expect(el.selectedIds).toEqual(['3']);
    expect(el.expandedIds).toEqual([]);
    expect(selects).toEqual(['2', '2', '3']);
  });

  it('Space replaces the selection in single mode', async () => {
    const el = await mount(TREE);
    press(row(el, '1'), ' ');
    press(row(el, '3'), ' ');
    await flush(el);
    expect(el.selectedIds).toEqual(['3']);
  });

  it('Space toggles additively in multiple mode, including the legacy Spacebar key', async () => {
    const el = await mount(TREE, 'selection-mode="multiple"');
    press(row(el, '1'), ' ');
    press(row(el, '3'), 'Spacebar');
    await flush(el);
    expect(el.selectedIds.sort()).toEqual(['1', '3']);

    press(row(el, '1'), ' ');
    await flush(el);
    expect(el.selectedIds).toEqual(['3']);
  });

  it('selects nothing and emits nothing when selection is off', async () => {
    const el = await mount(TREE, 'selection-mode="none"');
    let fired = false;
    el.addEventListener('tree-node-select', () => (fired = true));
    press(row(el, '3'), ' ');
    await flush(el);
    expect(el.selectedIds).toEqual([]);
    expect(fired).toBe(false);
  });

  it('leaves keys alone that originate inside a consumer control in the row', async () => {
    const el = await mount(TREE);
    el.nodeRenderer = (node) => {
      const input = document.createElement('input');
      input.className = 'consumer-input';
      input.value = node.label;
      return input;
    };
    await flush(el);
    const input = row(el, '1').querySelector('.consumer-input') as HTMLInputElement;
    const ev = press(input, 'ArrowDown');
    await flush(el);
    expect(ev.defaultPrevented).toBe(false);
    expect(el.expandedIds).toEqual([]);
  });

  it('moves focus to a node whose id contains a quote', async () => {
    const el = await mount([{ id: 'a', label: 'A' }, { id: 'say "hi"', label: 'Quoted' }]);
    press(row(el, 'a'), 'ArrowDown');
    await flush(el);
    expect(focusedId()).toBe('say "hi"');
  });

  it('ignores keys that are not part of the tree keymap', async () => {
    const el = await mount(TREE);
    const ev = press(row(el, '1'), 'a');
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe('mp-treeview pointer selection and expansion', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('a row click on a parent selects it and toggles it open and shut', async () => {
    const el = await mount(TREE);
    row(el, '1').click();
    await flush(el);
    expect(el.selectedIds).toEqual(['1']);
    expect(el.expandedIds).toEqual(['1']);
    row(el, '1').click();
    await flush(el);
    expect(el.expandedIds).toEqual([]);
  });

  it('in multiple mode a plain click replaces and Ctrl/Meta-click toggles', async () => {
    const el = await mount(TREE, 'selection-mode="multiple"');
    row(el, '3').click();
    row(el, '1').dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    await flush(el);
    expect(el.selectedIds.sort()).toEqual(['1', '3']);

    row(el, '3').dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey: true }));
    await flush(el);
    expect(el.selectedIds).toEqual(['1']);

    row(el, '2').click();
    await flush(el);
    expect(el.selectedIds).toEqual(['2']);
  });

  it('a chevron click on a leaf is inert and lets the row click select', async () => {
    const el = await mount(TREE);
    (row(el, '3').querySelector('.treeview-chevron') as HTMLElement).click();
    await flush(el);
    expect(el.expandedIds).toEqual([]);
    expect(el.selectedIds).toEqual(['3']);
  });

  it('a chevron click expands without selecting', async () => {
    const el = await mount(TREE);
    (row(el, '2').querySelector('.treeview-chevron') as HTMLElement).click();
    await flush(el);
    expect(el.expandedIds).toEqual(['2']);
    expect(el.selectedIds).toEqual([]);
  });
});

describe('mp-treeview configuration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('narrows a multi-selection to its first id when switched to single mode', async () => {
    const el = await mount(TREE, 'selection-mode="multiple"');
    el.selectedIds = ['2', '3'];
    el.selectionMode = 'single';
    expect(el.selectedIds).toEqual(['2']);
  });

  it('ignores an unknown selection-mode attribute value', async () => {
    const el = await mount(TREE, 'selection-mode="multiple"');
    el.setAttribute('selection-mode', 'bogus');
    expect(el.selectionMode).toBe('multiple');
  });

  it('treats a non-array items value as an empty tree', async () => {
    const el = await mount(TREE);
    el.items = null as unknown as TreeNode[];
    await flush(el);
    expect(el.items).toEqual([]);
    expect(el.renderRoot.querySelector('[role="treeitem"]')).toBeNull();
  });

  it('moves the tab stop back to the first row when the focused node disappears', async () => {
    const el = await mount(TREE);
    press(row(el, '1'), 'End');
    await flush(el);
    expect(row(el, '3').tabIndex).toBe(0);

    el.items = TREE.slice(0, 2);
    await flush(el);
    expect(row(el, '1').tabIndex).toBe(0);
  });

  it('renders the resolved icon for a node with an iconKey', async () => {
    const el = await mount([{ id: 'x', label: 'X', iconKey: 'star' }]);
    el.iconResolver = (key) => (key === 'star' ? '<svg class="star"></svg>' : undefined);
    await flush(el);
    expect(row(el, 'x').querySelector('.treeview-icon svg.star')).toBeTruthy();
  });

  it('reflects hide-borders from the property to the attribute', async () => {
    const el = await mount(TREE);
    el.hideBorders = true;
    expect(el.hasAttribute('hide-borders')).toBe(true);
    el.hideBorders = false;
    expect(el.hasAttribute('hide-borders')).toBe(false);
  });

  it('host focus() lands on the roving row, not the generic host', async () => {
    const el = await mount(TREE);
    press(row(el, '1'), 'ArrowDown');
    await flush(el);
    (document.activeElement as HTMLElement).blur();
    el.focus();
    expect(focusedId()).toBe('2');
  });
});

describe('mp-treeview lazy loading', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('expands a lazy node with no loader straight away', async () => {
    const el = await mount([{ id: 'l', label: 'Lazy', lazy: true }]);
    press(row(el, 'l'), 'ArrowRight');
    await flush(el);
    expect(el.expandedIds).toEqual(['l']);
  });

  it('announces a singular item count for a one-child load', async () => {
    const el = await mount([{ id: 'l', label: 'Lazy', lazy: true }]);
    el.loadChildren = () => Promise.resolve([{ id: 'c', label: 'Child' }]);
    press(row(el, 'l'), 'ArrowRight');
    await flush(el);
    expect(el.renderRoot.querySelector('[aria-live]')?.textContent).toContain('Lazy loaded, 1 item.');
  });

  it('shows a non-Error rejection reason as the row error text', async () => {
    const el = await mount([{ id: 'l', label: 'Lazy', lazy: true }]);
    el.loadChildren = () => Promise.reject('offline');
    press(row(el, 'l'), 'ArrowRight');
    await flush(el);
    expect(row(el, 'l').querySelector('.treeview-load-error')?.textContent).toBe('offline');
  });

  it('a second expand while children are in flight neither expands early nor fires a duplicate expand', async () => {
    const el = await mount([{ id: 'l', label: 'Lazy', lazy: true }]);
    let resolve: (nodes: TreeNode[]) => void = () => undefined;
    let calls = 0;
    el.loadChildren = () => {
      calls++;
      return new Promise<TreeNode[]>((r) => (resolve = r));
    };
    const expands: unknown[] = [];
    el.addEventListener('tree-node-expand', (e) => expands.push((e as CustomEvent).detail));

    const chevron = () => row(el, 'l').querySelector('.treeview-chevron') as HTMLElement;
    chevron().click();
    await flush(el);
    chevron().click();
    await flush(el);
    expect(calls).toBe(1);
    expect(el.expandedIds).toEqual([]);
    expect(expands).toHaveLength(0);

    resolve([{ id: 'c', label: 'Child' }]);
    await flush(el);
    expect(el.expandedIds).toEqual(['l']);
    expect(expands).toHaveLength(1);
  });
});
