import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import './mp-tree-select';
import type { MpTreeSelect } from './mp-tree-select';
import { InMemoryTreeSelectProvider } from '../providers/in-memory-provider';
import type { NodePage, NodeRequest, TreeNode, TreeSelectChangeEventDetail, TreeSelectProvider } from '../types';

/**
 * `<mp-tree-select>` behaviour the other two specs do not reach: the combobox
 * keyboard contract (`onComboboxKeydown`), the provider request lifecycle
 * (supersede, abort, error), what closing the panel resets, paging, and the
 * consumer template slots. Light tier: queries go through `renderRoot`, focus
 * is read from `document.activeElement`.
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

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function flush(el: MpTreeSelect): Promise<void> {
  await tick();
  await el.updateComplete;
  await tick();
  await el.updateComplete;
}

const q = <T extends Element>(el: MpTreeSelect, selector: string): T | null =>
  el.renderRoot.querySelector<T>(selector);

const input = (el: MpTreeSelect) => q<HTMLInputElement>(el, 'input.ts-search')!;

const row = (el: MpTreeSelect, id: string) =>
  q<HTMLElement>(el, `mp-treeview [data-node-id="${id}"]`);

function press(target: HTMLElement, key: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
}

function type(el: MpTreeSelect, text: string, target: HTMLInputElement = input(el)): void {
  target.value = text;
  target.dispatchEvent(new Event('input', { bubbles: true }));
}

/** A provider whose every call waits for the test to settle it. */
function deferredProvider() {
  const pending: { kind: string; query?: string; req: NodeRequest; resolve: (p: NodePage) => void; reject: (e: unknown) => void }[] = [];
  const call = (kind: string, req: NodeRequest, query?: string) =>
    new Promise<NodePage>((resolve, reject) => pending.push({ kind, query, req, resolve, reject }));
  const provider: TreeSelectProvider = {
    loadRoots: (req) => call('roots', req),
    search: (query, req) => call('search', req, query),
    loadChildren: (_id, req) => call('children', req),
  };
  return { provider, pending };
}

const shallow = (nodes: TreeNode[]) => nodes.map((n) => ({ ...n, children: undefined, lazy: !!n.children?.length }));

