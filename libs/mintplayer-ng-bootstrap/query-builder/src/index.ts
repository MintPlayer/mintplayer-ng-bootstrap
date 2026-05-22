// Lit WCs + value-object model + context tokens — sourced from the
// framework-agnostic sub-entry. Re-exports MpQueryBuilderElement,
// MpQueryGroupElement, MpQueryConditionElement, MpQuerySubqueryElement,
// Expression / Group / Condition / SubQueryCondition / Operator,
// FieldDef / FieldDefOption / FieldType / EntitySchema,
// DEFAULT_OPERATOR_CATALOG / operatorsForType / valueShapeFor /
// defaultValueFor / OperatorCatalog / ValueShape,
// validateOperatorOverrides / OperatorOverrides /
// ValidateOperatorOverridesResult, emptyGroup / emptyCondition /
// emptySubquery / cloneTree / newId, mapTree / findNodeById /
// collectDescendantIds / addChild / addEmptyConditionTo /
// addEmptyGroupTo / addEmptySubqueryTo / removeNode / setGroupLogic /
// updateCondition / changeConditionField / changeConditionOperator /
// moveNode, MaxDepthExceededError, DEFAULT_MESSAGES /
// QueryBuilderMessages, EditorContext / EditorHandle / EditorFactory /
// EditorRegistry, SavedQuery, SortDescriptor, editorRegistryContext /
// disabledContext / messagesContext.
export * from '@mintplayer/web-components/query-builder';

// Visitor stays Angular-side for now (it imports the model types but is
// not consumed by the WCs themselves). The preview/render-expression
// helper moved to the WC lib (consumed by mp-query-builder) and is
// re-exported via `export * from '@mintplayer/web-components/query-builder'`
// above.
export type {
  TreeVisitor,
  VisitorContext,
  VisitTreeOptions,
} from './lib/visitor/visitor-types';
export { visitTree } from './lib/visitor/visit-tree';

// Angular wrappers.
export { BsQueryBuilderComponent } from './lib/components/query-builder.component';
export { BsQueryBuilderEditorDirective } from './lib/components/query-builder-editor.directive';
