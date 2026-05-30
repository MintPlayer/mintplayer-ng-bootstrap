import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import './mp-tree-select';
import type { MpTreeSelect } from './mp-tree-select';
import { InMemoryTreeSelectProvider } from '../providers/in-memory-provider';
import type { TreeNode, TreeSelectChangeEventDetail } from '../types';

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
];

async function settled(el: HTMLElement): Promise<void> {
  if ('updateComplete' in el) {
    await (el as unknown as { updateComplete: Promise<void> }).updateComplete;
  }
}

/** Flush the async provider microtasks + one update cycle. */
async function flush(el: MpTreeSelect): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await settled(el);
  await new Promise((r) => setTimeout(r, 0));
  await settled(el);
}

function makeProvider(): InMemoryTreeSelectProvider {
  return new InMemoryTreeSelectProvider(TREE);
}

function tv(el: MpTreeSelect): HTMLElement {
  return el.shadowRoot!.querySelector('mp-treeview') as HTMLElement;
}

function row(el: MpTreeSelect, id: string): HTMLElement {
  return tv(el).shadowRoot!.querySelector(`[data-node-id="${id}"]`) as HTMLElement;
}

function checkbox(el: MpTreeSelect, id: string): HTMLInputElement {
  return row(el, id).querySelector('.ts-node-check') as HTMLInputElement;
}

describe('<mp-tree-select>', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  async function mount(setup: (el: MpTreeSelect) => void): Promise<MpTreeSelect> {
    const el = document.createElement('mp-tree-select') as MpTreeSelect;
    el.searchDebounceMs = 0;
    el.provider = makeProvider();
    setup(el);
    host.appendChild(el);
    await settled(el);
    await el.open();
    await flush(el);
    return el;
  }

  it('round-trips value as a scalar in single mode', async () => {
    const el = document.createElement('mp-tree-select') as MpTreeSelect;
    el.mode = 'single';
    host.appendChild(el);
    el.value = { id: 'x', label: 'X' };
    expect((el.value as TreeNode).id).toBe('x');
  });

  it('round-trips value as an array in multiple mode', async () => {
    const el = document.createElement('mp-tree-select') as MpTreeSelect;
    el.mode = 'multiple';
    host.appendChild(el);
    el.value = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    expect((el.value as TreeNode[]).map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('loads roots from the provider on open', async () => {
    const el = await mount((e) => (e.mode = 'single'));
    expect(row(el, '1')).toBeTruthy();
    expect(row(el, '2')).toBeTruthy();
  });

  it('selects a single node on row click and closes', async () => {
    const el = await mount((e) => (e.mode = 'single'));
    let detail: TreeSelectChangeEventDetail | undefined;
    el.addEventListener('value-change', (e) => (detail = (e as CustomEvent).detail));
    row(el, '1').click();
    await settled(el);
    expect((el.value as TreeNode).id).toBe('1');
    expect(detail?.added?.id).toBe('1');
    expect(el.hasAttribute('data-menu-open')).toBe(false);
  });

  it('toggles independent selections in multiple mode (no cascade)', async () => {
    const el = await mount((e) => (e.mode = 'multiple'));
    const cb = checkbox(el, '2');
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    await settled(el);
    expect((el.value as TreeNode[]).map((n) => n.id)).toEqual(['2']);
    // No cascade: the child '2a' is not auto-selected.
    expect((el.value as TreeNode[]).some((n) => n.id === '2a')).toBe(false);
  });

  it('cascades over loaded descendants in checkbox mode, and rolls up on partial deselect', async () => {
    const el = await mount((e) => {
      e.mode = 'checkbox';
      e.cascadeSelect = true;
    });
    // Expand "Fruit" so its children load (lazy).
    (row(el, '1').querySelector('.treeview-chevron') as HTMLElement).click();
    await flush(el);
    expect(row(el, '1a')).toBeTruthy();

    // Check the parent -> cascades to loaded children.
    const parent = checkbox(el, '1');
    parent.checked = true;
    parent.dispatchEvent(new Event('change'));
    await flush(el);
    expect((el.value as TreeNode[]).map((n) => n.id).sort()).toEqual(['1', '1a', '1b']);

    // Uncheck one child -> parent rolls up to deselected + indeterminate.
    const apple = checkbox(el, '1a');
    apple.checked = false;
    apple.dispatchEvent(new Event('change'));
    await flush(el);
    const ids = (el.value as TreeNode[]).map((n) => n.id).sort();
    expect(ids).toEqual(['1b']);
    expect(checkbox(el, '1').indeterminate).toBe(true);
  });

  it('clears the selection via the clear button', async () => {
    const el = await mount((e) => {
      e.mode = 'multiple';
      e.showClear = true;
    });
    el.value = [{ id: '1', label: 'Fruit' }];
    await settled(el);
    let cleared = false;
    el.addEventListener('clear', () => (cleared = true));
    (el.shadowRoot!.querySelector('.ts-clear') as HTMLElement).click();
    await settled(el);
    expect((el.value as TreeNode[]).length).toBe(0);
    expect(cleared).toBe(true);
  });
});
