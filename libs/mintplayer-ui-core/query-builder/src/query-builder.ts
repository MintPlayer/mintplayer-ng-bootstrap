import type { CoreBag } from '@mintplayer/ui-core/component';
import {
  DEFAULT_MESSAGES,
  operatorsForType,
  valueShapeFor,
  type Condition,
  type EditorContext,
  type EntitySchema,
  type Expression,
  type FieldDef,
  type Group,
  type Operator,
  type QueryBuilderMessages,
  type SavedQuery,
  type SortDescriptor,
  type SubQueryCondition,
} from './model';
import { renderExpression } from './preview/render-expression';

/** The scope of the query builder's sheet: `[data-mps=query-builder]`. */
export const QUERY_BUILDER_SCOPE = 'query-builder';

export const DEFAULT_MAX_DEPTH = 32;

export type QueryBuilderBag = CoreBag;

const scoped = (bag: QueryBuilderBag): QueryBuilderBag => ({ ...bag, 'data-mps': QUERY_BUILDER_SCOPE });
const BLANK: QueryBuilderBag = scoped({});

/** Messages with the consumer's overrides merged per key (operators too). */
export function mergeMessages(own: Partial<QueryBuilderMessages> | null | undefined): QueryBuilderMessages {
  return {
    ...DEFAULT_MESSAGES,
    ...(own ?? {}),
    operators: { ...DEFAULT_MESSAGES.operators, ...(own?.operators ?? {}) },
  };
}

export const fillMessage = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (all, key: string) => (key in values ? String(values[key]) : all));

/** One `<option>`. React selects through its select's seed, the rest through `selected`. */
export interface QueryBuilderOption {
  readonly key: string;
  readonly label: string;
  readonly bag: QueryBuilderBag;
}

/** One text-like input of a built-in editor (a tuple has two). */
export interface QueryBuilderInput {
  readonly key: string;
  /** A separator renders before this input. */
  readonly sep: boolean;
  readonly bag: QueryBuilderBag;
}

export interface QueryBuilderChip {
  readonly key: string;
  readonly label: string;
  readonly bag: QueryBuilderBag;
  readonly remove: QueryBuilderBag;
}

/**
 * A condition's value editor. Exactly one of `custom`, `isSelect`, `isChips`
 * and `isInputs` is true; the other parts are present but unused.
 */
export interface QueryBuilderEditor {
  readonly custom: boolean;
  readonly isSelect: boolean;
  readonly isChips: boolean;
  readonly isInputs: boolean;
  readonly wrap: QueryBuilderBag;
  /** The `editor` slot's context; on a built-in editor an inert placeholder. */
  readonly ctx: EditorContext;
  readonly select: QueryBuilderBag;
  readonly selectValue: string | string[];
  readonly options: readonly QueryBuilderOption[];
  readonly chipBox: QueryBuilderBag;
  readonly chips: readonly QueryBuilderChip[];
  readonly chipAdd: QueryBuilderBag;
  readonly inputBox: QueryBuilderBag;
  readonly inputs: readonly QueryBuilderInput[];
  readonly sep: QueryBuilderBag;
}

export interface QueryBuilderGroupRow {
  readonly header: QueryBuilderBag;
  readonly logic: QueryBuilderBag;
  readonly and: QueryBuilderBag;
  readonly or: QueryBuilderBag;
  readonly actions: QueryBuilderBag;
  readonly addCondition: QueryBuilderBag;
  readonly addGroup: QueryBuilderBag;
  readonly canAddSubquery: boolean;
  readonly addSubquery: QueryBuilderBag;
  readonly removable: boolean;
  readonly remove: QueryBuilderBag;
}

export interface QueryBuilderConditionRow {
  readonly box: QueryBuilderBag;
  readonly handle: QueryBuilderBag;
  readonly field: QueryBuilderBag;
  readonly fieldValue: string;
  readonly fields: readonly QueryBuilderOption[];
  readonly operator: QueryBuilderBag;
  readonly operatorValue: string;
  readonly operators: readonly QueryBuilderOption[];
  readonly hasEditor: boolean;
  readonly editor: QueryBuilderEditor;
  readonly remove: QueryBuilderBag;
}

