import { beforeEach, describe, expect, it } from 'vitest';
import './mp-tree-select';
import type { MpTreeSelect } from './mp-tree-select';
import { InMemoryTreeSelectProvider } from '../providers/in-memory-provider';
import type { NodePage, TreeNode, TreeSelectProvider } from '../types';

/**
 * The combobox/popup ARIA surface of `<mp-tree-select>`, which the behavioural
 * spec (`mp-tree-select.spec.ts`) never touches and the shared naming contract
 * (`_conformance/naming.spec.ts`) only covers for the main search input's name.
 *
 * Focus is on the states that MOVE: `aria-expanded` in both trigger variants,
 * `aria-busy` on the panel across a provider round-trip, the per-chip and
 * clear-button names (which are formatter/attribute driven and re-render), and
 * the live-region text that is the only feedback for a selection change.
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
];

async function settled(el: MpTreeSelect): Promise<void> {
  await el.updateComplete;
}

/** Drain the provider microtasks plus the update they schedule. */
async function flush(el: MpTreeSelect): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await settled(el);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await settled(el);
}

async function mount(setup: (el: MpTreeSelect) => void = () => undefined): Promise<MpTreeSelect> {
  document.body.innerHTML = '';
  const el = document.createElement('mp-tree-select') as MpTreeSelect;
  el.searchDebounceMs = 0;
  el.provider = new InMemoryTreeSelectProvider(TREE);
  setup(el);
  document.body.appendChild(el);
  await settled(el);
  return el;
}

const q = <T extends Element>(el: MpTreeSelect, selector: string): T =>
  (el.renderRoot as unknown as ParentNode).querySelector<T>(selector) as T;

const liveText = (el: MpTreeSelect): string | null =>
  q<HTMLElement>(el, '[role="status"]').textContent;

const treeRow = (el: MpTreeSelect, id: string): HTMLElement =>
  (q(el, 'mp-treeview') as unknown as ParentNode).querySelector<HTMLElement>(
    `[data-node-id="${id}"]`,
  ) as HTMLElement;

describe('mp-tree-select combobox ARIA', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('exposes the search input as a combobox with a tree popup', async () => {
    const el = await mount();
    const input = q<HTMLInputElement>(el, 'input.ts-search');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-haspopup')).toBe('tree');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
  });

  it('tracks aria-expanded on the textbox trigger through open() and close()', async () => {
    const el = await mount();
    const expanded = () => q<HTMLInputElement>(el, 'input.ts-search').getAttribute('aria-expanded');
    expect(expanded()).toBe('false');

    await el.open();
    await flush(el);
    expect(expanded()).toBe('true');

    el.close();
    await settled(el);
    expect(expanded()).toBe('false');
  });

  it('tracks aria-expanded on the button trigger too, which is a different element', async () => {
    const el = await mount((e) => (e.variant = 'button'));
    const trigger = () => q<HTMLButtonElement>(el, 'button.ts-button');
    expect(trigger().getAttribute('aria-haspopup')).toBe('tree');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    trigger().click();
    await flush(el);
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    trigger().click();
    await settled(el);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('marks the panel aria-busy for exactly as long as the provider call is in flight', async () => {
    let resolveRoots: (page: NodePage) => void = () => undefined;
    const deferred: TreeSelectProvider = {
      loadRoots: () => new Promise<NodePage>((resolve) => (resolveRoots = resolve)),
      search: () => Promise.resolve({ nodes: [] }),
      loadChildren: () => Promise.resolve({ nodes: [] }),
    };
    const el = await mount((e) => (e.provider = deferred));
    const panel = () => q<HTMLElement>(el, '.ts-panel');
    expect(panel().getAttribute('role')).toBe('dialog');
    expect(panel().hasAttribute('aria-busy')).toBe(false);

    void el.open();
    await settled(el);
    expect(panel().getAttribute('aria-busy')).toBe('true');

    resolveRoots({ nodes: TREE.map((n) => ({ ...n, children: undefined, lazy: true })) });
    await flush(el);
    expect(panel().hasAttribute('aria-busy')).toBe(false);
  });
});

describe('mp-tree-select action-button naming', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names each chip remove button after the node it removes, and re-renders when the formatter changes', async () => {
    const el = await mount((e) => (e.mode = 'multiple'));
    el.value = [
      { id: '1a', label: 'Apple' },
      { id: '1b', label: 'Banana' },
    ];
    await settled(el);

    const labels = () =>
      Array.from((el.renderRoot as unknown as ParentNode).querySelectorAll('.ts-chip-remove')).map((b) =>
        b.getAttribute('aria-label'),
      );
    expect(labels()).toEqual(['Remove Apple', 'Remove Banana']);

    el.removeLabel = (label) => `${label} verwijderen`;
    el.requestUpdate();
    await settled(el);
    expect(labels()).toEqual(['Apple verwijderen', 'Banana verwijderen']);
  });

  it('names the clear-all button, and follows a live clear-label change', async () => {
    const el = await mount((e) => {
      e.mode = 'multiple';
      e.showClear = true;
    });
    el.value = [{ id: '1a', label: 'Apple' }];
    await settled(el);
    expect(q(el, '.ts-clear').getAttribute('aria-label')).toBe('Clear');

    el.setAttribute('clear-label', 'Alles wissen');
    await settled(el);
    expect(q(el, '.ts-clear').getAttribute('aria-label')).toBe('Alles wissen');
  });

  it('names the button-variant panel search box, defaulting to "Search"', async () => {
    const el = await mount((e) => (e.variant = 'button'));
    expect(q(el, 'input.panel-search').getAttribute('aria-label')).toBe('Search');

    el.searchLabel = 'Zoek een tak';
    await settled(el);
    expect(q(el, 'input.panel-search').getAttribute('aria-label')).toBe('Zoek een tak');
  });
});

