import { describe, it, expect, beforeEach } from 'vitest';
import './mp-query-builder.element';
import type { MpQueryBuilderElement } from './mp-query-builder.element';
import type { Condition, Expression, Group } from './model/expression';
import type { EntitySchema } from './model/field-def';

const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'status', label: 'Status', type: 'string' },
      { name: 'orderDate', label: 'Order date', type: 'date' },
      { name: 'lineItems', label: 'Line items', type: 'relation', targetEntity: 'lineItems' },
    ],
  },
  {
    name: 'lineItems',
    label: 'Line items',
    fields: [
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'sku', label: 'SKU', type: 'string' },
    ],
  },
];

async function settle(el: Element): Promise<void> {
  const lit = el as Element & { updateComplete?: Promise<boolean> };
  if (lit.updateComplete) await lit.updateComplete;
  // Tier-agnostic: the query-builder family is light-DOM, so recurse through the
  // render root — shadowRoot when a nested component still has one, else the
  // element's own children. Only custom elements can have an updateComplete, and
  // in the light DOM the descendant set is the whole rendered tree, so filtering
  // to `*-*` keeps this from walking thousands of plain nodes.
  const root: ParentNode = el.shadowRoot ?? el;
  for (const child of Array.from(root.querySelectorAll('*'))) {
    if (child.tagName.includes('-')) await settle(child);
  }
}

async function mount(query: Expression): Promise<MpQueryBuilderElement> {
  const el = document.createElement('mp-query-builder') as MpQueryBuilderElement;
  el.schema = SCHEMA;
  el.rootEntity = 'orders';
  el.query = query;
  document.body.appendChild(el);
  await settle(el);
  await settle(el);
  return el;
}

function deepFind(root: Element, selector: string): Element | null {
  const stack: Array<Element | ShadowRoot> = [root];
  if (root.shadowRoot) stack.push(root.shadowRoot);
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const el of Array.from(cur.querySelectorAll(selector))) return el;
    for (const el of Array.from(cur.querySelectorAll('*'))) {
      if (el.shadowRoot) stack.push(el.shadowRoot);
    }
  }
  return null;
}

function deepFindAll(root: Element, selector: string): Element[] {
  const out: Element[] = [];
  const stack: Array<Element | ShadowRoot> = [root];
  if (root.shadowRoot) stack.push(root.shadowRoot);
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const el of Array.from(cur.querySelectorAll(selector))) out.push(el);
    for (const el of Array.from(cur.querySelectorAll('*'))) {
      if (el.shadowRoot) stack.push(el.shadowRoot);
    }
  }
  return out;
}