export interface QueryBuilderSubqueryRow {
  readonly header: QueryBuilderBag;
  readonly fieldLabel: string;
  readonly operatorLabel: string;
  readonly target: string;
  readonly remove: QueryBuilderBag;
}

export type QueryBuilderRowKind = 'group' | 'condition' | 'subquery' | 'empty' | 'drop' | 'deep';

/**
 * One line of the editor, in reading order. The tree is flattened, so no
 * front needs a recursive template: nesting is the row's `aria-level` and its
 * indent. Every part is present on every row; `kind` says which renders.
 */
export interface QueryBuilderRow {
  readonly key: string;
  readonly kind: QueryBuilderRowKind;
  readonly item: QueryBuilderBag;
  readonly style: Record<string, string>;
  readonly group: QueryBuilderGroupRow;
  readonly condition: QueryBuilderConditionRow;
  readonly subquery: QueryBuilderSubqueryRow;
  /** The empty-group text, the drop placeholder, or the too-deep alert. */
  readonly note: QueryBuilderBag;
  readonly text: string;
}

export interface QueryBuilderSortRow {
  readonly key: string;
  readonly box: QueryBuilderBag;
  readonly field: QueryBuilderBag;
  readonly fieldValue: string;
  readonly fields: readonly QueryBuilderOption[];
  readonly direction: QueryBuilderBag;
  readonly directionValue: string;
  readonly directions: readonly QueryBuilderOption[];
  readonly remove: QueryBuilderBag;
}

export interface QueryBuilderProjection {
  readonly key: string;
  readonly label: string;
  readonly box: QueryBuilderBag;
  readonly input: QueryBuilderBag;
}

export interface QueryBuilderSaved {
  readonly key: string;
  readonly box: QueryBuilderBag;
  readonly load: QueryBuilderBag;
  readonly loadText: string;
  readonly remove: QueryBuilderBag;
}

export interface QueryBuilderView {
  readonly root: QueryBuilderBag;
  readonly text: QueryBuilderMessages;

  readonly toolbar: boolean;
  readonly toolbarBox: QueryBuilderBag;
  readonly toolbarLabel: QueryBuilderBag;
  readonly entity: QueryBuilderBag;
  readonly entityValue: string;
  readonly entities: readonly QueryBuilderOption[];
  readonly projection: boolean;
  readonly projectionBox: QueryBuilderBag;
  readonly projections: readonly QueryBuilderProjection[];
  readonly sortBox: QueryBuilderBag;
  readonly sorts: readonly QueryBuilderSortRow[];
  readonly sortAdd: QueryBuilderBag;

  readonly saved: boolean;
  readonly savedBox: QueryBuilderBag;
  readonly savedList: QueryBuilderBag;
  readonly savedEmpty: QueryBuilderBag;
  readonly savedQueries: readonly QueryBuilderSaved[];
  readonly savedNew: QueryBuilderBag;
  readonly savedName: QueryBuilderBag;
  readonly savedSave: QueryBuilderBag;

  readonly preview: boolean;
  readonly previewBox: QueryBuilderBag;
  readonly previewText: string;

  readonly list: QueryBuilderBag;
  readonly rows: readonly QueryBuilderRow[];
  readonly subqueryField: QueryBuilderBag;
  readonly subqueryOperator: QueryBuilderBag;
  readonly subqueryTarget: QueryBuilderBag;
}

export interface QueryBuilderOptions {
  readonly id: string;
  readonly tree: Expression;
  readonly schema: readonly EntitySchema[];
  readonly rootEntity: string;
  readonly disabled: boolean;
  readonly messages: QueryBuilderMessages;
  readonly maxDepth: number;
  readonly multiEntityPickerEnabled: boolean;
  readonly selectedFields: readonly string[];
  readonly sortBy: readonly SortDescriptor[];
  readonly showPreview: boolean;
  readonly showSavedQueries: boolean;
  readonly savedQueries: readonly SavedQuery[];
  readonly saveDraft: string;
  readonly dragging: boolean;
  /** Raw text of value inputs the user is typing in, by `inputKey`. */
  readonly drafts: Readonly<Record<string, string>>;
  readonly label: string | null;
  /** The `editor` slot's onChange for a condition. */
  readonly onValue: (nodeId: string, value: unknown) => void;
}

