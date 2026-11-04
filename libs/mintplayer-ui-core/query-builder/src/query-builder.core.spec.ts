import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { queryBuilderCore, type QueryBuilderInputs } from './query-builder.core';
import type { QueryBuilderNode, QueryBuilderView } from './query-builder';
import type { Condition, EntitySchema, Expression, Group } from './model';

const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'qty', label: 'Quantity', type: 'integer' },
      {
        name: 'status',
        label: 'Status',
        type: 'enum',
        options: [
          { value: 'open', label: 'Open' },
          { value: 'closed', label: 'Closed' },
        ],
      },
      { name: 'name', label: 'Name', type: 'string' },
      { name: 'placed', label: 'Placed', type: 'date' },
      { name: 'orderDate', label: 'Order date', type: 'date', editor: 'custom' },
      { name: 'lines', label: 'Lines', type: 'relation', targetEntity: 'lines' },
    ],
  },
  {
    name: 'lines',
    label: 'Lines',
    fields: [
      { name: 'sku', label: 'SKU', type: 'string' },
      { name: 'amount', label: 'Amount', type: 'number' },
    ],
  },
];

const cond = (id: string, field: string, operator: Condition['operator'], value: unknown): Condition =>
  ({ kind: 'condition', id, field, operator, value }) as Condition;

const TREE: Group = {
  kind: 'group',
  id: 'g',
  logic: 'and',
  children: [
    cond('c1', 'total', 'gt', 5),
    cond('c2', 'status', 'equals', 'open'),
    cond('c3', 'status', 'in', ['open']),
    cond('c4', 'qty', 'between', [1, null]),
    cond('c5', 'name', 'in', ['a']),
    cond('c6', 'total', 'in', [1]),
    cond('c7', 'placed', 'last-n-days', { n: 3 }),
    cond('c8', 'orderDate', 'equals', '2026-01-01'),
    {
      kind: 'subquery',
      id: 's1',
      field: 'lines',
      operator: 'in',
      subQuery: { kind: 'group', id: 'g3', logic: 'and', children: [cond('c9', 'sku', 'equals', 'x')] },
    },
    { kind: 'group', id: 'g2', logic: 'or', children: [] },
  ],
};

const inputs = (over: Partial<QueryBuilderInputs> = {}): QueryBuilderInputs => ({
  query: TREE,
  schema: SCHEMA,
  rootEntity: 'orders',
  multiEntityPickerEnabled: true,
  selectedFields: [],
  sortBy: [],
  disabled: false,
  messages: null,
  maxDepth: 32,
  showPreview: false,
  showSavedQueries: true,
  savedQueries: [{ name: 'Big', tree: TREE }],
  ...over,
});

type Opt = { key: string; label: string; bag: Record<string, unknown> };
const options = (list: readonly Opt[]) => list.map((o) => el('option', o.bag as never, o.label));

/** One node, as query-builder-item.view.vue renders it. */
function item(node: QueryBuilderNode, view: QueryBuilderView): HTMLElement {
  const g = node.group;
  const c = node.condition;
  const e = c.editor;
  const body =
    node.kind === 'group'
      ? el(
          'div',
          g.header,
          el('span', g.logic, el('button', g.and, 'AND'), el('button', g.or, 'OR')),
          el(
            'span',
            g.actions,
            el('button', g.addCondition, '+'),
            el('button', g.addGroup, '+'),
            g.canAddSubquery ? el('button', g.addSubquery, '+') : null,
            g.removable ? el('button', g.remove, '×') : null,
          ),
        )
      : node.kind === 'condition'
        ? el(
            'div',
            c.box,
            el('button', c.handle, '⋮'),
            el('select', c.field, ...options(c.fields)),
            el('select', c.operator, ...options(c.operators)),
            c.hasEditor
              ? el(
                  'span',
                  e.wrap,
                  e.custom
                    ? el('span', { class: 'custom-editor' })
                    : e.isSelect
                      ? el('select', e.select, ...options(e.options))
                      : e.isChips
                        ? el(
                            'span',
                            e.chipBox,
                            ...e.chips.map((chip) => el('span', chip.bag, chip.label, el('button', chip.remove, '×'))),
                            el('input', e.chipAdd),
                          )
                        : el('span', e.inputBox, ...e.inputs.flatMap((inp) => [inp.sep ? el('span', e.sep, '…') : null, el('input', inp.bag)])),
                )
              : null,
            el('button', c.remove, '×'),
          )
        : node.kind === 'subquery'
          ? el('div', node.subquery.header, el('span', view.subqueryField, node.subquery.fieldLabel), el('button', node.subquery.remove, '×'))
          : el('div', node.note, node.text);
  return el('li', node.item, body, node.children.length ? el('ul', node.list, ...node.children.map((child) => item(child, view))) : null);
}

