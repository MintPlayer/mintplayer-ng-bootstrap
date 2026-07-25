/**
 * Opt-in for `<BsTreeSelect reorderable />` chip reordering.
 *
 * Importing this entry registers the framework-agnostic drag-drop sortable
 * implementation (side effect) and re-exports `enableTreeSelectReorder` for an
 * explicit call. Pull it in once in your app:
 *
 * ```ts
 * import '@mintplayer/vue-bootstrap/tree-select-reorder';
 * ```
 *
 * Apps that never import it tree-shake the whole drag-drop module away, leaving
 * `reorderable` inert.
 */
export { enableTreeSelectReorder } from '@mintplayer/web-components/tree-select-reorder';