describe('mp-tree-select embedded treeview ARIA', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('lets the tree own aria-selected in single mode', async () => {
    const el = await mount((e) => (e.mode = 'single'));
    await el.open();
    await flush(el);

    expect(treeRow(el, '1').getAttribute('aria-selected')).toBe('false');
    treeRow(el, '1').click();
    await flush(el);
    expect(treeRow(el, '1').getAttribute('aria-selected')).toBe('true');
  });

  it('hands selection state to the row checkbox in checkbox mode — no conflicting aria-selected', async () => {
    const el = await mount((e) => (e.mode = 'checkbox'));
    await el.open();
    await flush(el);

    // The embedded tree runs selection-mode="none": the checked checkbox is the
    // single source of selection state, so a second aria-selected would fight it.
    const rows = Array.from(
      (q(el, 'mp-treeview') as unknown as ParentNode).querySelectorAll('[role="treeitem"]'),
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => !r.hasAttribute('aria-selected'))).toBe(true);
    expect((q(el, 'mp-treeview') as HTMLElement).hasAttribute('aria-multiselectable')).toBe(false);
    expect(rows.every((r) => r.querySelector('.ts-node-check') !== null)).toBe(true);
  });
});

describe('mp-tree-select live region', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('announces the node a selection added', async () => {
    const el = await mount((e) => (e.mode = 'single'));
    await el.open();
    await flush(el);
    expect(liveText(el)).toBe('');

    treeRow(el, '2').click();
    await flush(el);
    expect(liveText(el)).toBe('Vegetables selected.');
  });

  it('announces chip removal and a full clear', async () => {
    const el = await mount((e) => {
      e.mode = 'multiple';
      e.showClear = true;
    });
    el.value = [{ id: '1a', label: 'Apple' }];
    await settled(el);

    q<HTMLElement>(el, '.ts-chip-remove').click();
    await flush(el);
    expect(liveText(el)).toBe('Apple removed.');

    el.value = [{ id: '1b', label: 'Banana' }];
    await settled(el);
    q<HTMLElement>(el, '.ts-clear').click();
    await flush(el);
    expect(liveText(el)).toBe('Selection cleared.');
  });

  it('announces the search result count', async () => {
    const el = await mount();
    await el.open();
    await flush(el);

    const input = q<HTMLInputElement>(el, 'input.ts-search');
    input.value = 'app';
    input.dispatchEvent(new Event('input'));
    await flush(el);
    expect(liveText(el)).toBe('1 result.');

    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    await flush(el);
    expect(liveText(el)).toBe('4 results.');
  });
});
