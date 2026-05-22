import type { Condition, Expression, Group, Operator, SubQueryCondition } from '@mintplayer/web-components/query-builder';
import type { EntitySchema, FieldDef } from '@mintplayer/web-components/query-builder';
import { DEFAULT_MESSAGES, type QueryBuilderMessages } from '@mintplayer/web-components/query-builder';
import { MaxDepthExceededError } from '@mintplayer/web-components/query-builder';
import { valueShapeFor } from '@mintplayer/web-components/query-builder';
export interface RenderExpressionOptions {
  messages?: Partial<QueryBuilderMessages>;
  maxDepth?: number;
  /** Top-level entity context. Defaults to `schema[0]?.name`. */
  rootEntity?: string;
}

const DEFAULT_MAX_DEPTH = 32;

/**
 * Render a query tree to a human-readable string.
 *
 * Examples:
 *   "Total > 100"
 *   "(Total > 100 AND Status = "open")"
 *   "Order date is in the last 7 days"
 *   "Tags any of [urgent, blocked]"
 *   "Line items IN (Amount between [10, 500])"
 *
 * Pure function — no side effects. Sub-queries are walked with the
 * target entity's schema for field-label resolution.
 */
export function renderExpression(
  tree: Expression,
  schema: EntitySchema[],
  options: RenderExpressionOptions = {},
): string {
  const messages = mergeMessages(options.messages);
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const rootEntity = options.rootEntity ?? schema[0]?.name ?? '';
  return walk(tree, schema, rootEntity, messages, 0, maxDepth);
}

function mergeMessages(overrides?: Partial<QueryBuilderMessages>): QueryBuilderMessages {
  return {
    ...DEFAULT_MESSAGES,
    ...(overrides ?? {}),
    operators: { ...DEFAULT_MESSAGES.operators, ...(overrides?.operators ?? {}) },
  };
}

function walk(
  node: Expression,
  schema: EntitySchema[],
  entity: string,
  messages: QueryBuilderMessages,
  depth: number,
  maxDepth: number,
): string {
  if (depth > maxDepth) throw new MaxDepthExceededError(depth, maxDepth);
  switch (node.kind) {
    case 'group':
      return renderGroup(node, schema, entity, messages, depth, maxDepth);
    case 'condition':
      return renderCondition(node, schema, entity, messages);
    case 'subquery':
      return renderSubquery(node, schema, entity, messages, depth, maxDepth);
  }
}

function renderGroup(
  group: Group,
  schema: EntitySchema[],
  entity: string,
  messages: QueryBuilderMessages,
  depth: number,
  maxDepth: number,
): string {
  if (group.children.length === 0) {
    return group.logic === 'and' ? 'TRUE' : 'FALSE';
  }
  const joiner = group.logic === 'and' ? ` ${messages.logicAnd} ` : ` ${messages.logicOr} `;
  const parts = group.children.map((c) => walk(c, schema, entity, messages, depth + 1, maxDepth));
  return `(${parts.join(joiner)})`;
}

function renderCondition(
  cond: Condition,
  schema: EntitySchema[],
  entity: string,
  messages: QueryBuilderMessages,
): string {
  const fieldDef = resolveField(schema, entity, cond.field);
  const fieldLabel = fieldDef?.label ?? cond.field;
  const opLabel = messages.operators[cond.operator] ?? cond.operator;
  const valuePart = renderValue(cond.operator, cond.value);
  if (valuePart === '') return `${fieldLabel} ${opLabel}`;
  return `${fieldLabel} ${opLabel} ${valuePart}`;
}

function renderSubquery(
  sub: SubQueryCondition,
  schema: EntitySchema[],
  entity: string,
  messages: QueryBuilderMessages,
  depth: number,
  maxDepth: number,
): string {
  const fieldDef = resolveField(schema, entity, sub.field);
  const fieldLabel = fieldDef?.label ?? sub.field;
  const opLabel = messages.operators[sub.operator] ?? sub.operator;
  const targetEntity = fieldDef?.targetEntity ?? '';
  const inner = walk(sub.subQuery, schema, targetEntity, messages, depth + 1, maxDepth);
  return `${fieldLabel} ${opLabel} ${inner}`;
}

function renderValue(operator: Operator, value: unknown): string {
  const shape = valueShapeFor(operator);
  if (shape === 'null') return '';
  if (shape === 'tuple' && Array.isArray(value)) {
    return `[${value.map(formatScalar).join(', ')}]`;
  }
  if (shape === 'array' && Array.isArray(value)) {
    return `[${value.map(formatScalar).join(', ')}]`;
  }
  if (shape === 'n-input' && typeof value === 'object' && value !== null) {
    const n = (value as { n?: number }).n;
    if (typeof n === 'number') return String(n);
    return JSON.stringify(value);
  }
  return formatScalar(value);
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return '?';
  if (typeof v === 'string') return `"${v}"`;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function resolveField(
  schema: EntitySchema[],
  entityName: string,
  fieldName: string,
): FieldDef | undefined {
  return schema
    .find((s) => s.name === entityName)
    ?.fields.find((f) => f.name === fieldName);
}