/** A value input's draft key: the node, the editor (field + operator) and the input. */
export const inputKey = (nodeId: string, field: string, operator: string, index: number): string =>
  `${nodeId}|${field}|${operator}|${index}`;

const entityOf = (schema: readonly EntitySchema[], name: string): EntitySchema | null =>
  schema.find((s) => s.name === name) ?? null;

/** The entity a sub-query's body is rooted on: its relation's target. */
export function subqueryEntity(schema: readonly EntitySchema[], entity: string, node: SubQueryCondition): string {
  const field = entityOf(schema, entity)?.fields.find((f) => f.name === node.field);
  return field?.targetEntity && entityOf(schema, field.targetEntity) ? field.targetEntity : entity;
}

/** The entity whose fields a node uses: the root entity, or a sub-query's target. */
export function entityForNode(tree: Expression, schema: readonly EntitySchema[], rootEntity: string, nodeId: string): string | null {
  const walk = (n: Expression, entity: string): string | null =>
    n.id === nodeId
      ? entity
      : n.kind === 'group'
        ? n.children.reduce<string | null>((hit, c) => hit ?? walk(c, entity), null)
        : n.kind === 'subquery'
          ? walk(n.subQuery, subqueryEntity(schema, entity, n))
          : null;
  return walk(tree, rootEntity);
}

/** A value as an input shows it. */
export function formatScalar(v: unknown, type: FieldDef['type']): string {
  if (v === null || v === undefined) return '';
  if (type === 'date' && v instanceof Date) return v.toISOString().slice(0, 10);
  if (type === 'datetime' && v instanceof Date) return v.toISOString().slice(0, 16);
  if (typeof v === 'string' && (type === 'date' || type === 'datetime')) {
    return type === 'date' ? v.slice(0, 10) : v.slice(0, 16);
  }
  return String(v);
}

/** An input's text as a value of the field's type. Empty is null. */
export function parseScalar(raw: string, type: FieldDef['type']): unknown {
  if (raw === '') return null;
  switch (type) {
    case 'number': return Number(raw);
    case 'integer': return Number.parseInt(raw, 10);
    default: return raw;
  }
}

type ScalarType = 'string' | 'number' | 'integer' | 'date' | 'datetime';

const inputTypeOf = (t: ScalarType): string =>
  t === 'string' ? 'text' : t === 'date' ? 'date' : t === 'datetime' ? 'datetime-local' : 'number';

const stepOf = (t: ScalarType): string | null => (t === 'integer' ? '1' : t === 'number' ? 'any' : null);

const isScalarType = (t: FieldDef['type']): t is ScalarType =>
  t === 'string' || t === 'number' || t === 'integer' || t === 'date' || t === 'datetime';

/** How a built-in editor reads its input, as the `data-qb-parse` attribute carries it. */
export type ValueParse = ScalarType | 'n' | 'select' | 'multiselect' | 'chip-number' | 'chip-integer' | 'chip-string';

const NO_EDITOR_CONTEXT: EditorContext = {
  field: { name: '', label: '', type: 'string' },
  operator: 'equals',
  value: null,
  disabled: true,
  onChange: () => undefined,
};

const EMPTY_EDITOR: QueryBuilderEditor = {
  custom: false,
  isSelect: false,
  isChips: false,
  isInputs: false,
  wrap: BLANK,
  ctx: NO_EDITOR_CONTEXT,
  select: BLANK,
  selectValue: '',
  options: [],
  chipBox: BLANK,
  chips: [],
  chipAdd: BLANK,
  inputBox: BLANK,
  inputs: [],
  sep: BLANK,
};

const EMPTY_GROUP: QueryBuilderGroupRow = {
  header: BLANK,
  logic: BLANK,
  and: BLANK,
  or: BLANK,
  actions: BLANK,
  addCondition: BLANK,
  addGroup: BLANK,
  canAddSubquery: false,
  addSubquery: BLANK,
  removable: false,
  remove: BLANK,
};

