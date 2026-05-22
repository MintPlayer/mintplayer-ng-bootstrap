import { type Expression, type EntitySchema, MaxDepthExceededError } from '@mintplayer/web-components/query-builder';
import type { TreeVisitor, VisitorContext, VisitTreeOptions } from './visitor-types';
const DEFAULT_MAX_DEPTH = 32;

/**
 * Generic tree walker. The visitor receives:
 *
 *   condition(node, ctx)            — leaf condition.
 *   subquery(node, ctx, walkInner)  — sub-query; `walkInner()` lazily walks
 *                                     the body under the relation's
 *                                     targetEntity. Lazy so visitors can
 *                                     scope state (alias prefixes, parameter
 *                                     arrays, etc.) around the inner walk.
 *   group(node, childResults, ctx)  — group; children already mapped to T.
 *
 * `ctx.depth` is tracked across the walk; if it ever exceeds
 * `options.maxDepth` (default 32) the walker throws MaxDepthExceededError.
 *
 * Throws when:
 *   - The schema doesn't contain `ctx.currentEntity`.
 *   - A sub-query's `field` is unknown or not a relation type.
 *   - A sub-query's `targetEntity` is missing from the schema.
 *
 * These conditions are programmer errors at the consumer level; the walker
 * fails fast rather than silently producing a partial result.
 */
export function visitTree<T>(
  tree: Expression,
  visitor: TreeVisitor<T>,
  ctx: { schema: EntitySchema[]; rootEntity: string },
  options: VisitTreeOptions = {},
): T {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const initial: VisitorContext = {
    schema: ctx.schema,
    currentEntity: ctx.rootEntity,
    depth: 0,
  };
  return walk(tree, visitor, initial, maxDepth);
}

function walk<T>(
  node: Expression,
  visitor: TreeVisitor<T>,
  ctx: VisitorContext,
  maxDepth: number,
): T {
  if (ctx.depth > maxDepth) throw new MaxDepthExceededError(ctx.depth, maxDepth);
  switch (node.kind) {
    case 'condition':
      return visitor.condition(node, ctx);
    case 'group': {
      const childCtx: VisitorContext = { ...ctx, depth: ctx.depth + 1 };
      const children = node.children.map((c) => walk(c, visitor, childCtx, maxDepth));
      return visitor.group(node, children, ctx);
    }
    case 'subquery': {
      const entity = ctx.schema.find((s) => s.name === ctx.currentEntity);
      if (!entity) throw new Error(`visitTree: schema has no entity "${ctx.currentEntity}".`);
      const fieldDef = entity.fields.find((f) => f.name === node.field);
      if (!fieldDef) throw new Error(`visitTree: entity "${ctx.currentEntity}" has no field "${node.field}".`);
      if (fieldDef.type !== 'relation' || !fieldDef.targetEntity) {
        throw new Error(`visitTree: field "${node.field}" is not a relation.`);
      }
      const targetEntity = fieldDef.targetEntity;
      if (!ctx.schema.some((s) => s.name === targetEntity)) {
        throw new Error(`visitTree: relation target "${targetEntity}" missing from schema.`);
      }
      const innerCtx: VisitorContext = {
        ...ctx,
        currentEntity: targetEntity,
        depth: ctx.depth + 1,
      };
      const walkInner = (): T => walk(node.subQuery, visitor, innerCtx, maxDepth);
      return visitor.subquery(node, ctx, walkInner);
    }
  }
}
