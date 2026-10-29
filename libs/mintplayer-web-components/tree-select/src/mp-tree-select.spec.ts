import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryTreeSelectProvider, type NodePage, type NodeRequest, type TreeNode, type TreeSelectProvider } from '@mintplayer/ui-core/tree-select';
import { MpTreeSelect } from './generated';

void MpTreeSelect; // force the side-effect registration

/**
 * The Lit tree-select front (#437): light DOM, rendered from the template
 * compiled out of `@mintplayer/ui-core/tree-select`. The core's spec covers the
 * bags; this file pins the element's behaviour: the combobox keys, the
 * provider request lifecycle, the panel's bodies, paging and selection.
 *
 * jsdom has no popover: a minimal `showPopover` / `hidePopover` fires the
 * `toggle` event the core listens for, which is all the core relies on.
 */

beforeAll(() => {
  const open = new WeakSet<HTMLElement>();
  const toggle = (el: HTMLElement, newState: 'open' | 'closed') =>
    el.dispatchEvent(Object.assign(new Event('toggle'), { newState, oldState: newState === 'open' ? 'closed' : 'open' }));
  HTMLElement.prototype.showPopover = function (this: HTMLElement) {
    if (open.has(this)) return;
    open.add(this);
    toggle(this, 'open');
  };
  HTMLElement.prototype.hidePopover = function (this: HTMLElement) {
    if (!open.delete(this)) return;
    toggle(this, 'closed');
  };
  // jsdom parses :popover-open but always answers false; the core reads it to
  // know the panel is showing before the queued toggle event lands.
  const matches = Element.prototype.matches;
  Element.prototype.matches = function (this: Element, selector: string) {
    return selector === ':popover-open' ? open.has(this as HTMLElement) : matches.call(this, selector);
  };
});

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

async function mount(setup: (el: MpTreeSelect) => void = () => undefined): Promise<MpTreeSelect> {
  const el = document.createElement('mp-tree-select') as MpTreeSelect;
  el.provider = new InMemoryTreeSelectProvider(TREE);
  el.searchDebounceMs = 0;
  setup(el);
  document.body.append(el);
  await flush(el);
  return el;
}

const q = <T extends Element>(el: MpTreeSelect, selector: string) => el.querySelector<T>(selector);
const input = (el: MpTreeSelect) => q<HTMLInputElement>(el, 'input.ts-search')!;
const panel = (el: MpTreeSelect) => q<HTMLElement>(el, '.ts-panel')!;
const row = (el: MpTreeSelect, id: string) => q<HTMLElement>(el, `[role="treeitem"][data-node-id="${id}"]`);
const rowIds = (el: MpTreeSelect) => [...el.querySelectorAll('[role="treeitem"]')].map((r) => r.getAttribute('data-node-id'));
const isOpen = (el: MpTreeSelect) => input(el)?.getAttribute('aria-expanded') === 'true' || q(el, '.ts-button')?.getAttribute('aria-expanded') === 'true';

function press(target: HTMLElement, key: string): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
}

function type(text: string, target: HTMLInputElement): void {
  target.value = text;
  target.dispatchEvent(new Event('input', { bubbles: true }));
}

