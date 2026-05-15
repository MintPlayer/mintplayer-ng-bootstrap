import type { Condition, Expression, Group, Operator, SubQueryCondition } from './expression';
import type { EntitySchema, FieldDef } from './field-def';
import {
  emptyCondition,
  emptyGroup,
  emptySubquery,
  newId,
} from './default-tree';
import { defaultValueFor, operatorsForType, valueShapeFor } from './operators';

/** Walk the tree applying `fn` to each Expression. Returns a new tree (immutable). */
export function mapTree(
  tree: Expression,
  fn: (node: Expression) => Expression | null,
): Expression | null {
  const mapped = fn(tree);
  if (mapped === null) return null;
  if (mapped.kind === 'group') {
    const children = mapped.children
      .map((c) => mapTree(c, fn))
      .filter((c): c is Expression => c !== null);
    return { ...mapped, children };
  }
  if (mapped.kind === 'subquery') {
    const inner = mapTree(mapped.subQuery, fn);
    if (inner !== null && inner.kind === 'group') {
      return { ...mapped, subQuery: inner };
    }
    // sub-query body must be a group; if mapping nullified it, reset to empty group.
    return { ...mapped, subQuery: emptyGroup('and') };
  }
  return mapped;
}

/** Find a node by id, walking the entire tree (incl. sub-query bodies). */
export function findNodeById(tree: Expression, id: string): Expression | null {
  if (tree.id === id) return tree;
  if (tree.kind === 'group') {
    for (const c of tree.children) {
      const found = findNodeById(c, id);
      if (found) return found;
    }
  } else if (tree.kind === 'subquery') {
    return findNodeById(tree.subQuery, id);
  }
  return null;
}

/**
 * Find the parent Group of a node by id, along with the node's index in that
 * group's children array. Returns null when the node is the root or absent.
 * Walks sub-query bodies too — the parent is whichever group directly contains
 * the node, regardless of whether that group lives under a sub-query.
 */
export function findParentGroup(
  tree: Expression,
  id: string,
): { parent: Group; index: number } | null {
  if (tree.kind === 'group') {
    const idx = tree.children.findIndex((c) => c.id === id);
    if (idx >= 0) return { parent: tree, index: idx };
    for (const c of tree.children) {
      const found = findParentGroup(c, id);
      if (found) return found;
    }
  } else if (tree.kind === 'subquery') {
    return findParentGroup(tree.subQuery, id);
  }
  return null;
}

/** Collect all descendant ids of a node (incl. the node itself). */
export function collectDescendantIds(node: Expression): Set<string> {
  const out = new Set<string>();
  const walk = (n: Expression): void => {
    out.add(n.id);
    if (n.kind === 'group') n.children.forEach(walk);
    else if (n.kind === 'subquery') walk(n.subQuery);
  };
  walk(node);
  return out;
}

function resolveEntityForGroup(
  tree: Expression,
  rootEntity: string,
  groupId: string,
): string {
  // Walk and remember the entity context at each group node.
  const found = { entity: rootEntity, done: false };
  const walk = (n: Expression, entity: string): void => {
    if (found.done) return;
    if (n.kind === 'group') {
      if (n.id === groupId) {
        found.entity = entity;
        found.done = true;
        return;
      }
      for (const c of n.children) walk(c, entity);
    } else if (n.kind === 'subquery') {
      // Sub-query body is rooted on the target entity, not the parent's entity.
      // We pass through the sub-query's targetEntity if available; here we
      // approximate by using the sub-query's field name → caller resolves the
      // actual targetEntity via schema. For simplicity we keep `entity` until
      // we reach the inner group, then the inner group itself carries the
      // (caller-provided) target.
      walk(n.subQuery, entity);
    }
  };
  walk(tree, rootEntity);
  return found.entity;
}

/** Insert a child into the group with matching id. Returns a new tree; original unchanged. */
export function addChild(
  tree: Expression,
  groupId: string,
  child: Expression,
): Expression {
  return mapTree(tree, (n) => {
    if (n.kind === 'group' && n.id === groupId) {
      return { ...n, children: [...n.children, child] };
    }
    return n;
  }) ?? tree;
}

export function addEmptyConditionTo(
  tree: Expression,
  groupId: string,
  entity: EntitySchema,
): Expression {
  return addChild(tree, groupId, emptyCondition(entity));
}

export function addEmptyGroupTo(
  tree: Expression,
  groupId: string,
  logic: 'and' | 'or' = 'and',
): Expression {
  return addChild(tree, groupId, emptyGroup(logic));
}

export function addEmptySubqueryTo(
  tree: Expression,
  groupId: string,
  entity: EntitySchema,
): Expression {
  const sub = emptySubquery(entity);
  if (!sub) return tree; // no relation field — cannot add a sub-query
  return addChild(tree, groupId, sub);
}

/** Remove the node with matching id, anywhere in the tree. */
export function removeNode(tree: Expression, nodeId: string): Expression {
  // Cannot remove the root — caller guards that case.
  const removed = mapTree(tree, (n) => (n.id === nodeId ? null : n));
  return removed ?? tree;
}

/** Set the logic on a group with matching id. */
export function setGroupLogic(
  tree: Expression,
  groupId: string,
  logic: 'and' | 'or',
): Expression {
  return mapTree(tree, (n) => {
    if (n.kind === 'group' && n.id === groupId) return { ...n, logic };
    return n;
  }) ?? tree;
}

interface ConditionPatch {
  field?: string;
  operator?: Operator;
  value?: unknown;
}