const EMPTY_CONDITION: QueryBuilderConditionRow = {
  box: BLANK,
  handle: BLANK,
  field: BLANK,
  fieldValue: '',
  fields: [],
  operator: BLANK,
  operatorValue: '',
  operators: [],
  hasEditor: false,
  editor: EMPTY_EDITOR,
  remove: BLANK,
};

const EMPTY_SUBQUERY: QueryBuilderSubqueryRow = { header: BLANK, fieldLabel: '', operatorLabel: '', target: '', remove: BLANK };

const option = (key: string, value: string, label: string, selected: boolean): QueryBuilderOption => ({
  key,
  label,
  bag: scoped({ value, selected }),
});

/** The built-in editor for a field and operator, or the slot for a custom one. */
function editorFor(o: QueryBuilderOptions, node: Condition, field: FieldDef): QueryBuilderEditor {
  const shape = valueShapeFor(node.operator);
  const wrap = scoped({ class: 'qb-value' });
  const label = field.label;
  const act = (parse: ValueParse, index: number, bag: QueryBuilderBag): QueryBuilderBag =>
    scoped({ ...bag, 'data-qb-act': 'value', 'data-qb-id': node.id, 'data-qb-parse': parse, 'data-qb-index': index, disabled: o.disabled });
  const draft = (index: number, formatted: string): string => o.drafts[inputKey(node.id, node.field, node.operator, index)] ?? formatted;
  const text = (
    index: number,
    parse: ValueParse,
    type: string,
    value: string,
    ariaLabel: string,
    extra: QueryBuilderBag = {},
    sep = false,
  ): QueryBuilderInput => ({
    key: `${index}`,
    sep,
    bag: act(parse, index, {
      type,
      class: 'form-control form-control-sm qb-editor-input',
      value: draft(index, value),
      'aria-label': ariaLabel,
      ...extra,
    }),
  });
  const inputs = (list: QueryBuilderInput[], tuple: boolean): QueryBuilderEditor => ({
    ...EMPTY_EDITOR,
    isInputs: true,
    wrap,
    inputBox: scoped({ class: tuple ? 'qb-editor-tuple' : 'qb-editor-inputs' }),
    inputs: list,
    sep: scoped({ class: 'qb-editor-tuple-sep', 'aria-hidden': 'true' }),
  });

  if (field.editor === 'custom') {
    return {
      ...EMPTY_EDITOR,
      custom: true,
      wrap,
      ctx: {
        field,
        operator: node.operator,
        value: node.value,
        disabled: o.disabled,
        onChange: (next: unknown) => o.onValue(node.id, next),
      },
    };
  }
  if (shape === 'n-input') {
    const n = typeof node.value === 'object' && node.value !== null ? String((node.value as { n?: number }).n ?? 1) : '1';
    return inputs([text(0, 'n', 'number', n, `${label} — number of days`, { min: '1', step: '1', class: 'form-control form-control-sm qb-editor-input qb-editor-n-input' })], false);
  }
  if (shape === 'tuple') {
    const t: ScalarType = isScalarType(field.type) && field.type !== 'string' ? field.type : 'number';
    const pair = Array.isArray(node.value) ? node.value : [];
    const step = stepOf(t);
    const extra: QueryBuilderBag = step ? { step } : {};
    return inputs(
      [
        text(0, t, inputTypeOf(t), formatScalar(pair[0] ?? null, t), `${label} (from)`, extra),
        text(1, t, inputTypeOf(t), formatScalar(pair[1] ?? null, t), `${label} (to)`, extra, true),
      ],
      true,
    );
  }
  const options = field.options ?? [];
  if (shape === 'array' && options.length > 0) {
    const current = Array.isArray(node.value) ? node.value : [];
    const values = options.filter((opt) => current.includes(opt.value)).map((opt) => String(opt.value));
    return {
      ...EMPTY_EDITOR,
      isSelect: true,
      wrap,
      select: act('multiselect', 0, {
        class: 'form-select form-select-sm qb-editor-multiselect',
        multiple: true,
        'aria-label': label,
        'data-qb-value': JSON.stringify(values),
      }),
      selectValue: values,
      options: options.map((opt, k) => option(`${k}`, String(opt.value), opt.label, current.includes(opt.value))),
    };
  }
  if (shape === 'array') {
    const parse: ValueParse = field.type === 'number' ? 'chip-number' : field.type === 'integer' ? 'chip-integer' : 'chip-string';
    const values = Array.isArray(node.value) ? node.value : [];
    return {
      ...EMPTY_EDITOR,
      isChips: true,
      wrap,
      chipBox: scoped({ class: 'qb-editor-chip-input' }),
      chips: values.map((v, k) => ({
        key: `${k}:${String(v)}`,
        label: String(v),
        bag: scoped({ class: 'qb-editor-chip' }),
        remove: scoped({
          type: 'button',
          class: 'qb-editor-chip-remove',
          'aria-label': `Remove ${String(v)}`,
          'data-qb-act': 'chip-remove',
          'data-qb-id': node.id,
          'data-qb-index': k,
          disabled: o.disabled,
        }),
      })),
      chipAdd: act(parse, 0, {
        type: 'text',
        class: 'form-control form-control-sm qb-editor-chip-add',
        placeholder: '+ add',
        size: 8,
        'aria-label': `${label} — add value`,
        'data-qb-act': 'chip-add',
      }),
    };
  }
  if (field.type === 'enum' && options.length > 0) {
    const chosen = options.find((opt) => opt.value === node.value);
    const value = chosen ? String(chosen.value) : '';
    return {
      ...EMPTY_EDITOR,
      isSelect: true,
      wrap,
      select: act('select', 0, {
        class: 'form-select form-select-sm qb-editor-select',
        'aria-label': label,
        'data-qb-value': JSON.stringify([value]),
      }),
      selectValue: value,
      options: [
        option('empty', '', '—', !chosen),
        ...options.map((opt, k) => option(`${k}`, String(opt.value), opt.label, opt === chosen)),
      ],
    };
  }
  if (isScalarType(field.type)) {
    const step = stepOf(field.type);
    return inputs([text(0, field.type, inputTypeOf(field.type), formatScalar(node.value, field.type), label, step ? { step } : {})], false);
  }
  return EMPTY_EDITOR;
}