function events<T>(el: MpTreeSelect, name: string): T[] {
  const seen: T[] = [];
  el.addEventListener(name, (e) => seen.push((e as CustomEvent<T>).detail));
  return seen;
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

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-tree-select', () => {
  describe('combobox', () => {
    it('renders in the light DOM as a combobox controlling the tree', async () => {
      const el = await mount((e) => e.setAttribute('aria-label', 'Food'));
      expect(el.shadowRoot).toBeNull();
      expect(input(el).getAttribute('role')).toBe('combobox');
      expect(input(el).getAttribute('aria-label')).toBe('Food');
      expect(input(el).getAttribute('aria-expanded')).toBe('false');
      expect(panel(el).getAttribute('popover')).toBe('auto');
    });

    it('opens on focus, loads the roots and tracks aria-expanded', async () => {
      const el = await mount();
      const opened = events<boolean>(el, 'openchange');
      input(el).focus();
      await flush(el);
      expect(isOpen(el)).toBe(true);
      expect(rowIds(el)).toEqual(['1', '2']);
      el.close();
      await flush(el);
      expect(isOpen(el)).toBe(false);
      expect(opened).toEqual([true, false]);
    });

    it('ArrowDown opens a closed panel, then hands focus to the tree', async () => {
      const el = await mount();
      press(input(el), 'ArrowDown');
      await flush(el);
      expect(isOpen(el)).toBe(true);
      expect(press(input(el), 'ArrowDown').defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(row(el, '1'));
    });

    it('ignores keys outside the combobox contract', async () => {
      const el = await mount();
      expect(press(input(el), 'ArrowRight').defaultPrevented).toBe(false);
      await flush(el);
      expect(isOpen(el)).toBe(false);
    });

    it('opens on a click on the control and focuses the field', async () => {
      const el = await mount();
      q<HTMLElement>(el, '.ts-control')!.click();
      await flush(el);
      expect(isOpen(el)).toBe(true);
      expect(document.activeElement).toBe(input(el));
    });

    it('does not open without a provider, and says so in the panel', async () => {
      const el = await mount((e) => (e.provider = null));
      el.open();
      await flush(el);
      expect(isOpen(el)).toBe(false);
      expect(q(el, '.ts-state')?.textContent?.trim()).toBe('No data provider');
    });

    it('closes once disabled and refuses to reopen', async () => {
      const el = await mount();
      el.open();
      await flush(el);
      el.disabled = true;
      await flush(el);
      expect(isOpen(el)).toBe(false);
      el.open();
      await flush(el);
      expect(isOpen(el)).toBe(false);
      expect(input(el).disabled).toBe(true);
    });
  });

  describe('request lifecycle', () => {
    it('marks the panel busy while the roots load', async () => {
      const { provider, pending } = deferredProvider();
      const el = await mount((e) => (e.provider = provider));
      el.open();
      await flush(el);
      expect(panel(el).getAttribute('aria-busy')).toBe('true');
      expect(q(el, '.ts-spinner')).not.toBeNull();
      pending[0].resolve({ nodes: TREE });
      await flush(el);
      expect(panel(el).hasAttribute('aria-busy')).toBe(false);
      expect(rowIds(el)).toEqual(['1', '2']);
    });

    it('a newer search supersedes an older one whose answer arrives late', async () => {
      const { provider, pending } = deferredProvider();
      const el = await mount((e) => (e.provider = provider));
      el.open();
      await flush(el);
      pending[0].resolve({ nodes: TREE });
      type('a', input(el));
      await flush(el);
      type('ap', input(el));
      await flush(el);
      const [first, second] = pending.filter((p) => p.kind === 'search');
      expect(first.req.signal.aborted).toBe(true);
      second.resolve({ nodes: [{ id: '1a', label: 'Apple' }] });
      first.resolve({ nodes: [{ id: 'stale', label: 'Stale' }] });
      await flush(el);
      expect(rowIds(el)).toEqual(['1a']);
    });

    it('surfaces a failed provider call as loaderror and stops loading', async () => {
      const { provider, pending } = deferredProvider();
      const el = await mount((e) => (e.provider = provider));
      const errors = events<{ error: unknown }>(el, 'loaderror');
      el.open();
      await flush(el);
      pending[0].reject(new Error('down'));
      await flush(el);
      expect(errors.map((e) => (e.error as Error).message)).toEqual(['down']);
      expect(panel(el).hasAttribute('aria-busy')).toBe(false);
    });

    it('treats an AbortError rejection as a cancellation, not a failure', async () => {
      const { provider, pending } = deferredProvider();
      const el = await mount((e) => (e.provider = provider));
      const errors = events(el, 'loaderror');
      el.open();
      await flush(el);
      pending[0].reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      await flush(el);
      expect(errors).toEqual([]);
    });

    it('aborts the in-flight request when removed from the document', async () => {
      const { provider, pending } = deferredProvider();
      const el = await mount((e) => (e.provider = provider));
      el.open();
      await flush(el);
      el.remove();
      expect(pending[0].req.signal.aborted).toBe(true);
    });

    it('surfaces a failed lazy children load as loaderror and marks the row', async () => {
      const provider = new InMemoryTreeSelectProvider(TREE);
      provider.loadChildren = () => Promise.reject(new Error('no kids'));
      const el = await mount((e) => (e.provider = provider));
      const errors = events<{ error: unknown }>(el, 'loaderror');
      el.open();
      await flush(el);
      q<HTMLElement>(el, '[data-node-id="1"] [data-tree-chevron]')!.click();
      await flush(el);
      expect(errors).toHaveLength(1);
      expect(row(el, '1')?.getAttribute('data-error')).toBe('true');
    });

    it('starts over when the provider is swapped', async () => {
      const el = await mount();
      el.open();
      await flush(el);
      el.provider = new InMemoryTreeSelectProvider([{ id: 'x', label: 'X' }]);
      await flush(el);
      expect(isOpen(el)).toBe(false);
      el.open();
      await flush(el);
      expect(rowIds(el)).toEqual(['x']);
    });
  });

  describe('search and the panel bodies', () => {
    it('searches, then restores the browse tree when the text is cleared', async () => {
      const el = await mount();
      const searches = events<{ query: string }>(el, 'searchstart');
      el.open();
      await flush(el);
      type('carrot', input(el));
      await flush(el);
      expect(rowIds(el)).toEqual(['2a']);
      type('', input(el));
      await flush(el);
      expect(rowIds(el)).toEqual(['1', '2']);
      expect(searches.map((s) => s.query)).toEqual(['carrot', '']);
    });

    it('closing the panel resets the query so reopening shows the browse tree', async () => {
      const el = await mount();
      el.open();
      await flush(el);
      type('carrot', input(el));
      await flush(el);
      el.close();
      await flush(el);
      expect(input(el).value).toBe('');
      el.open();
      await flush(el);
      expect(rowIds(el)).toEqual(['1', '2']);
    });

    it('announces the result count', async () => {
      const el = await mount();
      el.open();
      await flush(el);
      type('a', input(el));
      await flush(el);
      expect(q(el, '[aria-live]')?.textContent?.trim()).toMatch(/^\d+ results\.$/);
    });

    it('renders the no-results and empty-tree defaults, or the consumer slots', async () => {
      const el = await mount();
      el.open();
      await flush(el);
      type('zzz', input(el));
      await flush(el);
      expect(q(el, '.ts-state')?.textContent?.trim()).toBe('No results');

      const empty = await mount((e) => {
        e.provider = new InMemoryTreeSelectProvider([]);
        const slot = document.createElement('em');
        slot.slot = 'enterSearchTerm';
        slot.textContent = 'Type to search';
        e.append(slot);
      });
      empty.open();
      await flush(empty);
      expect(q(empty, '.ts-state')?.textContent?.trim()).toBe('Type to search');
    });

    it('renders the header and footer slots around the panel body', async () => {
      const el = await mount((e) => {
        const header = Object.assign(document.createElement('span'), { slot: 'header', textContent: 'Top' });
        const footer = Object.assign(document.createElement('span'), { slot: 'footer', textContent: 'Bottom' });
        e.append(header, footer);
      });
      expect(q(el, '.ts-panel-header')?.textContent?.trim()).toBe('Top');
      expect(q(el, '.ts-panel-footer')?.textContent?.trim()).toBe('Bottom');
    });

    it('searches from the panel search box in the button variant', async () => {
      const el = await mount((e) => (e.variant = 'button'));
      el.open();
      await flush(el);
      const search = q<HTMLInputElement>(el, 'input.panel-search')!;
      expect(search.getAttribute('aria-label')).toBe('Search');
      type('apple', search);
      await flush(el);
      expect(rowIds(el)).toEqual(['1a']);
    });

    it('carries the panel height to the stylesheet as a custom property on the body', async () => {
      const el = await mount((e) => (e.panelScrollHeight = '120px'));
      expect(q<HTMLElement>(el, '.ts-panel-body')!.style.getPropertyValue('--mp-tree-select-panel-max-height')).toBe('120px');
    });
  });

  describe('paging', () => {
    it('appends the next page of roots on Load more, and hides the button on the last page', async () => {
      const el = await mount((e) => (e.provider = new InMemoryTreeSelectProvider(TREE, { pageSize: 1 })));
      el.open();
      await flush(el);
      expect(rowIds(el)).toEqual(['1']);
      q<HTMLElement>(el, '.ts-load-more')!.click();
      await flush(el);
      expect(rowIds(el)).toEqual(['1', '2']);
      expect(q(el, '.ts-load-more')).toBeNull();
    });
  });

  describe('selection', () => {
    it('picks a node in single mode, closes, and reports it', async () => {
      const el = await mount();
      const values = events<unknown>(el, 'valuechange');
      el.open();
      await flush(el);
      row(el, '2')!.click();
      await flush(el);
      expect(values).toEqual([expect.objectContaining({ id: '2' })]);
      expect(el.value).toMatchObject({ id: '2' });
      expect(isOpen(el)).toBe(false);
      expect(q(el, '.ts-single-value')?.textContent?.trim()).toBe('Vegetables');
      expect(q(el, '[aria-live]')?.textContent?.trim()).toBe('Vegetables selected.');
    });

    it('toggles a leaf in multiple mode, and a folder row only expands', async () => {
      const el = await mount((e) => (e.mode = 'multiple'));
      el.open();
      await flush(el);
      row(el, '1')!.click();
      await flush(el);
      expect(el.value).toBeNull(); // an untouched multi-select has no value yet
      expect(rowIds(el)).toContain('1a');
      row(el, '1a')!.click();
      await flush(el);
      expect((el.value as TreeNode[]).map((n) => n.id)).toEqual(['1a']);
      expect(row(el, '1a')?.getAttribute('aria-selected')).toBe('true');
      row(el, '1a')!.click();
      await flush(el);
      expect(el.value).toEqual([]);
    });

    it('cascades over loaded descendants in checkbox mode and marks a partial branch mixed', async () => {
      const el = await mount((e) => {
        e.mode = 'checkbox';
        e.cascadeSelect = true;
      });
      el.open();
      await flush(el);
      q<HTMLElement>(el, '[data-node-id="1"] [data-tree-chevron]')!.click();
      await flush(el);
      q<HTMLElement>(el, '[data-node-id="1"] [data-ts-check]')!.click();
      await flush(el);
      expect((el.value as TreeNode[]).map((n) => n.id).sort()).toEqual(['1', '1a', '1b']);
      row(el, '1a')!.click();
      await flush(el);
      expect((el.value as TreeNode[]).map((n) => n.id)).toEqual(['1b']);
      expect(row(el, '1')?.getAttribute('aria-checked')).toBe('mixed');
      expect(row(el, '1')?.hasAttribute('aria-selected')).toBe(false);
    });

    it('extends a checked cascade parent to children loaded afterwards', async () => {
      const el = await mount((e) => {
        e.mode = 'checkbox';
        e.cascadeSelect = true;
      });
      el.open();
      await flush(el);
      q<HTMLElement>(el, '[data-node-id="2"] [data-ts-check]')!.click();
      await flush(el);
      q<HTMLElement>(el, '[data-node-id="2"] [data-tree-chevron]')!.click();
      await flush(el);
      expect((el.value as TreeNode[]).map((n) => n.id).sort()).toEqual(['2', '2a']);
      expect(row(el, '2a')?.getAttribute('aria-checked')).toBe('true');
    });

    it('Space on a focused row toggles it in multiple mode', async () => {
      const el = await mount((e) => (e.mode = 'multiple'));
      el.open();
      await flush(el);
      press(input(el), 'ArrowDown');
      press(row(el, '1')!, 'ArrowDown');
      await flush(el);
      press(row(el, '2')!, ' ');
      await flush(el);
      expect((el.value as TreeNode[]).map((n) => n.id)).toEqual(['2']);
    });

    it('removes a chip and moves focus to the next chip, then to the field', async () => {
      const el = await mount((e) => {
        e.mode = 'multiple';
        e.value = [TREE[0], TREE[1]];
      });
      const removes = () => [...el.querySelectorAll<HTMLButtonElement>('.ts-chip-remove')];
      expect(removes().map((b) => b.getAttribute('aria-label'))).toEqual(['Remove Fruit', 'Remove Vegetables']);
      removes()[0].focus();
      removes()[0].click();
      await flush(el);
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
      expect((el.value as TreeNode[]).map((n) => n.id)).toEqual(['2']);
      expect(document.activeElement).toBe(removes()[0]);
      removes()[0].click();
      await flush(el);
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
      expect(document.activeElement).toBe(input(el));
    });

    it('clears everything with the clear button and announces it', async () => {
      const el = await mount((e) => {
        e.mode = 'multiple';
        e.showClear = true;
        e.value = [TREE[0]];
      });
      const changes = events<{ added?: TreeNode; removed?: TreeNode }>(el, 'selectionchanged');
      const clear = q<HTMLButtonElement>(el, '.ts-clear')!;
      expect(clear.getAttribute('aria-label')).toBe('Clear');
      clear.click();
      await flush(el);
      expect(el.value).toEqual([]);
      expect(changes).toEqual([{ value: [] }]);
      expect(q(el, '.ts-clear')).toBeNull();
      expect(q(el, '[aria-live]')?.textContent?.trim()).toBe('Selection cleared.');
    });

    it('narrows a multi-selection to its first node when switched to single mode', async () => {
      const el = await mount((e) => {
        e.mode = 'multiple';
        e.value = [TREE[0], TREE[1]];
      });
      el.mode = 'single';
      await flush(el);
      expect(el.value).toMatchObject({ id: '1' });
    });
  });

  describe('consumer templates', () => {
    it('renders chosen nodes through itemRenderer, rows through suggestionRenderer', async () => {
      const el = await mount((e) => {
        e.mode = 'multiple';
        e.value = [TREE[1]];
        e.itemRenderer = ({ node }) => Object.assign(document.createElement('b'), { textContent: `item:${node.label}` });
        e.suggestionRenderer = ({ node }) => Object.assign(document.createElement('i'), { textContent: `row:${node.label}` });
      });
      el.open();
      await flush(el);
      expect(q(el, '.ts-chip-label b')?.textContent).toBe('item:Vegetables');
      expect(q(el, '[data-node-id="1"] i')?.textContent).toBe('row:Fruit');
      // Consumer nodes stay unscoped: our rules cannot reach them.
      expect(q(el, '[data-node-id="1"] i')?.hasAttribute('data-mps')).toBe(false);
    });

    it('renders the button variant body as a placeholder, a label, or the buttonRenderer', async () => {
      const el = await mount((e) => {
        e.variant = 'button';
        e.placeholder = 'Pick one';
      });
      expect(q(el, '.ts-placeholder')?.textContent?.trim()).toBe('Pick one');
      el.value = TREE[0];
      await flush(el);
      expect(q(el, '.ts-button .ts-single-value')?.textContent?.trim()).toBe('Fruit');
      el.buttonRenderer = ({ value }) => Object.assign(document.createElement('u'), { textContent: `v:${(value as TreeNode).label}` });
      await flush(el);
      expect(q(el, '.ts-button u')?.textContent).toBe('v:Fruit');
    });
  });
});
