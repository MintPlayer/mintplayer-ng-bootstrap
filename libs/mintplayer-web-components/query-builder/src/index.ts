// Model types + helpers
export type {
  Expression,
  Group,
  Condition,
  SubQueryCondition,
  Operator,
} from '@mintplayer/ui-core/query-builder';
export type {
  FieldDef,
  FieldDefOption,
  FieldType,
  EntitySchema,
} from '@mintplayer/ui-core/query-builder';
export {
  DEFAULT_OPERATOR_CATALOG,
  operatorsForType,
  valueShapeFor,
  defaultValueFor,
} from '@mintplayer/ui-core/query-builder';
export type { OperatorCatalog, ValueShape } from '@mintplayer/ui-core/query-builder';
export { validateOperatorOverrides } from '@mintplayer/ui-core/query-builder';
export type {
  OperatorOverrides,
  ValidateOperatorOverridesResult,
} from '@mintplayer/ui-core/query-builder';
export {
  emptyGroup,
  emptyCondition,
  emptySubquery,
  cloneTree,
  newId,
} from '@mintplayer/ui-core/query-builder';
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
} from '@mintplayer/ui-core/query-builder';
export { MaxDepthExceededError } from '@mintplayer/ui-core/query-builder';
export { DEFAULT_MESSAGES } from '@mintplayer/ui-core/query-builder';
export type { QueryBuilderMessages } from '@mintplayer/ui-core/query-builder';
export type {
  EditorContext,
  EditorHandle,
  EditorFactory,
  EditorRegistry,
} from '@mintplayer/ui-core/query-builder';
export type { SavedQuery } from '@mintplayer/ui-core/query-builder';
export type { SortDescriptor } from '@mintplayer/ui-core/query-builder';

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

// Rescoped light-tier stylesheets. Public for the same reason the datatable's
// and treeview's are: a shadow-DOM host that renders one of these elements
// inside its own root must adopt them (the nesting rule), and the SSR
// light-styles injector reads them to emit no-JS `<style>` tags.
export { queryBuilderLightStyles } from './mp-query-builder.light.styles';
export { queryConditionLightStyles } from './mp-query-condition.light.styles';
export { queryGroupLightStyles } from './mp-query-group.light.styles';
export { querySubqueryLightStyles } from './mp-query-subquery.light.styles';

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