/** The query builder's bags (PRD #437 D10). */
export function connectQueryBuilder(o: QueryBuilderOptions): QueryBuilderView {
  const m = o.messages;
  const disabled = o.disabled;
  const operatorLabel = (op: Operator): string => m.operators[op] ?? op;
  const button = (cls: string, act: string, id: string, extra: QueryBuilderBag = {}): QueryBuilderBag =>
    scoped({ type: 'button', class: cls, 'data-qb-act': act, 'data-qb-id': id, disabled, ...extra });

  const row = (
    key: string,
    kind: QueryBuilderRowKind,
    depth: number,
    item: QueryBuilderBag,
    parts: Partial<Pick<QueryBuilderRow, 'group' | 'condition' | 'subquery' | 'note' | 'text'>> = {},
  ): QueryBuilderRow => ({
    key,
    kind,
    item: scoped({ class: `qb-row qb-row-${kind}`, 'aria-level': depth + 1, ...item }),
    style: { '--qb-depth': String(depth) },
    group: EMPTY_GROUP,
    condition: EMPTY_CONDITION,
    subquery: EMPTY_SUBQUERY,
    note: BLANK,
    text: '',
    ...parts,
  });

  const dropRow = (parent: Group, index: number, entity: string, depth: number): QueryBuilderRow =>
    row(`${parent.id}-drop-${index}`, 'drop', depth, { 'aria-hidden': 'true' }, {
      note: scoped({
        class: 'qb-drop-slot',
        'data-drop-slot': '',
        'data-parent-id': parent.id,
        'data-index': index,
        'data-qb-root': `entity:${entity}`,
      }),
    });

  const groupRows = (group: Group, entity: string, depth: number, isRoot: boolean): QueryBuilderRow[] => {
    if (depth > o.maxDepth) {
      return [row(`${group.id}-deep`, 'deep', depth, {}, { note: scoped({ class: 'qb-too-deep', role: 'alert' }), text: m.treeTooDeep })];
    }
    const logic = group.logic === 'and' ? 'AND' : 'OR';
    const hasRelation = (entityOf(o.schema, entity)?.fields ?? []).some((f) => f.type === 'relation' && !!f.targetEntity);
    const logicButton = (value: 'and' | 'or'): QueryBuilderBag =>
      button(`btn ${group.logic === value ? 'btn-primary' : 'btn-outline-primary'} qb-logic-btn`, `logic-${value}`, group.id, {
        'aria-pressed': group.logic === value ? 'true' : 'false',
      });
    const header = row(group.id, 'group', depth, { 'data-row-id': group.id }, {
      group: {
        header: scoped({
          class: 'qb-group-header',
          role: 'group',
          'aria-label': depth > 0 ? fillMessage(m.nestedGroupName, { logic, level: depth + 1 }) : fillMessage(m.groupName, { logic }),
        }),
        logic: scoped({ class: 'qb-logic-toggle btn-group btn-group-sm', role: 'group', 'aria-label': m.groupLogic }),
        and: logicButton('and'),
        or: logicButton('or'),
        actions: scoped({ class: 'qb-group-actions' }),
        addCondition: button('btn btn-sm btn-outline-secondary qb-add-condition', 'add-condition', group.id),
        addGroup: button('btn btn-sm btn-outline-secondary qb-add-group', 'add-group', group.id),
        canAddSubquery: hasRelation,
        addSubquery: button('btn btn-sm btn-outline-secondary qb-add-subquery', 'add-subquery', group.id),
        removable: !isRoot,
        remove: button('btn btn-sm btn-link qb-remove-group', 'remove', group.id, { 'aria-label': m.removeGroup, title: m.removeGroup }),
      },
    });
    const inner = depth + 1;
    if (group.children.length === 0) {
      return [
        header,
        o.dragging
          ? row(`${group.id}-empty`, 'drop', inner, { 'aria-hidden': 'true' }, {
              note: scoped({
                class: 'qb-drop-slot qb-drop-slot-placeholder',
                'data-drop-slot': '',
                'data-parent-id': group.id,
                'data-index': 0,
                'data-qb-root': `entity:${entity}`,
              }),
              text: m.dropHerePlaceholder,
            })
          : row(`${group.id}-empty`, 'empty', inner, {}, { note: scoped({ class: 'qb-empty' }), text: m.emptyGroup }),
      ];
    }
    const slot = (index: number): QueryBuilderRow[] => (o.dragging ? [dropRow(group, index, entity, inner)] : []);
    return [
      header,
      ...slot(0),
      ...group.children.flatMap((child, k) => [...childRows(child, entity, inner), ...slot(k + 1)]),
    ];
  };

  const conditionRows = (node: Condition, entity: string, depth: number): QueryBuilderRow[] => {
    const fieldsOfEntity = entityOf(o.schema, entity)?.fields ?? [];
    const field = fieldsOfEntity.find((f) => f.name === node.field);
    const fields = fieldsOfEntity.filter((f) => f.type !== 'relation');
    const operators = field ? operatorsForType(field.type) : [];
    const editor = field && valueShapeFor(node.operator) !== 'null' ? editorFor(o, node, field) : EMPTY_EDITOR;
    const select = (cls: string, act: string, ariaLabel: string, value: string, extra: QueryBuilderBag = {}): QueryBuilderBag =>
      scoped({
        class: `form-select form-select-sm ${cls}`,
        'data-qb-act': act,
        'data-qb-id': node.id,
        'aria-label': ariaLabel,
        'data-qb-value': JSON.stringify([value]),
        disabled,
        ...extra,
      });
    return [
      row(node.id, 'condition', depth, { 'data-row-id': node.id }, {
        condition: {
          box: scoped({
            class: 'qb-condition',
            tabindex: 0,
            role: 'group',
            // The row is a tab stop (Alt+Up/Down reorder), so it needs a role
            // and a name; the name tracks the current field and operator.
            'aria-label': `${field?.label ?? node.field} ${operatorLabel(node.operator)}`,
          }),
          handle: button('qb-drag-handle', 'drag', node.id, { 'aria-label': m.reorderHint, title: m.reorderHint }),
          field: select('qb-field-select', 'field', m.field, node.field),
          fieldValue: node.field,
          fields: [
            ...fields.map((f) => option(f.name, f.name, f.label, f.name === node.field)),
            ...(field ? [] : [option(`missing:${node.field}`, node.field, `(${node.field})`, true)]),
          ],
          operator: select('qb-operator-select', 'operator', m.operator, node.operator, { disabled: disabled || !field }),
          operatorValue: node.operator,
          operators: [
            ...operators.map((op) => option(op, op, operatorLabel(op), op === node.operator)),
            ...(operators.includes(node.operator) ? [] : [option(`missing:${node.operator}`, node.operator, node.operator, true)]),
          ],
          hasEditor: editor !== EMPTY_EDITOR,
          editor,
          remove: button('btn btn-sm btn-link qb-remove', 'remove', node.id, { 'aria-label': m.removeRow, title: m.removeRow }),
        },
      }),
    ];
  };

  const subqueryRows = (node: SubQueryCondition, entity: string, depth: number): QueryBuilderRow[] => {
    const field = entityOf(o.schema, entity)?.fields.find((f) => f.name === node.field);
    const fieldLabel = field?.label ?? node.field;
    const target = field?.targetEntity ?? '';
    return [
      row(node.id, 'subquery', depth, { 'data-row-id': node.id }, {
        subquery: {
          header: scoped({
            class: 'qb-subquery-header',
            tabindex: 0,
            role: 'group',
            'aria-label': `${fieldLabel} ${operatorLabel(node.operator)}${target ? ` ${target}` : ''}`,
          }),
          fieldLabel,
          operatorLabel: operatorLabel(node.operator),
          target,
          remove: button('btn btn-sm btn-link qb-remove', 'remove', node.id, { 'aria-label': m.removeSubquery, title: m.removeSubquery }),
        },
      }),
      ...groupRows(node.subQuery, subqueryEntity(o.schema, entity, node), depth + 1, true),
    ];
  };

  const childRows = (node: Expression, entity: string, depth: number): QueryBuilderRow[] =>
    node.kind === 'group'
      ? groupRows(node, entity, depth, false)
      : node.kind === 'condition'
        ? conditionRows(node, entity, depth)
        : subqueryRows(node, entity, depth);

  // A non-group root renders inside a synthetic AND group that cannot be removed.
  const tree = o.tree;
  const rootGroup: Group = tree.kind === 'group' ? tree : { kind: 'group', id: `${o.id}-synthetic`, logic: 'and', children: [tree] };

  const currentEntity = entityOf(o.schema, o.rootEntity);
  const projectable = currentEntity?.fields.filter((f) => f.type !== 'relation') ?? [];
  const toolbar = o.multiEntityPickerEnabled && o.schema.length > 1;
  const sortSelect = (cls: string, act: string, index: number, ariaLabel: string, value: string): QueryBuilderBag =>
    scoped({
      class: `form-select form-select-sm ${cls}`,
      'data-qb-act': act,
      'data-qb-index': index,
      'aria-label': ariaLabel,
      'data-qb-value': JSON.stringify([value]),
      disabled,
    });

  let preview = '';
  if (o.showPreview) {
    try {
      preview = renderExpression(tree, [...o.schema], { messages: m, rootEntity: o.rootEntity, maxDepth: o.maxDepth });
    } catch (err) {
      preview = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    root: scoped({ class: 'query-builder', 'data-qb-instance': o.id, 'aria-label': o.label }),
    text: m,

    toolbar,
    toolbarBox: scoped({ class: 'qb-toolbar' }),
    toolbarLabel: scoped({ class: 'qb-toolbar-label' }),
    entity: scoped({
      class: 'form-select form-select-sm qb-entity-picker',
      'data-qb-act': 'entity',
      'aria-label': m.entity,
      'data-qb-value': JSON.stringify([o.rootEntity]),
      disabled,
    }),
    entityValue: o.rootEntity,
    entities: o.schema.map((e) => option(e.name, e.name, e.label, e.name === o.rootEntity)),
    projection: projectable.length > 0,
    projectionBox: scoped({ class: 'qb-toolbar-section qb-field-projection', role: 'group', 'aria-label': m.columns }),
    projections: projectable.map((f) => ({
      key: f.name,
      label: f.label,
      box: scoped({ class: 'qb-field-checkbox form-check-label' }),
      input: scoped({
        type: 'checkbox',
        class: 'form-check-input',
        value: f.name,
        checked: o.selectedFields.includes(f.name),
        'data-qb-act': 'project',
        disabled,
      }),
    })),
    sortBox: scoped({ class: 'qb-toolbar-section qb-sort-by', role: 'group', 'aria-label': m.sortBy }),
    sorts: o.sortBy.map((s, i) => ({
      key: `${i}`,
      box: scoped({ class: 'qb-sort-row' }),
      field: sortSelect('qb-sort-field', 'sort-field', i, fillMessage(m.sortField, { n: i + 1 }), s.field),
      fieldValue: s.field,
      fields: [
        ...projectable.map((f) => option(f.name, f.name, f.label, f.name === s.field)),
        ...(projectable.some((f) => f.name === s.field) ? [] : [option(`missing:${s.field}`, s.field, `(${s.field})`, true)]),
      ],
      direction: sortSelect('qb-sort-direction', 'sort-direction', i, fillMessage(m.sortDirection, { n: i + 1 }), s.direction),
      directionValue: s.direction,
      directions: [option('asc', 'asc', m.ascending, s.direction === 'asc'), option('desc', 'desc', m.descending, s.direction === 'desc')],
      remove: scoped({
        type: 'button',
        class: 'btn btn-sm btn-link qb-sort-remove',
        'data-qb-act': 'sort-remove',
        'data-qb-index': i,
        'aria-label': fillMessage(m.removeSort, { n: i + 1 }),
        title: fillMessage(m.removeSort, { n: i + 1 }),
        disabled,
      }),
    })),
    sortAdd: scoped({ type: 'button', class: 'btn btn-sm btn-outline-secondary qb-sort-add', 'data-qb-act': 'sort-add', disabled }),

    saved: o.showSavedQueries,
    savedBox: scoped({ class: 'qb-saved' }),
    savedList: scoped({ class: 'qb-saved-list' }),
    savedEmpty: scoped({ class: 'qb-saved-empty' }),
    savedQueries: o.savedQueries.map((sq) => ({
      key: sq.name,
      box: scoped({ class: 'qb-saved-row', 'data-name': sq.name }),
      load: scoped({ type: 'button', class: 'btn btn-sm btn-outline-primary qb-saved-load', 'data-qb-act': 'load', 'data-name': sq.name }),
      loadText: `${m.loadQuery}: ${sq.name}`,
      remove: scoped({
        type: 'button',
        class: 'btn btn-sm btn-outline-danger qb-saved-delete',
        'data-qb-act': 'delete',
        'data-name': sq.name,
        'aria-label': fillMessage(m.deleteSavedQuery, { name: sq.name }),
      }),
    })),
    savedNew: scoped({ class: 'qb-saved-new' }),
    savedName: scoped({
      type: 'text',
      class: 'form-control form-control-sm qb-saved-name',
      placeholder: m.saveCurrentAs,
      'aria-label': m.savedQueryName,
      value: o.saveDraft,
      'data-qb-act': 'save-name',
    }),
    savedSave: scoped({
      type: 'button',
      class: 'btn btn-sm btn-primary qb-saved-save',
      'data-qb-act': 'save',
      disabled: o.saveDraft.trim() === '',
    }),

    preview: o.showPreview,
    previewBox: scoped({ class: 'qb-preview' }),
    previewText: preview,

    list: scoped({ class: 'qb-rows' }),
    rows: groupRows(rootGroup, o.rootEntity, 0, true),
    subqueryField: scoped({ class: 'qb-subquery-field' }),
    subqueryOperator: scoped({ class: 'qb-subquery-operator' }),
    subqueryTarget: scoped({ class: 'qb-subquery-target' }),
  };
}
