import { beforeEach, describe, expect, it } from 'vitest';
import postcss from 'postcss';

import { getLightStyleEntries } from '@mintplayer/web-components/light-dom';
import '@mintplayer/web-components/datatable';
import '@mintplayer/web-components/treeview';
import { InMemoryTreeSelectProvider } from '@mintplayer/ui-core/tree-select';
import '@mintplayer/web-components/tree-select';
import '@mintplayer/web-components/query-builder';
import { inMemoryTypeaheadProvider } from '@mintplayer/web-components/typeahead';

/**
 * The boundary, checked in the direction nothing else checks it.
 *
 * `light-styles-scoping.spec.ts` proves our rules do not match a DECOY tree —
 * elements nobody stamped, standing in for a consumer's markup elsewhere on the
 * page. That is the outside-the-component case. It cannot see the inside one:
 * DOM a consumer hands us through a render callback and we then mount INSIDE
 * our own subtree, next to elements we did stamp.
 *
 * Three bugs on 2026-09-02 lived in exactly that blind spot, and they failed in
 * both directions:
 *
 *  - `66ccac2d` — the datatable's `td` rules were rescoped to `td[data-mps]`,
 *    which a consumer-rendered cell never carries, so a `*bsRowTemplate` row
 *    lost its padding, borders and nowrap. Stamped too LITTLE.
 *  - `6e1e57dd` — tree-select stamped its node wrapper AFTER the consumer's
 *    suggestionTemplate output was appended, and `stampScope` recurses, so the
 *    consumer's nodes were branded with our scope. Stamped too MUCH.
 *  - The same shape is latent in every other callback API.
 *
 * The invariant this suite pins, once per callback API:
 *
 *  1. Consumer DOM carries NO `data-mps` attribute — not on the node they gave
 *     us, not on any descendant of it.
 *  2. No selector in ANY light-tier sheet matches consumer DOM. (1) implies
 *     most of (2), but not all of it: an unstamped bare-tag or descendant rule
 *     would still reach in, so the match is asserted directly.
 *
 * A component may still style consumer content deliberately — but only through
 * a rule anchored on an element WE stamped, which is the mechanism the scoping
 * suite already governs. What must never happen is our scope landing on their
 * markup.
 */

const CONSUMER_CLASS = 'consumer-owned';

/** A consumer's node: a wrapper with nested children, including tag names our sheets mention. */
function consumerNode(text = 'consumer'): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = CONSUMER_CLASS;
  const button = document.createElement('button');
  button.textContent = text;
  const inner = document.createElement('span');
  inner.className = 'badge';
  inner.textContent = text;
  wrap.append(button, inner);
  return wrap;
}

/** Every selector in every installed light-tier sheet. */
function allSelectors(): { key: string; selector: string }[] {
  const out: { key: string; selector: string }[] = [];
  // Bootstrap part sheets (#452) are stock Bootstrap, page-level by contract.
  for (const entry of getLightStyleEntries().filter((e) => !e.key.startsWith('bootstrap-'))) {
    postcss.parse(entry.cssText).walkRules((rule) => {
      for (const p of ancestors(rule)) {
        if (p.type === 'atrule' && /^(-\w+-)?keyframes$/i.test(p.name ?? '')) return;
      }
      for (const selector of rule.selectors) out.push({ key: entry.key, selector });
    });
  }
  return out;
}

function ancestors(node: { parent?: unknown }): { type?: string; name?: string }[] {
  const out: { type?: string; name?: string }[] = [];
  for (let p: unknown = node.parent; p; p = (p as { parent?: unknown }).parent) {
    out.push(p as { type?: string; name?: string });
  }
  return out;
}

/**
 * Assert the consumer's subtree is untouched: unstamped, and unmatched by every
 * light-tier rule. `selectors` is hoisted by the caller so the parse cost is
 * paid once for the whole suite.
 */
function expectUntouched(root: HTMLElement, api: string, selectors: { key: string; selector: string }[]): void {
  const nodes = [root, ...Array.from(root.querySelectorAll('*'))] as HTMLElement[];

  for (const node of nodes) {
    expect(
      node.hasAttribute('data-mps'),
      `${api}: consumer DOM was branded with data-mps="${node.getAttribute('data-mps')}" ` +
        `(<${node.tagName.toLowerCase()}>). stampScope recurses — call it BEFORE appending ` +
        `consumer content, never after.`,
    ).toBe(false);
  }

  for (const { key, selector } of selectors) {
    for (const node of nodes) {
      let matches = false;
      try {
        matches = node.matches(selector);
      } catch {
        continue; // A selector jsdom cannot parse cannot match either.
      }
      expect(
        matches,
        `${api}: the "${key}" sheet's rule \`${selector}\` matches consumer DOM ` +
          `(<${node.tagName.toLowerCase()} class="${node.className}">). A light-tier rule may ` +
          `only reach content through an element WE stamped.`,
      ).toBe(false);
    }
  }
}

