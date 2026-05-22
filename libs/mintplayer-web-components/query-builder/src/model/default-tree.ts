import type { Condition, Expression, Group, SubQueryCondition } from './expression';
import type { EntitySchema } from './field-def';
import { defaultValueFor, operatorsForType } from './operators';
function uuidv4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

export function newId(): string {
  return uuidv4();
}

export function emptyGroup(logic: 'and' | 'or' = 'and'): Group {
  return { kind: 'group', id: newId(), logic, children: [] };
}

export function emptyCondition(entity: EntitySchema): Condition {
  const field = entity.fields.find((f) => f.type !== 'relation') ?? entity.fields[0];
  if (!field) {
    return { kind: 'condition', id: newId(), field: '', operator: 'equals', value: null };
  }
  const operator = operatorsForType(field.type)[0] ?? 'equals';
  return {
    kind: 'condition',
    id: newId(),
    field: field.name,
    operator,
    value: defaultValueFor(operator),
  };
}

export function emptySubquery(entity: EntitySchema): SubQueryCondition | null {
  const relationField = entity.fields.find((f) => f.type === 'relation' && f.targetEntity);
  if (!relationField) return null;
  return {
    kind: 'subquery',
    id: newId(),
    field: relationField.name,
    operator: 'in',
    subQuery: emptyGroup('and'),
  };
}

export function cloneTree<T extends Expression>(node: T): T {
  switch (node.kind) {
    case 'group':
      return {
        ...node,
        children: node.children.map((c) => cloneTree(c)),
      } as T;
    case 'condition':
      return {
        ...node,
        value: cloneValue(node.value),
      } as T;
    case 'subquery':
      return {
        ...node,
        subQuery: cloneTree(node.subQuery),
      } as T;
  }
}

function cloneValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(cloneValue);
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = cloneValue(val);
    }
    return out;
  }
  return v;
}
