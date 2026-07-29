import { beforeEach, describe, expect, it } from 'vitest';
import './mp-treeview';
import type { MpTreeview } from './mp-treeview';
import type { TreeNode } from '../types';

/**
 * The `tree`/`treeitem` contract of `<mp-treeview>` — the component had no spec
 * file at all, so this covers the whole ARIA surface: the roles, the structural
 * `aria-level`/`aria-posinset`/`aria-setsize` triple, and every state that moves
 * (expanded, selected, multiselectable, busy, roving tab stop) asserted in BOTH
 * directions and — where the property is public — through a programmatic write
 * rather than only a synthetic event.
 *
 * The tree role lives on the in-shadow <ul> — the generic host owns its whole
 * shadow, so a host role=tree would make the live-announcer region an owned
 * child of the tree (invalid ARIA). It is a real attribute (not via
 * `ElementInternals`), so unlike the HostAriaController components it IS
 * observable in jsdom.
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
  // The roving tab stop is applied on render but focus() lands a frame later.
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

function rows(el: MpTreeview): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>('[role="treeitem"]'));
}

function row(el: MpTreeview, id: string): HTMLElement {
  return el.shadowRoot!.querySelector<HTMLElement>(`[data-node-id="${id}"]`) as HTMLElement;
}

function press(target: HTMLElement, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
}

describe('mp-treeview ARIA roles and structure', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('puts role="tree" on the in-shadow list, named from the host, and leaves a consumer host role alone', async () => {
    const el = await mount(TREE);
    el.setAttribute('aria-label', 'Files');
    await flush(el);
    const tree = el.shadowRoot!.querySelector('.treeview-root > ul')!;
    expect(tree.getAttribute('role')).toBe('tree');
    expect(tree.getAttribute('aria-label')).toBe('Files');
    // The host stays generic — a consumer-set host role is never touched.
    expect(el.hasAttribute('role')).toBe(false);
    document.body.innerHTML = '<mp-treeview role="listbox"></mp-treeview>';
    const custom = document.querySelector('mp-treeview') as MpTreeview;
    await flush(custom);
    expect(custom.getAttribute('role')).toBe('listbox');
    // A childless tree is invalid ARIA — the list stays presentational.
    expect(custom.shadowRoot!.querySelector('.treeview-root > ul')!.getAttribute('role')).toBe('presentation');
  });

  it('keeps the list plumbing out of the a11y tree: role="none" items, role="group" only for an expanded parent', async () => {
    const el = await mount(TREE);
    expect(el.shadowRoot!.querySelectorAll('li[role="none"]').length).toBe(3);
    expect(el.shadowRoot!.querySelectorAll('ul[role="group"]').length).toBe(0);

    el.expandedIds = ['1'];
    await flush(el);
    expect(el.shadowRoot!.querySelectorAll('ul[role="group"]').length).toBe(1);
  });

  it('emits aria-level / aria-posinset / aria-setsize per depth, not per flattened row', async () => {
    const el = await mount(TREE);
    el.expandedIds = ['1'];
    await flush(el);

    const parent = row(el, '1');
    expect(parent.getAttribute('aria-level')).toBe('1');
    expect(parent.getAttribute('aria-posinset')).toBe('1');
    expect(parent.getAttribute('aria-setsize')).toBe('3');

    const child = row(el, '1b');
    expect(child.getAttribute('aria-level')).toBe('2');
    expect(child.getAttribute('aria-posinset')).toBe('2');
    // Set size counts the SIBLINGS, so a 2-child group reports 2 — not the 3 roots.
    expect(child.getAttribute('aria-setsize')).toBe('2');
  });
});

describe('mp-treeview ARIA state transitions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('follows a programmatic expandedIds write in both directions', async () => {
    const el = await mount(TREE);
    expect(row(el, '1').getAttribute('aria-expanded')).toBe('false');

    el.expandedIds = ['1'];
    await flush(el);
    expect(row(el, '1').getAttribute('aria-expanded')).toBe('true');

    el.expandedIds = [];
    await flush(el);
    expect(row(el, '1').getAttribute('aria-expanded')).toBe('false');
  });

  it('flips aria-expanded on ArrowRight and back on ArrowLeft', async () => {
    const el = await mount(TREE);
    press(row(el, '2'), 'ArrowRight');
    await flush(el);
    expect(row(el, '2').getAttribute('aria-expanded')).toBe('true');

    press(row(el, '2'), 'ArrowLeft');
    await flush(el);
    expect(row(el, '2').getAttribute('aria-expanded')).toBe('false');
  });

  it('omits aria-expanded entirely on a leaf — a leaf is not a collapsed parent', async () => {
    const el = await mount(TREE);
    expect(row(el, '3').hasAttribute('aria-expanded')).toBe(false);
  });

  it('follows a programmatic selectedIds write in both directions', async () => {
    const el = await mount(TREE);
    expect(row(el, '2').getAttribute('aria-selected')).toBe('false');

    el.selectedIds = ['2'];
    await flush(el);
    expect(row(el, '2').getAttribute('aria-selected')).toBe('true');

    el.selectedIds = [];
    await flush(el);
    expect(row(el, '2').getAttribute('aria-selected')).toBe('false');
  });

  it('drops aria-selected when selection is off — an unselectable row must not read as "not selected"', async () => {
    const el = await mount(TREE, 'selection-mode="none"');
    expect(rows(el).every((r) => !r.hasAttribute('aria-selected'))).toBe(true);

    el.selectionMode = 'single';
    await flush(el);
    expect(rows(el).every((r) => r.hasAttribute('aria-selected'))).toBe(true);
  });

  it('toggles aria-multiselectable on the tree node with the selection mode, live', async () => {
    const el = await mount(TREE);
    const tree = () => el.shadowRoot!.querySelector('.treeview-root > ul')!;
    expect(tree().hasAttribute('aria-multiselectable')).toBe(false);

    el.selectionMode = 'multiple';
    await flush(el);
    expect(tree().getAttribute('aria-multiselectable')).toBe('true');

    // Back down through the attribute channel the wrappers use.
    el.setAttribute('selection-mode', 'single');
    await flush(el);
    expect(tree().hasAttribute('aria-multiselectable')).toBe(false);
  });

  it('keeps exactly one tab stop, and moves it with ArrowDown', async () => {
    const el = await mount(TREE);
    const stops = () => rows(el).filter((r) => r.getAttribute('tabindex') === '0');
    expect(stops().length).toBe(1);
    expect(stops()[0].dataset['nodeId']).toBe('1');

    press(row(el, '1'), 'ArrowDown');
    await flush(el);
    expect(stops().length).toBe(1);
    expect(stops()[0].dataset['nodeId']).toBe('2');
  });
});

describe('mp-treeview lazy-load ARIA', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const LAZY: TreeNode[] = [{ id: 'l1', label: 'Remote folder', lazy: true }];

  it('marks the row aria-busy while children are in flight and clears it on resolve', async () => {
    let resolveChildren: (nodes: TreeNode[]) => void = () => undefined;
    const el = await mount(LAZY);
    el.loadChildren = () => new Promise<TreeNode[]>((resolve) => (resolveChildren = resolve));

    press(row(el, 'l1'), 'ArrowRight');
    await flush(el);
    expect(row(el, 'l1').getAttribute('aria-busy')).toBe('true');

    resolveChildren([{ id: 'l1a', label: 'Child' }]);
    await flush(el);
    expect(row(el, 'l1').hasAttribute('aria-busy')).toBe(false);
    expect(row(el, 'l1').getAttribute('aria-expanded')).toBe('true');
  });

  it('announces the lazy-load lifecycle through a rendered live region', async () => {
    // Regression: the controller existed but render() never emitted its
    // template, so every announcement parked in pendingMessage forever.
    let resolveChildren: (nodes: TreeNode[]) => void = () => undefined;
    const el = await mount(LAZY);
    el.loadChildren = () => new Promise<TreeNode[]>((resolve) => (resolveChildren = resolve));

    const region = el.shadowRoot!.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();

    press(row(el, 'l1'), 'ArrowRight');
    await flush(el);
    expect(region!.textContent).toBe('Loading Remote folder.');

    resolveChildren([{ id: 'l1a', label: 'Child' }]);
    await flush(el);
    expect(region!.textContent).toContain('Remote folder');
  });

  it('describes the row by its in-shadow error message when the load fails', async () => {
    const el = await mount(LAZY);
    expect(row(el, 'l1').hasAttribute('aria-describedby')).toBe(false);

    el.loadChildren = () => Promise.reject(new Error('Network down'));
    press(row(el, 'l1'), 'ArrowRight');
    await flush(el);

    const target = row(el, 'l1');
    const describedBy = target.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    // Same-root IDREF: it must actually resolve inside the shadow root.
    const message = el.shadowRoot!.getElementById(describedBy!);
    expect(message?.textContent).toBe('Network down');
    expect(target.hasAttribute('aria-busy')).toBe(false);
  });
});
