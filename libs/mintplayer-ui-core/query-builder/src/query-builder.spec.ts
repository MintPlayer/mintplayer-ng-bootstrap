import { describe, expect, it, vi } from 'vitest';
import {
  connectQueryBuilder,
  formatScalar,
  inputKey,
  mergeMessages,
  parseScalar,
  type QueryBuilderOptions,
} from './query-builder';
import type { EntitySchema, Expression } from './model';

const SCHEMA: EntitySchema[] = [
  {
    name: 'orders',
    label: 'Orders',
    fields: [
      { name: 'total', label: 'Total', type: 'number' },
      { name: 'orderDate', label: 'Order date', type: 'date', editor: 'custom' },
    ],
  },
];

const TREE: Expression = {
  kind: 'group',
  id: 'g',
  logic: 'and',
  children: [
    { kind: 'condition', id: 'c1', field: 'total', operator: 'gt', value: 5 },
    {
      kind: 'group',
      id: 'g2',
      logic: 'or',
      children: [{ kind: 'condition', id: 'c2', field: 'orderDate', operator: 'eq', value: '2026-01-01' }],
    },
  ],
};

const options = (over: Partial<QueryBuilderOptions> = {}): QueryBuilderOptions => ({
  id: 'qb',
  tree: TREE,
  schema: SCHEMA,
  rootEntity: 'orders',
  disabled: false,
  messages: mergeMessages(undefined),
  maxDepth: 32,
  multiEntityPickerEnabled: false,
  selectedFields: [],
  sortBy: [],
  showPreview: false,
  showSavedQueries: false,
  savedQueries: [],
  saveDraft: '',
  dragging: false,
  drafts: {},
  label: null,
  onValue: () => undefined,
  ...over,
});

const nodeRows = (o: QueryBuilderOptions) =>
  connectQueryBuilder(o).rows.filter((r) => r.kind !== 'drop');

describe('connectQueryBuilder', () => {
  it('flattens the tree into rows in reading order, each with its level', () => {
    expect(nodeRows(options()).map((r) => [r.item['data-row-id'], r.kind, r.item['aria-level']])).toEqual([
      ['g', 'group', 1],
      ['c1', 'condition', 2],
      ['g2', 'group', 2],
      ['c2', 'condition', 3],
    ]);
  });

  it('routes a field marked custom through the editor slot, and its onChange to onValue', () => {
    const onValue = vi.fn();
    const rows = nodeRows(options({ onValue }));
    const total = rows.find((r) => r.item['data-row-id'] === 'c1')!;
    const date = rows.find((r) => r.item['data-row-id'] === 'c2')!;
    expect(total.condition.editor.custom).toBe(false);
    expect(date.condition.editor.custom).toBe(true);
    expect(date.condition.editor.ctx).toMatchObject({ value: '2026-01-01', operator: 'eq', disabled: false });
    date.condition.editor.ctx.onChange('2026-02-02');
    expect(onValue).toHaveBeenCalledWith('c2', '2026-02-02');
  });

  it('shows a value draft over the model value while the user types', () => {
    const inputOf = (o: QueryBuilderOptions) =>
      nodeRows(o).find((r) => r.item['data-row-id'] === 'c1')!.condition.editor.inputs[0].bag;
    expect(inputOf(options())['value']).toBe('5');
    expect(inputOf(options({ drafts: { [inputKey('c1', 'total', 'gt', 0)]: '5.' } }))['value']).toBe('5.');
  });

  it('stops past maxDepth with an alert row instead of recursing', () => {
    const rows = nodeRows(options({ maxDepth: 0 }));
    expect(rows.map((r) => r.kind)).toContain('deep');
    expect(rows.some((r) => r.item['data-row-id'] === 'c2')).toBe(false);
  });

  it('names the root from the label and stamps its instance id', () => {
    const root = connectQueryBuilder(options({ label: 'Order filter' })).root;
    expect(root).toMatchObject({ 'aria-label': 'Order filter', 'data-qb-instance': 'qb' });
  });
});

describe('formatScalar / parseScalar', () => {
  it('round-trips numbers and truncates integers', () => {
    expect(formatScalar(42, 'number')).toBe('42');
    expect(parseScalar('42', 'number')).toBe(42);
    expect(parseScalar('7.9', 'integer')).toBe(7);
  });
});
