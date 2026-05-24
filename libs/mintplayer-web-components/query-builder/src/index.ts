// Model types + helpers
export type {
  Expression,
  Group,
  Condition,
  SubQueryCondition,
  Operator,
} from './model/expression';
export type {
  FieldDef,
  FieldDefOption,
  FieldType,
  EntitySchema,
} from './model/field-def';
export {
  DEFAULT_OPERATOR_CATALOG,
  operatorsForType,
  valueShapeFor,
  defaultValueFor,
} from './model/operators';
export type { OperatorCatalog, ValueShape } from './model/operators';
export { validateOperatorOverrides } from './model/operator-overrides';
export type {
  OperatorOverrides,
  ValidateOperatorOverridesResult,
} from './model/operator-overrides';
export {
  emptyGroup,
  emptyCondition,
  emptySubquery,
  cloneTree,
  newId,
} from './model/default-tree';
export {
  mapTree,
  findNodeById,
  collectDescendantIds,
  addChild,
  addEmptyConditionTo,
  addEmptyGroupTo,
  addEmptySubqueryTo,
  removeNode,
  setGroupLogic,
  updateCondition,
  changeConditionField,
  changeConditionOperator,
  moveNode,
} from './model/tree-ops';
export { MaxDepthExceededError } from './model/errors';
export { DEFAULT_MESSAGES } from './model/messages';
export type { QueryBuilderMessages } from './model/messages';
export type {
  EditorContext,
  EditorHandle,
  EditorFactory,
  EditorRegistry,
} from './model/editor';
export type { SavedQuery } from './model/saved-query';
export type { SortDescriptor } from './model/sort';

// Visitor pipeline
export type {
  TreeVisitor,
  VisitorContext,
  VisitTreeOptions,
} from './visitor/visitor-types';
export { visitTree } from './visitor/visit-tree';

// Preview
export { renderExpression } from './preview/render-expression';
export type { RenderExpressionOptions } from './preview/render-expression';

// WC elements
export { MpQueryBuilderElement } from './mp-query-builder.element';
export { MpQueryGroupElement } from './mp-query-group.element';
export { MpQueryConditionElement } from './mp-query-condition.element';
export { MpQuerySubqueryElement } from './mp-query-subquery.element';

// Context bridges (consumed by the Angular editor directive + custom editor authors)
export {
  editorRegistryContext,
  disabledContext,
  messagesContext,
} from './context';