describe('mp-query-builder (M5 edit flow)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('clicking + Add condition appends a default condition to the root group', async () => {
    const el = await mount({ kind: 'group', id: 'g1', logic: 'and', children: [] });
    const addBtn = deepFind(el, '.qb-add-condition') as HTMLButtonElement;
    addBtn.click();
    await settle(el);
    const tree = el.query as Group;
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0]?.kind).toBe('condition');
    expect((tree.children[0] as Condition).field).toBe('total');
  });

  it('clicking the OR button flips group logic', async () => {
    const el = await mount({ kind: 'group', id: 'g1', logic: 'and', children: [] });
    const orBtn = deepFindAll(el, '.qb-logic-btn').find((b) => b.textContent === 'OR') as HTMLButtonElement;
    orBtn.click();
    await settle(el);
    expect((el.query as Group).logic).toBe('or');
  });

  it('changing the operator dropdown patches the condition', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [{ kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 }],
    };
    const el = await mount(tree);
    const opSelect = deepFind(el, '.qb-operator-select') as HTMLSelectElement;
    opSelect.value = 'between';
    opSelect.dispatchEvent(new Event('change'));
    await settle(el);
    const c1 = (el.query as Group).children[0] as Condition;
    expect(c1.operator).toBe('between');
    expect(c1.value).toEqual([null, null]); // reset because shape changed
  });

  it('changing the field dropdown patches the condition and resets shape-mismatched value', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [{ kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 }],
    };
    const el = await mount(tree);
    const fieldSelect = deepFind(el, '.qb-field-select') as HTMLSelectElement;
    fieldSelect.value = 'status';
    fieldSelect.dispatchEvent(new Event('change'));
    await settle(el);
    const c1 = (el.query as Group).children[0] as Condition;
    expect(c1.field).toBe('status');
    expect(c1.operator).toBe('equals');
    expect(c1.value).toBe(null);
  });

  it('typing into the value input patches the condition value', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [{ kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 }],
    };
    const el = await mount(tree);
    const input = deepFind(el, 'input[type="number"]') as HTMLInputElement;
    input.value = '500';
    input.dispatchEvent(new Event('input'));
    await settle(el);
    const c1 = (el.query as Group).children[0] as Condition;
    expect(c1.value).toBe(500);
  });

  it('clicking the remove button on a condition removes it from the tree', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        { kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 100 },
        { kind: 'condition', id: 'c2', field: 'status', operator: 'equals', value: 'open' },
      ],
    };
    const el = await mount(tree);
    // Find c1's remove specifically (the one inside the mp-query-condition with the matching node).
    const conditions = deepFindAll(el, 'mp-query-condition');
    expect(conditions.length).toBe(2);
    const c1Cond = conditions.find((c) => (c as Element & { node?: { id: string } }).node?.id === 'c1')!;
    const c1Remove = (c1Cond.renderRoot as unknown as ParentNode).querySelector('.qb-remove') as HTMLButtonElement;
    c1Remove.click();
    await settle(el);
    const next = el.query as Group;
    expect(next.children).toHaveLength(1);
    expect((next.children[0] as Condition).id).toBe('c2');
  });

  it('removing the root group is a no-op (root is always present)', async () => {
    const t: Group = { kind: 'group', id: 'g1', logic: 'and', children: [] };
    const el = await mount(t);
    // The root has no "remove group" button (isRoot disables it). Try
    // synthesizing a node-remove event with the root id directly.
    let fired = 0;
    el.addEventListener('query-change', () => fired++);
    (el.renderRoot as unknown as ParentNode)
      .querySelector('.qb-root')!
      .dispatchEvent(new CustomEvent('node-remove', { detail: { id: 'g1' }, bubbles: true, composed: true }));
    await settle(el);
    expect((el.query as Group).id).toBe('g1');
    expect(fired).toBe(0);
  });

  it('fires query-change when a mutation happens', async () => {
    const el = await mount({ kind: 'group', id: 'g1', logic: 'and', children: [] });
    let fired = 0;
    el.addEventListener('query-change', () => fired++);
    const addBtn = deepFind(el, '.qb-add-condition') as HTMLButtonElement;
    addBtn.click();
    await settle(el);
    expect(fired).toBe(1);
  });

  it('mutating a condition inside a sub-query resolves the right entity context', async () => {
    const tree: Group = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [
        {
          kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
          subQuery: {
            kind: 'group', id: 'sg', logic: 'and',
            children: [{ kind: 'condition', id: 'sc', field: 'amount', operator: 'gt', value: 5 }],
          },
        },
      ],
    };
    const el = await mount(tree);
    // Find the value input inside the sub-query and change it.
    const inputs = deepFindAll(el, 'input[type="number"]') as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThan(0);
    const innerInput = inputs[inputs.length - 1]!;
    innerInput.value = '99';
    innerInput.dispatchEvent(new Event('input'));
    await settle(el);
    const sq = (el.query as Group).children[0] as { subQuery: Group };
    const sc = sq.subQuery.children[0] as Condition;
    expect(sc.value).toBe(99);
  });
});

const SUBQUERY_TREE = (): Group => ({
  kind: 'group', id: 'g1', logic: 'and',
  children: [
    { kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 5 },
    {
      kind: 'subquery', id: 'sq', field: 'lineItems', operator: 'in',
      subQuery: {
        kind: 'group', id: 'sg', logic: 'and',
        children: [{ kind: 'condition', id: 'sc', field: 'amount', operator: 'gt', value: 1 }],
      },
    },
  ],
});

function rowOf(el: Element, id: string): HTMLElement {
  const row = deepFind(el, `[data-row-id="${id}"]`) as HTMLElement | null;
  if (!row) throw new Error(`row ${id} not found`);
  return row;
}