describe('mp-tree-select', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  async function mount(setup: (el: MpTreeSelect) => void = () => undefined): Promise<MpTreeSelect> {
    const el = document.createElement('mp-tree-select') as MpTreeSelect;
    el.searchDebounceMs = 0;
    el.provider = new InMemoryTreeSelectProvider(TREE);
    setup(el);
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }

  async function mountOpen(setup: (el: MpTreeSelect) => void = () => undefined): Promise<MpTreeSelect> {
    const el = await mount(setup);
    await el.open();
    await flush(el);
    return el;
  }

  describe('combobox keyboard', () => {
    it('ArrowDown on a closed combobox opens the panel', async () => {
      const el = await mount();
      let opened = false;
      el.addEventListener('open', () => (opened = true));
      const ev = press(input(el), 'ArrowDown');
      await flush(el);
      expect(ev.defaultPrevented).toBe(true);
      expect(opened).toBe(true);
      expect(input(el).getAttribute('aria-expanded')).toBe('true');
    });

    it('ArrowDown on an open combobox hands focus to the tree\'s roving row', async () => {
      const el = await mountOpen();
      input(el).focus();
      press(input(el), 'ArrowDown');
      await flush(el);
      expect(document.activeElement).toBe(row(el, '1'));
    });

    it('Escape closes an open panel and keeps the key from reaching outer handlers', async () => {
      const el = await mountOpen();
      let outer = false;
      document.body.addEventListener('keydown', () => (outer = true), { once: true });
      const ev = press(input(el), 'Escape');
      await flush(el);
      expect(ev.defaultPrevented).toBe(true);
      expect(outer).toBe(false);
      expect(input(el).getAttribute('aria-expanded')).toBe('false');
    });

    it('Escape on a closed panel is left alone for the page to handle', async () => {
      const el = await mount();
      const ev = press(input(el), 'Escape');
      expect(ev.defaultPrevented).toBe(false);
    });

    it('ignores keys outside the combobox contract', async () => {
      const el = await mount();
      const ev = press(input(el), 'a');
      expect(ev.defaultPrevented).toBe(false);
      expect(input(el).getAttribute('aria-expanded')).toBe('false');
    });

    it('clicking the textbox control opens the panel and focuses the search input', async () => {
      const el = await mount();
      q<HTMLElement>(el, '.ts-control')!.click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await flush(el);
      expect(document.activeElement).toBe(input(el));
      expect(input(el).getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('request lifecycle', () => {
    it('a newer search supersedes an older one whose answer arrives late', async () => {
      const { provider, pending } = deferredProvider();
      const el = await mount((e) => (e.provider = provider));
      void el.open();
      pending[0].resolve({ nodes: shallow(TREE) });
      await flush(el);

      type(el, 'ap');
      type(el, 'ba');
      const [older, newer] = pending.filter((p) => p.kind === 'search');
      expect(older.req.signal.aborted).toBe(true);

      newer.resolve({ nodes: [{ id: '1b', label: 'Banana' }] });
      older.resolve({ nodes: [{ id: '1a', label: 'Apple' }] });
      await flush(el);
      expect(row(el, '1b')).toBeTruthy();
      expect(row(el, '1a')).toBeNull();
    });

    it('surfaces a failed provider call as load-error and stops loading', async () => {
      const { provider, pending } = deferredProvider();
      const el = await mount((e) => (e.provider = provider));
      const errors: unknown[] = [];
      el.addEventListener('load-error', (e) => errors.push((e as CustomEvent).detail.error));
      void el.open();
      const boom = new Error('boom');
      pending[0].reject(boom);
      await flush(el);
      expect(errors).toEqual([boom]);
      expect(q(el, '.ts-panel')!.hasAttribute('aria-busy')).toBe(false);
    });

    it('treats an AbortError rejection as a cancellation, not a failure', async () => {
      const { provider, pending } = deferredProvider();
      const el = await mount((e) => (e.provider = provider));
      let errored = false;
      el.addEventListener('load-error', () => (errored = true));
      void el.open();
      pending[0].reject(new DOMException('Aborted', 'AbortError'));
      await flush(el);
      expect(errored).toBe(false);
    });

    it('aborts the in-flight request when removed from the document', async () => {
      const { provider, pending } = deferredProvider();
      const el = await mount((e) => {
        e.provider = provider;
        e.searchDebounceMs = 50;
      });
      void el.open();
      type(el, 'ap');
      el.remove();
      expect(pending[0].req.signal.aborted).toBe(true);
      // The debounced search never fires after disconnect.
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(pending.filter((p) => p.kind === 'search')).toHaveLength(0);
    });

    it('surfaces a failed lazy children load as load-error', async () => {
      const provider = new InMemoryTreeSelectProvider(TREE);
      provider.loadChildren = () => Promise.reject(new Error('children failed'));
      const el = await mountOpen((e) => (e.provider = provider));
      const errors: string[] = [];
      el.addEventListener('load-error', (e) => errors.push(((e as CustomEvent).detail.error as Error).message));
      (row(el, '1')!.querySelector('.treeview-chevron') as HTMLElement).click();
      await flush(el);
      expect(errors).toEqual(['children failed']);
    });

    it('re-fetches the roots when the provider is swapped while the panel is open', async () => {
      const el = await mountOpen();
      el.provider = new InMemoryTreeSelectProvider([{ id: 'z', label: 'Zucchini' }]);
      await flush(el);
      expect(row(el, 'z')).toBeTruthy();
      expect(row(el, '1')).toBeNull();
    });

    it('does not open without a provider, and says so in the panel', async () => {
      const el = await mount((e) => (e.provider = undefined));
      await el.open();
      await flush(el);
      expect(input(el).getAttribute('aria-expanded')).toBe('false');
      expect(q(el, '.ts-state')!.textContent).toBe('No data provider');
    });
  });

  describe('search and panel close', () => {
    it('clearing the search text restores the browse tree', async () => {
      const el = await mountOpen();
      type(el, 'apple');
      await flush(el);
      expect(row(el, '2')).toBeNull();
      type(el, '');
      await flush(el);
      expect(row(el, '2')).toBeTruthy();
    });

    it('closing the panel resets the query so reopening shows the browse tree', async () => {
      const el = await mountOpen();
      type(el, 'apple');
      await flush(el);
      let closed = false;
      el.addEventListener('close', () => (closed = true));
      el.close();
      await flush(el);
      expect(closed).toBe(true);
      expect(input(el).value).toBe('');

      await el.open();
      await flush(el);
      expect(row(el, '1')).toBeTruthy();
      expect(row(el, '2')).toBeTruthy();
    });

    it('renders the consumer no-results template for an empty search', async () => {
      const el = await mountOpen((e) => {
        e.noResultsTemplate = () => Object.assign(document.createElement('em'), { textContent: 'Nothing here' });
      });
      type(el, 'zzz');
      await flush(el);
      expect(q(el, '.ts-state em')!.textContent).toBe('Nothing here');
    });

    it('renders the consumer empty-tree template when the provider has no roots', async () => {
      const el = await mountOpen((e) => {
        e.provider = new InMemoryTreeSelectProvider([]);
        e.enterSearchTermTemplate = () => Object.assign(document.createElement('em'), { textContent: 'Type to search' });
      });
      expect(q(el, '.ts-state em')!.textContent).toBe('Type to search');
    });

    it('renders the header and footer templates around the panel body', async () => {
      const el = await mountOpen((e) => {
        e.headerTemplate = () => document.createTextNode('HEAD');
        e.footerTemplate = () => document.createTextNode('FOOT');
      });
      expect(q(el, '.ts-panel-header')!.textContent).toBe('HEAD');
      expect(q(el, '.ts-panel-footer')!.textContent).toBe('FOOT');
    });

    it('searches from the panel search box in the button variant', async () => {
      const el = await mountOpen((e) => (e.variant = 'button'));
      type(el, 'carrot', q<HTMLInputElement>(el, 'input.panel-search')!);
      await flush(el);
      expect(row(el, '2a')).toBeTruthy();
      expect(row(el, '1')).toBeNull();
    });

    it('extends children loaded during a search into the search results', async () => {
      const el = await mountOpen();
      type(el, 'fruit');
      await flush(el);
      (row(el, '1')!.querySelector('.treeview-chevron') as HTMLElement).click();
      await flush(el);
      expect(row(el, '1a')).toBeTruthy();
    });
  });

  describe('paging', () => {
    const MANY: TreeNode[] = ['a', 'b', 'c'].map((id) => ({ id, label: `Item ${id}` }));

    it('appends the next page of roots on Load more, and hides the button on the last page', async () => {
      const el = await mountOpen((e) => (e.provider = new InMemoryTreeSelectProvider(MANY, { pageSize: 2 })));
      expect(row(el, 'c')).toBeNull();
      q<HTMLButtonElement>(el, '.ts-load-more')!.click();
      await flush(el);
      expect(row(el, 'a')).toBeTruthy();
      expect(row(el, 'c')).toBeTruthy();
      expect(q(el, '.ts-load-more')).toBeNull();
    });

    it('appends the next page of search results on Load more', async () => {
      const el = await mountOpen((e) => (e.provider = new InMemoryTreeSelectProvider(MANY, { pageSize: 2 })));
      type(el, 'item');
      await flush(el);
      expect(row(el, 'c')).toBeNull();
      q<HTMLButtonElement>(el, '.ts-load-more')!.click();
      await flush(el);
      expect(row(el, 'c')).toBeTruthy();
    });
  });

  describe('selection', () => {
    it('narrows a multi-selection to its first node when switched to single mode', async () => {
      const el = await mount((e) => (e.mode = 'multiple'));
      el.value = [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ];
      el.mode = 'single';
      expect((el.value as TreeNode).id).toBe('a');
    });

    it('skips empty entries in an assigned value', async () => {
      const el = await mount((e) => (e.mode = 'multiple'));
      el.value = [null as unknown as TreeNode, { id: 'a', label: 'A' }];
      expect((el.value as TreeNode[]).map((n) => n.id)).toEqual(['a']);
    });

    it('unchecking a row in multiple mode removes just that node', async () => {
      const el = await mountOpen((e) => (e.mode = 'multiple'));
      el.value = [{ id: '1', label: 'Fruit' }, { id: '2', label: 'Vegetables' }];
      await flush(el);
      let removed: string | undefined;
      el.addEventListener('value-change', (e) => (removed = (e as CustomEvent<TreeSelectChangeEventDetail>).detail.removed?.id));
      const cb = row(el, '1')!.querySelector('.ts-node-check') as HTMLInputElement;
      cb.checked = false;
      cb.dispatchEvent(new Event('change'));
      await flush(el);
      expect((el.value as TreeNode[]).map((n) => n.id)).toEqual(['2']);
      expect(removed).toBe('1');
    });

    it('extends a checked cascade parent to children loaded afterwards', async () => {
      const el = await mountOpen((e) => {
        e.mode = 'checkbox';
        e.cascadeSelect = true;
      });
      const cb = row(el, '1')!.querySelector('.ts-node-check') as HTMLInputElement;
      cb.checked = true;
      cb.dispatchEvent(new Event('change'));
      await flush(el);
      (row(el, '1')!.querySelector('.treeview-chevron') as HTMLElement).click();
      await flush(el);
      expect((el.value as TreeNode[]).map((n) => n.id).sort()).toEqual(['1', '1a', '1b']);
    });

    it('removing a chip under cascade deselects the node and its loaded descendants', async () => {
      const el = await mountOpen((e) => {
        e.mode = 'checkbox';
        e.cascadeSelect = true;
      });
      (row(el, '1')!.querySelector('.treeview-chevron') as HTMLElement).click();
      await flush(el);
      const cb = row(el, '1')!.querySelector('.ts-node-check') as HTMLInputElement;
      cb.checked = true;
      cb.dispatchEvent(new Event('change'));
      await flush(el);
      const chip = Array.from(el.renderRoot.querySelectorAll('.ts-chip')).find((c) => c.textContent?.includes('Fruit'))!;
      (chip.querySelector('.ts-chip-remove') as HTMLElement).click();
      await flush(el);
      expect(el.value).toEqual([]);
    });

    it('moves focus to the next chip\'s remove button after a removal, then to the input', async () => {
      const el = await mount((e) => (e.mode = 'multiple'));
      el.value = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
      await flush(el);
      const removes = () => Array.from(el.renderRoot.querySelectorAll<HTMLElement>('.ts-chip-remove'));

      removes()[0].focus();
      removes()[0].click();
      await flush(el);
      expect(document.activeElement).toBe(removes()[0]);
      expect(removes()[0].getAttribute('aria-label')).toBe('Remove B');

      removes()[0].click();
      await flush(el);
      expect(document.activeElement).toBe(input(el));
    });

    it('closes the panel and refuses to reopen once disabled', async () => {
      const el = await mountOpen();
      el.disabled = true;
      await flush(el);
      expect(el.hasAttribute('disabled')).toBe(true);
      expect(input(el).getAttribute('aria-expanded')).toBe('false');
      await el.open();
      await flush(el);
      expect(input(el).getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('trigger rendering', () => {
    it('renders the selected node through itemTemplate in single mode and on chips', async () => {
      const el = await mount((e) => {
        e.itemTemplate = (node) => Object.assign(document.createElement('b'), { textContent: `*${node.label}` });
      });
      el.value = { id: 'a', label: 'A' };
      await flush(el);
      expect(q(el, '.ts-single-value b')!.textContent).toBe('*A');

      el.mode = 'multiple';
      el.value = [{ id: 'a', label: 'A' }];
      await flush(el);
      expect(q(el, '.ts-chip-label b')!.textContent).toBe('*A');
    });

    it('renders the button variant body from buttonTemplate when given', async () => {
      const el = await mount((e) => {
        e.variant = 'button';
        e.buttonTemplate = (value) => document.createTextNode(value ? 'picked' : 'none');
      });
      expect(q(el, '.ts-button-body')!.textContent).toBe('none');
      el.value = { id: 'a', label: 'A' };
      await flush(el);
      expect(q(el, '.ts-button-body')!.textContent).toBe('picked');
    });

    it('renders the button variant body as a placeholder, a label, or chips', async () => {
      const el = await mount((e) => {
        e.variant = 'button';
        e.placeholder = 'Pick one';
      });
      expect(q(el, '.ts-button-body .ts-placeholder')!.textContent).toBe('Pick one');

      el.value = { id: 'a', label: 'Alpha' };
      await flush(el);
      expect(q(el, '.ts-button-body')!.textContent!.trim()).toBe('Alpha');

      el.mode = 'multiple';
      el.value = [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }];
      await flush(el);
      expect(el.renderRoot.querySelectorAll('.ts-button-body .ts-chip')).toHaveLength(2);
    });
  });
});

describe('InMemoryTreeSelectProvider', () => {
  const signal = () => new AbortController().signal;

  it('matches search on id as well as label, and returns nothing for a blank query', async () => {
    const p = new InMemoryTreeSelectProvider(TREE);
    expect((await p.search('2a', { signal: signal() })).nodes.map((n) => n.id)).toEqual(['2a']);
    expect((await p.search('   ', { signal: signal() })).nodes).toEqual([]);
  });

  it('returns no children for an unknown parent', async () => {
    const p = new InMemoryTreeSelectProvider(TREE);
    expect((await p.loadChildren('nope', { offset: 0, signal: signal() })).nodes).toEqual([]);
  });

  it('waits out the artificial latency, then rejects if aborted meanwhile', async () => {
    const p = new InMemoryTreeSelectProvider(TREE, { delayMs: 5 });
    const controller = new AbortController();
    const pending = p.loadRoots({ offset: 0, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    const ok = await p.loadRoots({ offset: 0, signal: signal() });
    expect(ok.nodes.map((n) => n.id)).toEqual(['1', '2']);
  });

  it('clamps a negative offset to the first page', async () => {
    const p = new InMemoryTreeSelectProvider(TREE, { pageSize: 1 });
    const page = await p.loadRoots({ offset: -5, signal: signal() });
    expect(page.nodes.map((n) => n.id)).toEqual(['1']);
    expect(page.hasMore).toBe(true);
  });
});