/** query-builder.view.vue; its root bag lands on the host, as in Angular and Lit. */
function markup({ view }: { view: QueryBuilderView }, host: HTMLElement): (HTMLElement | null)[] {
  applyBag(host, view.root);
  return [
    view.toolbar
      ? el(
          'div',
          view.toolbarBox,
          el('select', view.entity, ...options(view.entities)),
          el('span', view.projectionBox, ...view.projections.map((p) => el('label', p.box, el('input', p.input), p.label))),
          el(
            'span',
            view.sortBox,
            ...view.sorts.map((s) =>
              el('span', s.box, el('select', s.field, ...options(s.fields)), el('select', s.direction, ...options(s.directions)), el('button', s.remove, '×')),
            ),
            el('button', view.sortAdd, '+'),
          ),
        )
      : null,
    view.saved
      ? el(
          'div',
          view.savedBox,
          el('div', view.savedList, ...view.savedQueries.map((q) => el('span', q.box, el('button', q.load, q.loadText), el('button', q.remove, 'x')))),
          el('span', view.savedNew, el('input', view.savedName), el('button', view.savedSave, 'save')),
        )
      : null,
    view.preview ? el('pre', view.previewBox, view.previewText) : null,
    el('ul', view.list, item(view.tree, view)),
  ].filter(Boolean);
}

let frames: FrameRequestCallback[] = [];
const flushFrames = () => {
  for (let i = 0; i < 10 && frames.length; i++) {
    const batch = frames;
    frames = [];
    batch.map((cb) => cb(0));
  }
};

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

function mount(over: Partial<QueryBuilderInputs> = {}) {
  const h = hostCore(queryBuilderCore, inputs(over), { models: ['query', 'rootEntity', 'selectedFields', 'sortBy'], id: 'qb', markup: markup as never });
  h.attach();
  return h;
}

const q = (h: { host: HTMLElement }, selector: string) => h.host.querySelector<HTMLElement>(selector)!;
const act = (h: { host: HTMLElement }, name: string, id?: string, extra = '') =>
  q(h, `[data-qb-act="${name}"]${id ? `[data-qb-id="${id}"]` : ''}${extra}`);
const click = (target: HTMLElement) => target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const change = (target: HTMLElement) => target.dispatchEvent(new Event('change', { bubbles: true }));
const input = (target: HTMLInputElement, value: string) => {
  target.value = value;
  target.dispatchEvent(new Event('input', { bubbles: true }));
};
const key = (target: HTMLElement, k: string, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
};
const tree = (h: { state(): { query: Expression | null } }) => h.state().query as Group;
const node = (h: { state(): { query: Expression | null } }, id: string): Expression | undefined => {
  const walk = (n: Expression): Expression | undefined =>
    n.id === id ? n : n.kind === 'group' ? n.children.map(walk).find(Boolean) : n.kind === 'subquery' ? walk(n.subQuery) : undefined;
  return walk(tree(h));
};
const valueOf = (h: Parameters<typeof node>[0], id: string) => (node(h, id) as Condition).value;

