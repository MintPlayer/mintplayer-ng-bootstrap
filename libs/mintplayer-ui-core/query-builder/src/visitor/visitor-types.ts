import type { Condition, Group, SubQueryCondition } from '../model';
import type { EntitySchema } from '../model';

export interface VisitorContext {
  schema: EntitySchema[];
  currentEntity: string;
  depth: number;
}

export interface TreeVisitor<T> {
  condition(node: Condition, ctx: VisitorContext): T;
  subquery(node: SubQueryCondition, ctx: VisitorContext, walkInner: () => T): T;
  group(node: Group, children: T[], ctx: VisitorContext): T;
}

export interface VisitTreeOptions {
  maxDepth?: number;
}
