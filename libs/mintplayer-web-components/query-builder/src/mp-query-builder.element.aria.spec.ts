import { describe, it, expect, beforeEach } from 'vitest';
import './mp-query-builder.element';
import './mp-query-group.element';
import type { MpQueryBuilderElement } from './mp-query-builder.element';
import type { MpQueryGroupElement } from './mp-query-group.element';
import type { Expression, Group } from './model/expression';
import type { EntitySchema } from './model/field-def';
import { emptyGroup } from './model/default-tree';

/**
 * The ARIA surface of the query builder: the role/level structure of the group
 * tree, the accessible names the toolbar and row controls hand to their
 * controls, and how both react to a PROGRAMMATIC write (a new tree, a new
 * `messages` bundle, a new `sortBy`/`savedQueries` list, a drag starting).
 *
 * The 16 sibling specs assert the model, the events, the keymap and the
 * rendered TEXT; none of them asserts a single role or aria-* attribute, so
 * every assertion here is new. Names are read where the builder writes them —
 * on the `<mp-select>`/`<mp-checkbox>` HOST — because forwarding a host
 * `aria-label` down to the inner control is those components' own contract
 * (`_conformance/naming.spec.ts`), not this one's.
 */
const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'status', label: 'Status', type: 'string' },
      { name: 'lineItems', label: 'Line items', type: 'relation', targetEntity: 'lineItems' },
    ],
  },
  { name: 'customers', label: 'Customers', fields: [{ name: 'name', label: 'Name', type: 'string' }] },
  { name: 'lineItems', label: 'Line items', fields: [{ name: 'amount', label: 'Amount', type: 'number' }] },
];

async function settle(el: Element): Promise<void> {
  const lit = el as Element & { updateComplete?: Promise<boolean> };
  if (lit.updateComplete) await lit.updateComplete;
  if (el.shadowRoot) {
    for (const child of Array.from(el.shadowRoot.querySelectorAll('*'))) {
      await settle(child);
    }
  }
}

/** Settle twice: descendants mounted by the first pass need one of their own. */
async function settled(el: Element): Promise<void> {
  await settle(el);
  await settle(el);
}

async function mount(
  init: (el: MpQueryBuilderElement) => void,
): Promise<MpQueryBuilderElement> {
  const el = document.createElement('mp-query-builder') as MpQueryBuilderElement;
  el.schema = SCHEMA;
  el.rootEntity = 'orders';
  el.query = emptyGroup('and');
  init(el);
  document.body.appendChild(el);
  await settled(el);
  return el;
}

/** Every match for `selector`, piercing every shadow root under `root`. */
function deepQueryAll(root: Element, selector: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  const stack: Array<Element | ShadowRoot> = [root];
  if (root.shadowRoot) stack.push(root.shadowRoot);
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const el of Array.from(current.querySelectorAll<HTMLElement>(selector))) out.push(el);
    for (const el of Array.from(current.querySelectorAll('*'))) {
      if (el.shadowRoot) stack.push(el.shadowRoot);
    }
  }
  return out;
}

function deepQuery(root: Element, selector: string): HTMLElement {
  const hit = deepQueryAll(root, selector)[0];
  if (!hit) throw new Error(`no ${selector} anywhere under <${root.localName}>`);
  return hit;
}

const flatTree = (logic: 'and' | 'or'): Group => ({
  kind: 'group',
  id: 'g1',
  logic,
  children: [{ kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 }],
});