async function settle(el: Element): Promise<void> {
  await (el as { updateComplete?: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as { updateComplete?: Promise<unknown> }).updateComplete;
}

interface Row {
  id: number;
  name: string;
}
const ROWS: Row[] = [
  { id: 1, name: 'Alpha' },
  { id: 2, name: 'Beta' },
];
const COLUMNS = [{ name: 'name', label: 'Name' }];

const TREE = [
  { id: '1', label: 'Fruit', children: [{ id: '1a', label: 'Apple' }] },
  { id: '2', label: 'Veg' },
];

describe('consumer DOM mounted through a render callback', () => {
  const selectors = allSelectors();

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('has sheets to check — an empty registry would make every case vacuous', () => {
    expect(getLightStyleEntries().map((e) => e.key)).toEqual(
      expect.arrayContaining(['datatable', 'treeview', 'tree-select', 'typeahead']),
    );
    expect(selectors.length).toBeGreaterThan(50);
  });

  it('mp-datatable cellRenderer', async () => {
    document.body.innerHTML = '<mp-datatable></mp-datatable>';
    const el = document.querySelector('mp-datatable') as HTMLElement & Record<string, unknown>;
    el.columns = COLUMNS;
    el.cellRenderer = () => consumerNode('cell');
    el.data = ROWS;
    await settle(el);

    const mounted = el.querySelectorAll(`.${CONSUMER_CLASS}`);
    expect(mounted.length, 'cellRenderer output never reached the DOM').toBeGreaterThan(0);
    for (const node of mounted) expectUntouched(node as HTMLElement, 'datatable cellRenderer', selectors);
  });

  it('mp-datatable headerRenderer', async () => {
    document.body.innerHTML = '<mp-datatable></mp-datatable>';
    const el = document.querySelector('mp-datatable') as HTMLElement & Record<string, unknown>;
    el.columns = COLUMNS;
    el.headerRenderer = () => consumerNode('header');
    el.data = ROWS;
    await settle(el);

    const mounted = el.querySelectorAll(`thead .${CONSUMER_CLASS}`);
    expect(mounted.length, 'headerRenderer output never reached the DOM').toBeGreaterThan(0);
    for (const node of mounted) expectUntouched(node as HTMLElement, 'datatable headerRenderer', selectors);
  });

  it('mp-datatable rowRenderer', async () => {
    document.body.innerHTML = '<mp-datatable></mp-datatable>';
    const el = document.querySelector('mp-datatable') as HTMLElement & Record<string, unknown>;
    el.columns = COLUMNS;
    el.rowRenderer = () => {
      const td = document.createElement('td');
      td.appendChild(consumerNode('row'));
      return [td];
    };
    el.data = ROWS;
    await settle(el);

    const mounted = el.querySelectorAll(`tbody .${CONSUMER_CLASS}`);
    expect(mounted.length, 'rowRenderer output never reached the DOM').toBeGreaterThan(0);
    for (const node of mounted) expectUntouched(node as HTMLElement, 'datatable rowRenderer', selectors);
  });

  it('mp-datatable filterRenderer', async () => {
    document.body.innerHTML = '<mp-datatable></mp-datatable>';
    const el = document.querySelector('mp-datatable') as HTMLElement & Record<string, unknown>;
    el.columns = [{ ...COLUMNS[0], filterable: true, filterMode: 'custom' }];
    el.filterRenderer = () => consumerNode('filter');
    el.data = ROWS;
    await settle(el);

    const panel = el.querySelector<HTMLElement>('tr.filter-row .filter-panel');
    expect(panel, 'no filter panel rendered').not.toBeNull();
    // jsdom has no popover: the panel opens through the toggle event the core listens for.
    panel!.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'open', oldState: 'closed' }));
    await settle(el);

    const mounted = el.querySelectorAll(`.filter-panel .${CONSUMER_CLASS}`);
    expect(mounted.length, 'filterRenderer output never reached the DOM').toBeGreaterThan(0);
    for (const node of mounted) expectUntouched(node as HTMLElement, 'datatable filterRenderer', selectors);
  });

  it('mp-treeview nodeRenderer', async () => {
    document.body.innerHTML = '<mp-treeview></mp-treeview>';
    const el = document.querySelector('mp-treeview') as HTMLElement & Record<string, unknown>;
    el.nodeRenderer = () => consumerNode('node');
    el.items = TREE;
    await settle(el);

    const mounted = el.querySelectorAll(`.${CONSUMER_CLASS}`);
    expect(mounted.length, 'nodeRenderer output never reached the DOM').toBeGreaterThan(0);
    for (const node of mounted) expectUntouched(node as HTMLElement, 'treeview nodeRenderer', selectors);
  });

  it('mp-tree-select itemRenderer', async () => {
    document.body.innerHTML = '<mp-tree-select></mp-tree-select>';
    const el = document.querySelector('mp-tree-select') as HTMLElement & Record<string, unknown>;
    el.itemRenderer = () => consumerNode('item');
    el.value = { id: '1', label: 'Fruit' };
    await settle(el);

    const mounted = el.querySelectorAll(`.${CONSUMER_CLASS}`);
    expect(mounted.length, 'itemRenderer output never reached the DOM').toBeGreaterThan(0);
    for (const node of mounted) expectUntouched(node as HTMLElement, 'tree-select itemRenderer', selectors);
  });

  it('mp-tree-select buttonRenderer', async () => {
    document.body.innerHTML = '<mp-tree-select variant="button"></mp-tree-select>';
    const el = document.querySelector('mp-tree-select') as HTMLElement & Record<string, unknown>;
    el.buttonRenderer = () => consumerNode('button');
    await settle(el);

    const mounted = el.querySelectorAll(`.${CONSUMER_CLASS}`);
    expect(mounted.length, 'buttonRenderer output never reached the DOM').toBeGreaterThan(0);
    for (const node of mounted) expectUntouched(node as HTMLElement, 'tree-select buttonRenderer', selectors);
  });

  /**
   * The case that actually regressed (`6e1e57dd`), and the reason this suite is
   * not decoration: the old tree-select built its row wrapper imperatively and
   * stamped it, so the ORDER of stamping versus appending the consumer's node
   * decided whether their DOM got branded. The rows are now template-rendered
   * (#437), and this pins that the consumer's node still stays unbranded.
   */
  it('mp-tree-select suggestionRenderer', async () => {
    // jsdom has no popover: the panel opens through the toggle event the core listens for.
    const proto = HTMLElement.prototype as HTMLElement & { showPopover?: () => void };
    const original = proto.showPopover;
    proto.showPopover = function (this: HTMLElement) {
      this.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'open', oldState: 'closed' }));
    };
    document.body.innerHTML = '<mp-tree-select></mp-tree-select>';
    const el = document.querySelector('mp-tree-select') as HTMLElement & Record<string, unknown> & {
      open(): void;
    };
    el.searchDebounceMs = 0;
    el.mode = 'checkbox';
    el.provider = new InMemoryTreeSelectProvider(TREE);
    el.suggestionRenderer = () => consumerNode('suggestion');
    await settle(el);
    try {
      el.open();
    } finally {
      proto.showPopover = original;
    }
    await settle(el);
    await settle(el);

    const mounted = el.querySelectorAll(`.${CONSUMER_CLASS}`);
    expect(mounted.length, 'suggestionRenderer output never reached the DOM').toBeGreaterThan(0);
    for (const node of mounted) {
      expectUntouched(node as HTMLElement, 'tree-select suggestionRenderer', selectors);
    }
  });

  /** The typeahead's itemRenderer output is a lit child value: never stamped, never matched (#436). */
  it('mp-typeahead itemRenderer', async () => {
    document.body.innerHTML = '<mp-typeahead debounce-ms="0"></mp-typeahead>';
    const el = document.querySelector('mp-typeahead') as unknown as HTMLElement & Record<string, unknown>;
    el.provider = inMemoryTypeaheadProvider([{ text: 'Fruit' }, { text: 'Frog' }]);
    el.itemRenderer = () => consumerNode('row');
    await settle(el);
    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'fr';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    await settle(el);

    const mounted = el.querySelectorAll(`.${CONSUMER_CLASS}`);
    expect(mounted.length, 'itemRenderer output never reached the DOM').toBeGreaterThan(0);
    for (const node of mounted) expectUntouched(node as HTMLElement, 'typeahead itemRenderer', selectors);
  });
});
