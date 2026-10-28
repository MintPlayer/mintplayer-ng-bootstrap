import { afterEach, describe, expect, it } from 'vitest';
import type { TreeNode, TreeNodeSelectEventDetail } from '@mintplayer/ui-core/treeview';
import './index';
import type { MpTreeview } from './index';

/**
 * `<mp-treeview>` is generated from @mintplayer/ui-core/treeview (#437) and
 * renders in the light DOM as a FLAT list of treeitems. These specs pin the
 * ARIA contract (roles, levels, states, one tab stop), the APG keymap asserted
 * on focus location, the pointer paths and lazy loading.
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

const mounted: HTMLElement[] = [];
afterEach(() => mounted.splice(0).forEach((el) => el.remove()));

async function settle(el: MpTreeview): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await el.updateComplete;
    await Promise.resolve();
  }
}

async function mount(items: TreeNode[], props: Partial<MpTreeview> = {}, attrs: Record<string, string> = {}): Promise<MpTreeview> {
  const el = document.createElement('mp-treeview') as MpTreeview;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  Object.assign(el, { items, ...props });
  document.body.appendChild(el);
  mounted.push(el);
  await settle(el);
  return el;
}

const tree = (el: Element) => el.querySelector<HTMLElement>(':scope > ul')!;
const rows = (el: Element) => [...tree(el).children] as HTMLElement[];
const row = (el: Element, id: string) => rows(el).find((r) => r.getAttribute('data-node-id') === id)!;
const ids = (el: Element) => rows(el).map((r) => r.getAttribute('data-node-id'));
const focusedId = () => (document.activeElement as HTMLElement | null)?.getAttribute('data-node-id') ?? null;

function press(target: HTMLElement, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(ev);
  return ev;
}

function on<T>(el: Element, name: string): T[] {
  const seen: T[] = [];
  el.addEventListener(name, (e) => seen.push((e as CustomEvent<T>).detail));
  return seen;
}

describe('mp-treeview ARIA', () => {
  it('renders a flat tree in the light DOM, named from the host', async () => {
    const el = await mount(TREE, {}, { 'aria-label': 'Groceries' });
    expect(el.shadowRoot).toBeNull();
    expect(tree(el).getAttribute('role')).toBe('tree');
    expect(tree(el).getAttribute('aria-label')).toBe('Groceries');
    expect(ids(el)).toEqual(['1', '2', '3']);
    expect(rows(el).every((r) => r.getAttribute('role') === 'treeitem')).toBe(true);
  });

  it('a childless tree carries no tree role', async () => {
    const el = await mount([]);
    expect(tree(el).getAttribute('role')).toBe('presentation');
  });

  it('emits aria-level / aria-posinset / aria-setsize per depth', async () => {
    const el = await mount(TREE, { expandedIds: ['1'] });
    expect(ids(el)).toEqual(['1', '1a', '1b', '2', '3']);
    const at = (id: string) => ['aria-level', 'aria-posinset', 'aria-setsize'].map((a) => row(el, id).getAttribute(a));
    expect(at('1')).toEqual(['1', '1', '3']);
    expect(at('1b')).toEqual(['2', '2', '2']);
    expect(at('3')).toEqual(['1', '3', '3']);
  });

  it('omits aria-expanded on a leaf and follows expandedIds writes', async () => {
    const el = await mount(TREE);
    expect(row(el, '3').hasAttribute('aria-expanded')).toBe(false);
    expect(row(el, '1').getAttribute('aria-expanded')).toBe('false');
    el.expandedIds = ['1'];
    await settle(el);
    expect(row(el, '1').getAttribute('aria-expanded')).toBe('true');
    el.expandedIds = [];
    await settle(el);
    expect(row(el, '1').getAttribute('aria-expanded')).toBe('false');
  });

  it('drops aria-selected when selection is off, and marks the tree multiselectable in multiple mode', async () => {
    const el = await mount(TREE, { selectionMode: 'none' });
    expect(row(el, '1').hasAttribute('aria-selected')).toBe(false);
    el.selectionMode = 'multiple';
    await settle(el);
    expect(row(el, '1').getAttribute('aria-selected')).toBe('false');
    expect(tree(el).getAttribute('aria-multiselectable')).toBe('true');
  });

  it('keeps exactly one tab stop, and moves it with ArrowDown', async () => {
    const el = await mount(TREE);
    const stops = () => rows(el).filter((r) => r.getAttribute('tabindex') === '0').map((r) => r.getAttribute('data-node-id'));
    expect(stops()).toEqual(['1']);
    row(el, '1').focus();
    press(row(el, '1'), 'ArrowDown');
    await settle(el);
    expect(stops()).toEqual(['2']);
  });
});

describe('mp-treeview keyboard', () => {
  it('moves focus down and up, and stops at both ends', async () => {
    const el = await mount(TREE);
    const down = press(row(el, '1'), 'ArrowDown');
    await settle(el);
    expect(down.defaultPrevented).toBe(true);
    expect(focusedId()).toBe('2');
    press(row(el, '2'), 'ArrowUp');
    await settle(el);
    expect(focusedId()).toBe('1');
    press(row(el, '1'), 'ArrowUp');
    await settle(el);
    expect(focusedId()).toBe('1');
  });

  it('ArrowRight expands a collapsed parent, then moves to its first child', async () => {
    const el = await mount(TREE);
    const expands = on<{ node: TreeNode }>(el, 'nodeexpand');
    press(row(el, '1'), 'ArrowRight');
    await settle(el);
    expect(el.expandedIds).toEqual(['1']);
    expect(expands.map((d) => d.node.id)).toEqual(['1']);
    press(row(el, '1'), 'ArrowRight');
    await settle(el);
    expect(focusedId()).toBe('1a');
  });

  it('ArrowLeft moves from a child to its parent, then collapses it', async () => {
    const el = await mount(TREE, { expandedIds: ['1'] });
    const collapses = on<{ node: TreeNode }>(el, 'nodecollapse');
    press(row(el, '1a'), 'ArrowLeft');
    await settle(el);
    expect(focusedId()).toBe('1');
    press(row(el, '1'), 'ArrowLeft');
    await settle(el);
    expect(el.expandedIds).toEqual([]);
    expect(collapses.map((d) => d.node.id)).toEqual(['1']);
  });

  it('Home and End jump to the first and last visible row', async () => {
    const el = await mount(TREE, { expandedIds: ['2'] });
    press(row(el, '1'), 'End');
    await settle(el);
    expect(focusedId()).toBe('3');
    press(row(el, '3'), 'Home');
    await settle(el);
    expect(focusedId()).toBe('1');
  });

  it('Enter selects the row and toggles a parent', async () => {
    const el = await mount(TREE);
    const selects = on<TreeNodeSelectEventDetail>(el, 'nodeselect');
    press(row(el, '1'), 'Enter');
    await settle(el);
    expect(el.selectedIds).toEqual(['1']);
    expect(el.expandedIds).toEqual(['1']);
    expect(selects.map((d) => d.selectedIds)).toEqual([['1']]);
    press(row(el, '1'), 'Enter');
    await settle(el);
    expect(el.expandedIds).toEqual([]);
  });

  it('Space toggles additively in multiple mode', async () => {
    const el = await mount(TREE, { selectionMode: 'multiple' });
    press(row(el, '1'), ' ');
    press(row(el, '3'), ' ');
    await settle(el);
    expect(el.selectedIds).toEqual(['1', '3']);
    press(row(el, '1'), ' ');
    await settle(el);
    expect(el.selectedIds).toEqual(['3']);
    expect(row(el, '3').getAttribute('aria-selected')).toBe('true');
  });

  it('selects nothing and emits nothing when selection is off', async () => {
    const el = await mount(TREE, { selectionMode: 'none' });
    const selects = on(el, 'nodeselect');
    press(row(el, '3'), 'Enter');
    await settle(el);
    expect(el.selectedIds).toEqual([]);
    expect(selects).toHaveLength(0);
  });

  it('leaves keys alone that originate inside a node template', async () => {
    const el = await mount(TREE, {
      nodeRenderer: ({ node }) => {
        const input = document.createElement('input');
        input.dataset['for'] = node.id;
        return input;
      },
    });
    const input = row(el, '1').querySelector('input')!;
    const ev = press(input, 'ArrowDown');
    await settle(el);
    expect(ev.defaultPrevented).toBe(false);
  });
});

describe('mp-treeview pointer', () => {
  it('a row click on a parent selects it and toggles it', async () => {
    const el = await mount(TREE);
    row(el, '1').click();
    await settle(el);
    expect(el.selectedIds).toEqual(['1']);
    expect(el.expandedIds).toEqual(['1']);
    row(el, '1').click();
    await settle(el);
    expect(el.expandedIds).toEqual([]);
  });

  it('in multiple mode a plain click replaces and Ctrl-click toggles', async () => {
    const el = await mount(TREE, { selectionMode: 'multiple' });
    row(el, '3').click();
    row(el, '2').dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    await settle(el);
    expect(el.selectedIds).toEqual(['3', '2']);
    row(el, '3').click();
    await settle(el);
    expect(el.selectedIds).toEqual(['3']);
  });

  it('a chevron click expands without selecting', async () => {
    const el = await mount(TREE);
    (row(el, '2').querySelector('[data-tree-chevron]') as HTMLElement).click();
    await settle(el);
    expect(el.expandedIds).toEqual(['2']);
    expect(el.selectedIds).toEqual([]);
  });

  it('a node renderer replaces the body, and the chevron stays', async () => {
    const el = await mount(TREE, {
      nodeRenderer: ({ node, ctx }) => {
        const b = document.createElement('b');
        b.textContent = `${node.label}@${ctx.level}`;
        return b;
      },
    });
    expect(row(el, '1').querySelector('b')?.textContent).toBe('Fruit@1');
    expect(row(el, '1').querySelector('[data-tree-chevron]')).not.toBeNull();
  });

  it('renders the resolved icon for a node with an iconKey', async () => {
    const el = await mount([{ id: 'x', label: 'X', iconKey: 'folder' }], {
      iconResolver: (key) => `<svg data-key="${key}"></svg>`,
    });
    expect(row(el, 'x').querySelector('.treeview-icon svg')?.getAttribute('data-key')).toBe('folder');
  });
});

describe('mp-treeview configuration', () => {
  it('narrows a multi-selection to its first id when switched to single mode', async () => {
    const el = await mount(TREE, { selectionMode: 'multiple', selectedIds: ['1', '2'] });
    el.selectionMode = 'single';
    await settle(el);
    expect(el.selectedIds).toEqual(['1']);
  });

  it('moves the tab stop back to the first row when the focused node disappears', async () => {
    const el = await mount(TREE);
    press(row(el, '1'), 'End');
    await settle(el);
    el.items = TREE.slice(0, 2);
    await settle(el);
    expect(row(el, '1').getAttribute('tabindex')).toBe('0');
  });

  it('hide-borders drops the outer border class', async () => {
    const el = await mount(TREE, { hideBorders: true });
    expect(el.classList).toContain('treeview-borderless');
  });
});

describe('mp-treeview lazy loading', () => {
  const LAZY: TreeNode[] = [{ id: 'l', label: 'Lazy', lazy: true }];

  it('marks the row busy, then shows the loaded children and announces both', async () => {
    let resolve!: (nodes: TreeNode[]) => void;
    const el = await mount(LAZY, { loadChildren: () => new Promise<TreeNode[]>((r) => (resolve = r)) });
    const live = () => el.querySelector(':scope > [aria-live]')!.textContent?.trim();
    press(row(el, 'l'), 'ArrowRight');
    await settle(el);
    expect(row(el, 'l').getAttribute('aria-busy')).toBe('true');
    expect(live()).toBe('Loading Lazy.');
    resolve([{ id: 'c', label: 'Child' }]);
    await settle(el);
    expect(row(el, 'l').hasAttribute('aria-busy')).toBe(false);
    expect(el.expandedIds).toEqual(['l']);
    expect(ids(el)).toEqual(['l', 'c']);
    expect(live()).toBe('Lazy loaded, 1 items.');
  });

  it('a second expand while loading neither expands early nor fires twice', async () => {
    let calls = 0;
    const el = await mount(LAZY, { loadChildren: () => (calls++, new Promise<TreeNode[]>(() => undefined)) });
    const expands = on(el, 'nodeexpand');
    press(row(el, 'l'), 'ArrowRight');
    await settle(el);
    press(row(el, 'l'), 'ArrowRight');
    await settle(el);
    expect(calls).toBe(1);
    expect(expands).toHaveLength(0);
    expect(el.expandedIds).toEqual([]);
  });

  it('describes the row by its error message when the load fails', async () => {
    const el = await mount(LAZY, { loadChildren: () => Promise.reject('offline') });
    const errors = on(el, 'nodeloaderror');
    press(row(el, 'l'), 'ArrowRight');
    await settle(el);
    await settle(el);
    const describedBy = row(el, 'l').getAttribute('aria-describedby')!;
    expect(document.getElementById(describedBy)?.textContent).toBe('offline');
    expect(errors).toHaveLength(1);
  });
});