describe('mp-query-builder ARIA structure', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('gives every group role="group", a logic-derived name and a 1-based aria-level', async () => {
    const nested: Expression = {
      kind: 'group',
      id: 'g1',
      logic: 'and',
      children: [
        {
          kind: 'group',
          id: 'g2',
          logic: 'or',
          children: [{ kind: 'condition', id: 'c1', field: 'status', operator: 'equals', value: 'open' }],
        },
      ],
    };
    const el = await mount((e) => (e.query = nested));

    const groups = deepQueryAll(el, '.qb-group');
    expect(groups.length).toBe(2);
    expect(groups.map((g) => g.getAttribute('role'))).toEqual(['group', 'group']);
    expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(['AND group', 'OR group']);
    // aria-level is 1-based, so the outermost group is level 1, not 0.
    expect(groups.map((g) => g.getAttribute('aria-level'))).toEqual(['1', '2']);
  });

  it('renames the group when its logic changes, in both directions', async () => {
    const el = await mount((e) => (e.query = flatTree('and')));
    expect(deepQuery(el, '.qb-group').getAttribute('aria-label')).toBe('AND group');

    el.query = flatTree('or');
    await settled(el);
    expect(deepQuery(el, '.qb-group').getAttribute('aria-label')).toBe('OR group');

    el.query = flatTree('and');
    await settled(el);
    expect(deepQuery(el, '.qb-group').getAttribute('aria-label')).toBe('AND group');
  });

  it('keeps aria-pressed on BOTH logic buttons in step with the current logic', async () => {
    const el = await mount((e) => (e.query = flatTree('and')));
    const pressed = () =>
      deepQueryAll(el, '.qb-logic-btn').map((b) => b.getAttribute('aria-pressed'));

    // Written on both buttons, always — not only on the active one, which is
    // the "write-only-when-true" defect this asserts against.
    expect(pressed()).toEqual(['true', 'false']);

    el.query = flatTree('or');
    await settled(el);
    expect(pressed()).toEqual(['false', 'true']);

    el.query = flatTree('and');
    await settled(el);
    expect(pressed()).toEqual(['true', 'false']);
  });

  it('announces the depth-limit refusal as an alert, and withdraws it when depth drops', async () => {
    const el = await mount((e) => {
      e.query = flatTree('and');
      e.maxDepth = 5;
      e.depth = 10;
    });
    expect(deepQuery(el, '.qb-too-deep').getAttribute('role')).toBe('alert');

    el.depth = 0;
    await settled(el);
    expect(deepQueryAll(el, '.qb-too-deep').length).toBe(0);
    expect(deepQueryAll(el, '.qb-group').length).toBe(1);
  });
});