describe('queryBuilderCore', () => {
  it('starts from an empty group, and adds conditions, groups and sub-queries to it', () => {
    const h = mount({ query: null });
    expect(q(h, '.qb-empty')).toBeTruthy();
    click(act(h, 'add-condition', 'qb-root'));
    expect(tree(h).children).toHaveLength(1);
    h.render();
    click(act(h, 'add-group', 'qb-root'));
    click(act(h, 'add-subquery', 'qb-root'));
    expect(tree(h).children.map((c) => c.kind)).toEqual(['condition', 'group', 'subquery']);
    expect(h.changes('query')).toHaveLength(3);
    h.dispose();
  });

  it('wraps a non-group root in a synthetic group its commands find', () => {
    const h = mount({ query: cond('only', 'total', 'gt', 1) });
    click(act(h, 'add-condition', 'qb-synthetic'));
    expect(tree(h).id).toBe('qb-synthetic');
    expect(tree(h).children).toHaveLength(2);
    h.dispose();
  });

  it('switches the logic, removes rows and refocuses their parent', () => {
    const h = mount();
    click(act(h, 'logic-and', 'g'));
    expect(h.changes('query')).toHaveLength(0);
    click(act(h, 'logic-or', 'g'));
    expect(tree(h).logic).toBe('or');
    h.render();
    click(act(h, 'remove', 'c1'));
    expect(node(h, 'c1')).toBeUndefined();
    h.render();
    flushFrames();
    expect(document.activeElement?.classList.contains('qb-add-condition')).toBe(true);
    click(act(h, 'remove', 'g2'));
    expect(node(h, 'g2')).toBeUndefined();
    h.dispose();
  });

  it('never removes the root', () => {
    const h = mount({ query: { kind: 'group', id: 'r', logic: 'and', children: [] } });
    h.host.append(el('button', { 'data-qb-act': 'remove', 'data-qb-id': 'r' }));
    click(q(h, '[data-qb-act="remove"][data-qb-id="r"]'));
    expect(h.changes('query')).toHaveLength(0);
    h.dispose();
  });

  it('changes a field and an operator', () => {
    const h = mount();
    const field = act(h, 'field', 'c1') as HTMLSelectElement;
    field.value = 'qty';
    change(field);
    expect((node(h, 'c1') as Condition).field).toBe('qty');
    field.value = 'nope';
    change(field);
    expect(h.changes('query')).toHaveLength(1);
    h.render();
    const operator = act(h, 'operator', 'c1') as HTMLSelectElement;
    operator.value = 'lt';
    change(operator);
    expect((node(h, 'c1') as Condition).operator).toBe('lt');
    h.dispose();
  });

  it('reads scalar, tuple, n, select and multiselect values', () => {
    const h = mount();
    input(act(h, 'value', 'c1') as HTMLInputElement, '42');
    expect(valueOf(h, 'c1')).toBe(42);
    expect(Object.values(h.state().drafts)).toEqual(['42']);

    input(act(h, 'value', 'c4', '[data-qb-index="1"]') as HTMLInputElement, '9');
    expect(valueOf(h, 'c4')).toEqual([1, 9]);

    input(act(h, 'value', 'c7') as HTMLInputElement, 'x');
    expect(valueOf(h, 'c7')).toEqual({ n: 1 });

    const select = act(h, 'value', 'c2') as HTMLSelectElement;
    select.value = 'closed';
    change(select);
    expect(valueOf(h, 'c2')).toBe('closed');
    select.value = '';
    change(select);
    expect(valueOf(h, 'c2')).toBeNull();

    const multi = act(h, 'value', 'c3') as HTMLSelectElement;
    [...multi.options].map((o) => (o.selected = true));
    change(multi);
    expect(valueOf(h, 'c3')).toEqual(['open', 'closed']);

    // A change on an input is the input event's job; a node without a field reads nothing.
    change(act(h, 'value', 'c1'));
    h.host.append(el('input', { 'data-qb-act': 'value', 'data-qb-id': 'ghost', 'data-qb-parse': 'number' }));
    input(q(h, '[data-qb-id="ghost"]') as HTMLInputElement, '1');
    h.dispose();
  });

  it('starts a tuple from nulls when its value is not a pair', () => {
    const h = mount({ query: { kind: 'group', id: 'g', logic: 'and', children: [cond('t', 'total', 'between', null)] } });
    input(act(h, 'value', 't') as HTMLInputElement, '3');
    expect(valueOf(h, 't')).toEqual([3, null]);
    h.dispose();
  });

  it('adds and removes chips', () => {
    const h = mount();
    const chip = act(h, 'chip-add', 'c6') as HTMLInputElement;
    chip.value = '  ';
    key(chip, 'Enter');
    chip.value = '2.5';
    expect(key(chip, 'Enter').defaultPrevented).toBe(true);
    expect(valueOf(h, 'c6')).toEqual([1, 2.5]);
    const strings = act(h, 'chip-add', 'c5') as HTMLInputElement;
    strings.value = 'b';
    key(strings, 'Enter');
    expect(valueOf(h, 'c5')).toEqual(['a', 'b']);
    h.render();
    click(act(h, 'chip-remove', 'c5', '[data-qb-index="0"]'));
    expect(valueOf(h, 'c5')).toEqual(['b']);
    h.render();
    flushFrames();
    expect(document.activeElement).toBe(act(h, 'chip-add', 'c5'));
    // A chip remove on a scalar condition does nothing.
    h.host.append(el('button', { 'data-qb-act': 'chip-remove', 'data-qb-id': 'c1' }));
    click(q(h, '[data-qb-act="chip-remove"][data-qb-id="c1"]'));
    h.dispose();
  });

  it('parses integer chips', () => {
    const h = mount({ query: { kind: 'group', id: 'g', logic: 'and', children: [cond('i', 'qty', 'in', null)] } });
    const chip = act(h, 'chip-add', 'i') as HTMLInputElement;
    chip.value = '7';
    key(chip, 'Enter');
    expect(valueOf(h, 'i')).toEqual([7]);
    h.dispose();
  });

  it('routes the custom editor through the value command', () => {
    const h = mount();
    const find = (n: QueryBuilderNode): QueryBuilderNode | undefined =>
      n.key === 'c8' ? n : n.children.map(find).find(Boolean);
    find(h.props().view.tree)!.condition.editor.ctx.onChange('2026-02-02');
    expect(valueOf(h, 'c8')).toBe('2026-02-02');
    h.dispose();
    // Detached: the view's onValue reaches nothing.
    find(h.props().view.tree)!.condition.editor.ctx.onChange('x');
  });

  it('moves rows with Alt+Arrow keys from a row stop or its handle', () => {
    const h = mount();
    const box = q(h, '[data-row-id="c2"] .qb-condition');
    expect(key(box, 'ArrowUp', { altKey: true }).defaultPrevented).toBe(true);
    expect(tree(h).children[0].id).toBe('c2');
    h.render();
    key(q(h, '[data-row-id="c2"] .qb-drag-handle'), 'ArrowUp', { altKey: true });
    expect(tree(h).children[0].id).toBe('c2');
    key(q(h, '[data-row-id="s1"] .qb-subquery-header'), 'ArrowDown', { altKey: true });
    expect(tree(h).children.at(-1)!.id).toBe('s1');
    h.render();
    flushFrames();
    expect(document.activeElement).toBe(q(h, '[data-row-id="s1"] .qb-subquery-header'));
    key(q(h, '[data-row-id="s1"] .qb-subquery-header'), 'ArrowDown', { altKey: true });
    expect(tree(h).children.at(-1)!.id).toBe('s1');
    // Not on a field, not without Alt, not another key.
    const count = h.changes('query').length;
    key(act(h, 'field', 'c1'), 'ArrowDown', { altKey: true });
    key(box, 'ArrowDown');
    key(box, 'ArrowLeft', { altKey: true });
    const stray = el('div', { class: 'qb-condition' });
    h.host.append(stray);
    key(stray, 'ArrowDown', { altKey: true });
    const orphan = el('div', { 'data-row-id': 'nope' }, el('div', { class: 'qb-condition' }));
    h.host.append(orphan);
    key(q(h, '[data-row-id="nope"] .qb-condition'), 'ArrowDown', { altKey: true });
    expect(h.changes('query')).toHaveLength(count);
    h.dispose();
  });

  it('switches the entity, projects columns and edits the sort', () => {
    const h = mount({ sortBy: [{ field: 'total', direction: 'asc' }] });
    const entity = act(h, 'entity') as HTMLSelectElement;
    change(entity);
    expect(h.changes('rootEntity')).toHaveLength(0);
    entity.value = 'lines';
    change(entity);
    expect(h.changes('rootEntity')).toEqual(['lines']);
    entity.value = 'orders';
    change(entity);

    h.render();
    const project = q(h, '[data-qb-act="project"][value="qty"]') as HTMLInputElement;
    project.checked = true;
    change(project);
    expect(h.state().selectedFields).toEqual(['qty']);
    project.checked = false;
    change(project);
    expect(h.changes('selectedFields')).toEqual([['qty'], []]);

    const field = act(h, 'sort-field') as HTMLSelectElement;
    field.value = 'qty';
    change(field);
    const direction = act(h, 'sort-direction') as HTMLSelectElement;
    direction.value = 'desc';
    change(direction);
    expect(h.state().sortBy).toEqual([{ field: 'qty', direction: 'desc' }]);
    click(act(h, 'sort-add'));
    expect(h.state().sortBy[1]).toEqual({ field: 'total', direction: 'asc' });
    h.render();
    click(act(h, 'sort-remove', undefined, '[data-qb-index="0"]'));
    expect(h.state().sortBy).toEqual([{ field: 'total', direction: 'asc' }]);
    h.dispose();
  });

  it('adds nothing to the sort without projectable fields', () => {
    const h = mount({ rootEntity: 'nowhere' });
    h.host.append(el('button', { 'data-qb-act': 'sort-add' }));
    click(q(h, '[data-qb-act="sort-add"]'));
    expect(h.changes('sortBy')).toHaveLength(0);
    h.dispose();
  });

  it('saves, loads and deletes saved queries', () => {
    const h = mount();
    click(act(h, 'save'));
    expect(h.events('saveQuery')).toHaveLength(0);
    input(act(h, 'save-name') as HTMLInputElement, ' Mine ');
    expect(h.state().saveDraft).toBe(' Mine ');
    click(act(h, 'save'));
    expect(h.events('saveQuery')).toEqual([{ name: 'Mine', tree: TREE }]);
    expect(h.state().saveDraft).toBe('');
    click(act(h, 'load'));
    click(act(h, 'delete'));
    expect(h.events('loadQuery')).toEqual([{ name: 'Big' }]);
    expect(h.events('deleteQuery')).toEqual([{ name: 'Big' }]);
    h.dispose();
  });

  it('only loads and deletes while disabled', () => {
    const h = mount({ disabled: true });
    click(act(h, 'add-condition', 'g'));
    change(act(h, 'entity'));
    input(act(h, 'value', 'c1') as HTMLInputElement, '1');
    key(q(h, '[data-row-id="c2"] .qb-condition'), 'ArrowUp', { altKey: true });
    q(h, '[data-qb-act="drag"]').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(h.state().dragging).toBe(false);
    click(act(h, 'load'));
    expect(h.changes('query')).toHaveLength(0);
    expect(h.events('loadQuery')).toHaveLength(1);
    // Clicks outside any command, or on a command outside the host, do nothing.
    click(h.host);
    h.dispose();
  });

  it('drags a row onto a drop slot, across a sub-query boundary too', () => {
    const h = mount();
    let under: Element[] = [];
    Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: () => under });
    const drag = (rowId: string) =>
      q(h, `[data-row-id="${rowId}"] [data-qb-act="drag"]`).dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 1, clientY: 1 }));
    const pointer = (type: string) => window.dispatchEvent(new MouseEvent(type, { clientX: 5, clientY: 5 }));

    drag('c1');
    expect(h.state().dragging).toBe(true);
    h.render();
    under = [q(h, '[data-drop-slot][data-parent-id="g"][data-index="3"]')];
    pointer('pointermove');
    pointer('pointerup');
    expect(h.state().dragging).toBe(false);
    expect(tree(h).children.findIndex((c) => c.id === 'c1')).toBe(2);

    h.render();
    drag('c1');
    h.render();
    under = [q(h, '[data-drop-slot][data-parent-id="g3"]')];
    pointer('pointermove');
    pointer('pointerup');
    expect((node(h, 'g3') as Group).children.map((c) => c.id)).toContain('c1');

    h.render();
    drag('c2');
    under = [];
    pointer('pointermove');
    pointer('pointerup');
    drag('c2');
    pointer('pointercancel');
    expect(h.state().dragging).toBe(false);
    const moves = h.changes('query').length;
    pointer('pointerup');
    expect(h.changes('query')).toHaveLength(moves);

    // A handle whose node is gone starts nothing.
    h.host.append(el('div', { 'data-row-id': 'x' }, el('button', { 'data-qb-act': 'drag', 'data-qb-id': 'x' })));
    q(h, '[data-qb-id="x"]').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(h.state().dragging).toBe(false);
    h.dispose();
    delete (document as unknown as Record<string, unknown>)['elementsFromPoint'];
  });

  it('keeps live form state on what the core rendered', async () => {
    const h = mount({ selectedFields: ['total'] });
    const value = act(h, 'value', 'c1') as HTMLInputElement;
    value.value = 'typed';
    const project = q(h, '[data-qb-act="project"][value="qty"]') as HTMLInputElement;
    project.checked = true;
    const select = act(h, 'value', 'c2') as HTMLSelectElement;
    select.value = 'closed';
    value.setAttribute('value', '6');
    await Promise.resolve();
    flushFrames();
    expect(value.value).toBe('6');
    expect(project.checked).toBe(false);
    expect(select.value).toBe('open');
    h.dispose();
  });

  it('follows its inputs once attached', () => {
    const h = mount();
    const next: Group = { kind: 'group', id: 'n', logic: 'or', children: [] };
    h.setInputs({ query: next, rootEntity: 'lines', selectedFields: ['sku'], sortBy: [{ field: 'sku', direction: 'desc' }] });
    expect(h.state()).toMatchObject({ query: next, rootEntity: 'lines', selectedFields: ['sku'], sortBy: [{ field: 'sku', direction: 'desc' }], drafts: {} });
    h.setInputs({ disabled: true });
    h.setInputs({ query: null, rootEntity: undefined as never, selectedFields: undefined as never, sortBy: undefined as never });
    expect(h.state()).toMatchObject({ query: null, rootEntity: '', selectedFields: [], sortBy: [] });
    h.dispose();
  });

  it('renders the preview and defaults its inputs', () => {
    const h = hostCore(queryBuilderCore, { showPreview: true } as QueryBuilderInputs, { models: ['query', 'rootEntity', 'selectedFields', 'sortBy'], id: 'qb', markup: markup as never });
    h.render();
    expect(q(h, '.qb-preview')).toBeTruthy();
    expect(h.state()).toMatchObject({ query: null, rootEntity: '', selectedFields: [], sortBy: [] });
    h.dispose();
  });
});