/** Patch a condition with matching id. Always preserves immutability. */
export function updateCondition(
  tree: Expression,
  conditionId: string,
  patch: ConditionPatch,
): Expression {
  return mapTree(tree, (n) => {
    if ((n.kind === 'condition' || n.kind === 'subquery') && n.id === conditionId) {
      if (n.kind === 'subquery') {
        // Sub-queries only patch field/operator; value is the subQuery body.
        const next = { ...n } as SubQueryCondition;
        if (patch.field !== undefined) next.field = patch.field;
        if (patch.operator !== undefined) {
          if (patch.operator === 'in' || patch.operator === 'not-in') {
            next.operator = patch.operator;
          }
        }
        return next;
      }
      const next: Condition = { ...n };
      if (patch.field !== undefined) next.field = patch.field;
      if (patch.operator !== undefined) next.operator = patch.operator;
      if (patch.value !== undefined) next.value = patch.value;
      return next;
    }
    return n;
  }) ?? tree;
}

/**
 * Smart field-change that resets operator + value if the previous shape
 * isn't valid for the new field's type. Resolves the field within
 * `currentEntity`'s schema.
 */
export function changeConditionField(
  tree: Expression,
  conditionId: string,
  newField: FieldDef,
): Expression {
  return mapTree(tree, (n) => {
    if (n.kind === 'condition' && n.id === conditionId) {
      const allowed = operatorsForType(newField.type);
      const operator: Operator = allowed.includes(n.operator) ? n.operator : (allowed[0] ?? 'equals');
      const value = (allowed.includes(n.operator) && valueShapeFor(n.operator) === valueShapeFor(operator))
        ? n.value
        : defaultValueFor(operator);
      return { ...n, field: newField.name, operator, value };
    }
    return n;
  }) ?? tree;
}

/**
 * Smart operator-change that resets value if the value shape mismatches.
 */
export function changeConditionOperator(
  tree: Expression,
  conditionId: string,
  newOperator: Operator,
): Expression {
  return mapTree(tree, (n) => {
    if (n.kind === 'condition' && n.id === conditionId) {
      const sameShape = valueShapeFor(n.operator) === valueShapeFor(newOperator);
      const value = sameShape ? n.value : defaultValueFor(newOperator);
      return { ...n, operator: newOperator, value };
    }
    return n;
  }) ?? tree;
}

/**
 * Move a node to a new parent group at a target index. If the move crosses
 * into a sub-tree with a different schema (cross-tree DnD), call sites pass
 * `schemaForTarget` so we can reset field/operator/value per descendant
 * condition whose field is no longer in the target schema (FR-13).
 *
 * Cycle prevention: caller is responsible for refusing a drop into the moved
 * node's own descendants (precomputed via `collectDescendantIds`).
 */
export function moveNode(
  tree: Expression,
  sourceId: string,
  targetParentId: string,
  targetIndex: number,
  schemaForTarget?: EntitySchema,
): Expression {
  if (sourceId === targetParentId) return tree;
  const source = findNodeById(tree, sourceId);
  if (!source) return tree;
  const target = findNodeById(tree, targetParentId);
  if (!target || target.kind !== 'group') return tree;

  // Cycle: if target is in source's descendants, refuse.
  const sourceDescendants = collectDescendantIds(source);
  if (sourceDescendants.has(targetParentId)) return tree;

  // Apply schema reset to source if schemaForTarget provided.
  const reshaped = schemaForTarget
    ? resetNodeToSchema(source, schemaForTarget)
    : source;

  // Detach source from its current parent.
  const detached = removeNode(tree, sourceId);

  // Insert reshaped into target.
  return mapTree(detached, (n) => {
    if (n.kind === 'group' && n.id === targetParentId) {
      const next = [...n.children];
      const idx = Math.max(0, Math.min(targetIndex, next.length));
      next.splice(idx, 0, reshaped);
      return { ...n, children: next };
    }
    return n;
  }) ?? detached;
}

/**
 * Walk a sub-tree resetting condition fields/operators/values when the field
 * doesn't exist in the new entity's schema. Group structure preserved.
 */
function resetNodeToSchema(node: Expression, schema: EntitySchema): Expression {
  const firstField = schema.fields.find((f) => f.type !== 'relation');
  if (node.kind === 'condition') {
    const existing = schema.fields.find((f) => f.name === node.field);
    if (existing && existing.type !== 'relation') {
      const allowed = operatorsForType(existing.type);
      const op = allowed.includes(node.operator) ? node.operator : (allowed[0] ?? 'equals');
      const value = (allowed.includes(node.operator) && valueShapeFor(node.operator) === valueShapeFor(op))
        ? node.value
        : defaultValueFor(op);
      return { ...node, operator: op, value };
    }
    // Field missing — reset.
    if (!firstField) return node;
    const op = (operatorsForType(firstField.type)[0]) ?? 'equals';
    return {
      ...node,
      field: firstField.name,
      operator: op,
      value: defaultValueFor(op),
    };
  }
  if (node.kind === 'group') {
    return { ...node, children: node.children.map((c) => resetNodeToSchema(c, schema)) };
  }
  // subquery: keep as-is; its subQuery is rooted on a different entity.
  return node;
}

// Re-export `newId` so callers don't need a second import path.
export { newId, emptyGroup, emptyCondition, emptySubquery };
// Suppress unused warning in the resolveEntityForGroup helper (kept for M8 hit-test).
void resolveEntityForGroup;