describe('mp-query-builder accessible names', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names the condition row controls and the logic toggle from the default messages', async () => {
    const el = await mount((e) => (e.query = flatTree('and')));

    expect(deepQuery(el, '.qb-logic-toggle').getAttribute('role')).toBe('group');
    expect(deepQuery(el, '.qb-logic-toggle').getAttribute('aria-label')).toBe('Group logic');
    expect(deepQuery(el, '.qb-field-select').getAttribute('aria-label')).toBe('Field');
    expect(deepQuery(el, '.qb-operator-select').getAttribute('aria-label')).toBe('Operator');
    expect(deepQuery(el, '.qb-remove').getAttribute('aria-label')).toBe('Remove');
    expect(deepQuery(el, '.qb-drag-handle').getAttribute('aria-label')).toBe(
      'Drag or use Alt+Up/Down to reorder',
    );
  });

  it('re-labels every named control when a messages bundle is written', async () => {
    const el = await mount((e) => (e.query = flatTree('and')));

    el.messages = {
      field: 'Champ',
      operator: 'Opérateur',
      removeRow: 'Supprimer',
      groupLogic: 'Logique du groupe',
      reorderHint: 'Alt+Haut/Bas pour réordonner',
    };
    await settled(el);

    expect(deepQuery(el, '.qb-field-select').getAttribute('aria-label')).toBe('Champ');
    expect(deepQuery(el, '.qb-operator-select').getAttribute('aria-label')).toBe('Opérateur');
    expect(deepQuery(el, '.qb-remove').getAttribute('aria-label')).toBe('Supprimer');
    expect(deepQuery(el, '.qb-logic-toggle').getAttribute('aria-label')).toBe('Logique du groupe');
    expect(deepQuery(el, '.qb-drag-handle').getAttribute('aria-label')).toBe(
      'Alt+Haut/Bas pour réordonner',
    );
  });

  it('groups and names the toolbar sections', async () => {
    const el = await mount((e) => {
      e.multiEntityPickerEnabled = true;
      e.sortBy = [{ field: 'total', direction: 'asc' }];
    });

    expect(deepQuery(el, '.qb-entity-picker').getAttribute('aria-label')).toBe('Entity');

    const projection = deepQuery(el, '.qb-field-projection');
    expect(projection.getAttribute('role')).toBe('group');
    expect(projection.getAttribute('aria-label')).toBe('Columns');

    const sort = deepQuery(el, '.qb-sort-by');
    expect(sort.getAttribute('role')).toBe('group');
    expect(sort.getAttribute('aria-label')).toBe('Sort by');
  });

  it('names each projection checkbox after its field', async () => {
    const el = await mount((e) => (e.multiEntityPickerEnabled = true));

    expect(deepQueryAll(el, '.qb-field-checkbox').map((c) => c.getAttribute('aria-label'))).toEqual([
      'Total',
      'Status',
    ]);
  });

  it('numbers the sort rows so identical controls stay distinguishable, and renumbers on change', async () => {
    const el = await mount((e) => {
      e.multiEntityPickerEnabled = true;
      e.sortBy = [{ field: 'total', direction: 'asc' }];
    });
    const names = (selector: string) =>
      deepQueryAll(el, selector).map((n) => n.getAttribute('aria-label'));

    expect(names('.qb-sort-field')).toEqual(['Sort 1 field']);
    expect(names('.qb-sort-direction')).toEqual(['Sort 1 direction']);
    expect(names('.qb-sort-remove')).toEqual(['Remove sort 1']);

    el.sortBy = [
      { field: 'total', direction: 'asc' },
      { field: 'status', direction: 'desc' },
    ];
    await settled(el);

    expect(names('.qb-sort-field')).toEqual(['Sort 1 field', 'Sort 2 field']);
    expect(names('.qb-sort-direction')).toEqual(['Sort 1 direction', 'Sort 2 direction']);
    expect(names('.qb-sort-remove')).toEqual(['Remove sort 1', 'Remove sort 2']);
  });

  it('names each saved-query delete button after its row, and follows the list', async () => {
    const tree = flatTree('and');
    const el = await mount((e) => {
      e.query = tree;
      e.showSavedQueries = true;
      e.savedQueries = [{ name: 'Open orders', tree }];
    });

    expect(deepQuery(el, '.qb-saved-name').getAttribute('aria-label')).toBe('Name for saved query');
    expect(deepQueryAll(el, '.qb-saved-delete').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Delete Open orders',
    ]);

    el.savedQueries = [
      { name: 'Paid orders', tree },
      { name: 'Open orders', tree },
    ];
    await settled(el);
    expect(deepQueryAll(el, '.qb-saved-delete').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Delete Paid orders',
      'Delete Open orders',
    ]);
  });
});

describe('mp-query-group drop targets', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  async function mountGroup(node: Group, isDragging: boolean): Promise<MpQueryGroupElement> {
    const el = document.createElement('mp-query-group') as MpQueryGroupElement;
    el.node = node;
    el.schema = SCHEMA;
    el.currentEntity = 'orders';
    el.isRoot = true;
    el.isDragging = isDragging;
    document.body.appendChild(el);
    await settled(el);
    return el;
  }

  const twoConditions = (): Group => ({
    kind: 'group',
    id: 'g1',
    logic: 'and',
    children: [
      { kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 1 },
      { kind: 'condition', id: 'c2', field: 'total', operator: 'gt', value: 2 },
    ],
  });

  it('hides the drop slots from assistive tech while a drag runs, and removes them after', async () => {
    // The slots are pointer-only geometry; announcing three unnamed landing
    // strips per row would bury the rows themselves.
    const el = await mountGroup(twoConditions(), true);

    const slots = deepQueryAll(el, '.qb-drop-slot');
    expect(slots.length).toBe(3);
    expect(slots.every((slot) => slot.getAttribute('aria-hidden') === 'true')).toBe(true);

    el.isDragging = false;
    await settled(el);
    expect(deepQueryAll(el, '.qb-drop-slot').length).toBe(0);
  });

  it('hides the empty-group drop placeholder too, visible text and all', async () => {
    const el = await mountGroup(emptyGroup('and'), true);

    const placeholder = deepQuery(el, '.qb-drop-slot-placeholder');
    expect(placeholder.getAttribute('aria-hidden')).toBe('true');
    expect(placeholder.textContent).toContain('Drop here');
  });
});