function conditionEl(el: Element, id: string): Element {
  return deepFindAll(el, 'mp-query-condition')
    .find((c) => (c as Element & { node?: { id: string } }).node?.id === id)!;
}

describe('mp-query-builder — structural edits', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('+ Add group appends an empty AND group to the clicked group', async () => {
    const el = await mount({ kind: 'group', id: 'g1', logic: 'or', children: [] });
    (deepFind(el, '.qb-add-group') as HTMLButtonElement).click();
    await settle(el);
    const added = (el.query as Group).children[0] as Group;
    expect(added).toMatchObject({ kind: 'group', logic: 'and', children: [] });
  });

  it('+ Add sub-query appends an "in" sub-query on the first relation field', async () => {
    const el = await mount({ kind: 'group', id: 'g1', logic: 'and', children: [] });
    (deepFind(el, '.qb-add-subquery') as HTMLButtonElement).click();
    await settle(el);
    const added = (el.query as Group).children[0]!;
    expect(added).toMatchObject({ kind: 'subquery', field: 'lineItems', operator: 'in', subQuery: { kind: 'group' } });
  });

  it('a sub-query body on an entity without relations offers no + Add sub-query', async () => {
    const el = await mount(SUBQUERY_TREE());
    await settle(el);
    // Only the outer group (orders has a relation) renders the button.
    expect(deepFindAll(el, '.qb-add-subquery')).toHaveLength(1);
  });

  it('a nested (non-root) group can remove itself', async () => {
    const el = await mount({
      kind: 'group', id: 'g1', logic: 'and',
      children: [{ kind: 'group', id: 'g2', logic: 'or', children: [] }],
    });
    const removes = deepFindAll(el, '.qb-remove-group');
    expect(removes).toHaveLength(1);
    (removes[0] as HTMLButtonElement).click();
    await settle(el);
    expect((el.query as Group).children).toEqual([]);
  });

  it('+ Add condition inside a sub-query body uses the sub-query target entity', async () => {
    const el = await mount(SUBQUERY_TREE());
    await settle(el);
    const inner = deepFindAll(el, '.qb-add-condition')[1] as HTMLButtonElement;
    inner.click();
    await settle(el);
    const sg = ((el.query as Group).children[1] as { subQuery: Group }).subQuery;
    expect(sg.children).toHaveLength(2);
    expect((sg.children[1] as Condition).field).toBe('amount');
  });

  it('changing a field inside a sub-query resolves it against the target entity', async () => {
    const el = await mount(SUBQUERY_TREE());
    await settle(el);
    const inner = conditionEl(el, 'sc');
    const fieldSelect = (inner.renderRoot as unknown as ParentNode).querySelector('.qb-field-select') as HTMLSelectElement;
    fieldSelect.value = 'sku';
    fieldSelect.dispatchEvent(new Event('change'));
    await settle(el);
    const sc = ((el.query as Group).children[1] as { subQuery: Group }).subQuery.children[0] as Condition;
    // 'sku' only exists on lineItems — resolving it against orders would have dropped the edit.
    expect(sc.field).toBe('sku');
    expect(sc.operator).toBe('equals');
  });

  it('a field change naming a field the entity does not have is ignored', async () => {
    const el = await mount(SUBQUERY_TREE());
    let fired = 0;
    el.addEventListener('query-change', () => fired++);
    conditionEl(el, 'c1').dispatchEvent(new CustomEvent('condition-field-change', {
      detail: { id: 'c1', field: 'nope' }, bubbles: true, composed: true,
    }));
    await settle(el);
    expect(fired).toBe(0);
    expect(((el.query as Group).children[0] as Condition).field).toBe('total');
  });

  it('each edit inside a sub-query reaches the consumer as exactly one query-change', async () => {
    const el = await mount(SUBQUERY_TREE());
    await settle(el);
    let fired = 0;
    el.addEventListener('query-change', () => fired++);
    (deepFindAll(el, '.qb-logic-btn').filter((b) => b.textContent === 'OR')[1] as HTMLButtonElement).click();
    await settle(el);
    expect(fired).toBe(1);
    expect(((el.query as Group).children[1] as { subQuery: Group }).subQuery.logic).toBe('or');
  });

  it('removing a condition moves focus to its parent group instead of dropping it to <body>', async () => {
    const el = await mount({
      kind: 'group', id: 'g1', logic: 'and',
      children: [{
        kind: 'group', id: 'g2', logic: 'or',
        children: [{ kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 1 }],
      }],
    });
    const remove = (conditionEl(el, 'c1').renderRoot as unknown as ParentNode).querySelector('.qb-remove') as HTMLButtonElement;
    remove.focus();
    remove.click();
    await settle(el);
    await new Promise((r) => setTimeout(r, 0));
    const g2 = rowOf(el, 'g2');
    expect(g2.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('Alt+ArrowUp on a sub-query header moves the sub-query up and keeps focus on its header', async () => {
    const el = await mount(SUBQUERY_TREE());
    await settle(el);
    const header = rowOf(el, 'sq').querySelector('.qb-subquery-header') as HTMLElement;
    header.focus();
    header.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true, composed: true }));
    await settle(el);
    await new Promise((r) => setTimeout(r, 0));
    expect((el.query as Group).children.map((c) => c.id)).toEqual(['sq', 'c1']);
    expect(document.activeElement).toBe(rowOf(el, 'sq').querySelector('.qb-subquery-header'));
  });

  it('Alt+Arrow from a row inside the sub-query body does not move the sub-query itself', async () => {
    const el = await mount(SUBQUERY_TREE());
    await settle(el);
    const innerRow = rowOf(el, 'sc');
    innerRow.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true, composed: true }));
    // Nor does a plain arrow on the header.
    (rowOf(el, 'sq').querySelector('.qb-subquery-header') as HTMLElement)
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, composed: true }));
    await settle(el);
    expect((el.query as Group).children.map((c) => c.id)).toEqual(['c1', 'sq']);
  });

  it('a non-group root renders inside a synthetic group', async () => {
    const el = await mount({ kind: 'condition', id: 'solo', field: 'total', operator: 'gt', value: 3 });
    expect(rowOf(el, 'solo').classList.contains('qb-condition')).toBe(true);
    expect(deepFind(el, 'mp-query-group')).toBeTruthy();
  });

  it('the preview shows the depth error instead of throwing when the tree is too deep', async () => {
    const el = document.createElement('mp-query-builder') as MpQueryBuilderElement;
    el.schema = SCHEMA;
    el.rootEntity = 'orders';
    el.showPreview = true;
    el.maxDepth = 1;
    el.query = {
      kind: 'group', id: 'g1', logic: 'and',
      children: [{ kind: 'group', id: 'g2', logic: 'and', children: [{ kind: 'group', id: 'g3', logic: 'and', children: [] }] }],
    };
    document.body.appendChild(el);
    await settle(el);
    const preview = deepFind(el, '.qb-preview') as HTMLElement;
    expect(preview.textContent).toMatch(/depth/i);
  });

  it('a between condition keeps both bounds when edited one after the other', async () => {
    const el = await mount({
      kind: 'group', id: 'g1', logic: 'and',
      children: [{ kind: 'condition', id: 'c1', field: 'total', operator: 'between', value: [null, null] }],
    });
    const [from, to] = deepFindAll(el, '.qb-editor-tuple input') as HTMLInputElement[];
    from!.value = '5';
    from!.dispatchEvent(new Event('input'));
    await settle(el);
    to!.value = '10';
    to!.dispatchEvent(new Event('input'));
    await settle(el);
    expect(((el.query as Group).children[0] as Condition).value).toEqual([5, 10]);
  });
});

describe('mp-query-builder — pointer drag', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  // Hit-testing goes through the controller's private elementsAt seam; the
  // spec says which element is under the pointer and fakes no geometry.
  function hitTest(el: MpQueryBuilderElement, hits: () => Element[]): void {
    (el as unknown as { _drag: { elementsAt: () => Element[] } })._drag.elementsAt = hits;
  }

  function slot(el: Element, parentId: string, index: number): HTMLElement {
    const s = deepFind(el, `[data-drop-slot][data-parent-id="${parentId}"][data-index="${index}"]`) as HTMLElement | null;
    if (!s) throw new Error(`slot ${parentId}@${index} not rendered`);
    return s;
  }

  async function grab(el: MpQueryBuilderElement, id: string): Promise<void> {
    (rowOf(el, id).querySelector('.qb-drag-handle') as HTMLElement)
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5 }));
    await settle(el);
  }

  const pointer = (type: string): PointerEvent => new PointerEvent(type, { clientX: 50, clientY: 50 });

  const flat = (): Group => ({
    kind: 'group', id: 'g1', logic: 'and',
    children: [
      { kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 1 },
      { kind: 'condition', id: 'c2', field: 'status', operator: 'equals', value: 'x' },
    ],
  });

  it('dragging a row onto a drop slot reorders it and ends the drag', async () => {
    const el = await mount(flat());
    await grab(el, 'c1');
    expect(document.querySelector('.qb-drag-ghost')).toBeTruthy();
    hitTest(el, () => [slot(el, 'g1', 2)]);
    window.dispatchEvent(pointer('pointermove'));
    window.dispatchEvent(pointer('pointerup'));
    await settle(el);
    expect((el.query as Group).children.map((c) => c.id)).toEqual(['c2', 'c1']);
    expect(document.querySelector('.qb-drag-ghost')).toBeNull();
    expect(deepFindAll(el, '[data-drop-slot]')).toHaveLength(0);
  });

  it('releasing over no slot leaves the tree unchanged', async () => {
    const el = await mount(flat());
    let fired = 0;
    el.addEventListener('query-change', () => fired++);
    await grab(el, 'c1');
    hitTest(el, () => []);
    window.dispatchEvent(pointer('pointermove'));
    window.dispatchEvent(pointer('pointerup'));
    await settle(el);
    expect(fired).toBe(0);
  });

  it('pointercancel aborts the drag and detaches the window listeners', async () => {
    const el = await mount(flat());
    await grab(el, 'c1');
    hitTest(el, () => [slot(el, 'g1', 2)]);
    window.dispatchEvent(pointer('pointermove'));
    window.dispatchEvent(new PointerEvent('pointercancel'));
    await settle(el);
    window.dispatchEvent(pointer('pointerup'));
    await settle(el);
    expect((el.query as Group).children.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(document.querySelector('.qb-drag-ghost')).toBeNull();
  });

  it('removing the builder mid-drag cleans up the ghost and ignores the later release', async () => {
    const el = await mount(flat());
    await grab(el, 'c1');
    hitTest(el, () => [slot(el, 'g1', 2)]);
    window.dispatchEvent(pointer('pointermove'));
    el.remove();
    expect(document.querySelector('.qb-drag-ghost')).toBeNull();
    window.dispatchEvent(pointer('pointerup'));
    expect((el.query as Group).children.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('a disabled builder does not start a drag', async () => {
    const el = await mount(flat());
    el.disabled = true;
    await settle(el);
    await grab(el, 'c1');
    expect(document.querySelector('.qb-drag-ghost')).toBeNull();
  });

  it('while dragging, a sub-query body offers drop slots too', async () => {
    const el = await mount(SUBQUERY_TREE());
    await settle(el);
    await grab(el, 'c1');
    await settle(el);
    expect(() => slot(el, 'sg', 0)).not.toThrow();
  });

  it('dropping a condition into a sub-query body resets a field the target entity lacks (FR-13)', async () => {
    const el = await mount(SUBQUERY_TREE());
    await settle(el);
    await grab(el, 'c1');
    await settle(el);
    hitTest(el, () => [slot(el, 'sg', 1)]);
    window.dispatchEvent(pointer('pointermove'));
    window.dispatchEvent(pointer('pointerup'));
    await settle(el);
    const root = el.query as Group;
    expect(root.children.map((c) => c.id)).toEqual(['sq']);
    const moved = (root.children[0] as { subQuery: Group }).subQuery.children[1] as Condition;
    // 'total' is an orders field; lineItems' first field is 'amount'.
    expect(moved).toMatchObject({ id: 'c1', field: 'amount' });
  });
});
