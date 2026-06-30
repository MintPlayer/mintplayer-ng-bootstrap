import { SortableController } from '@mintplayer/web-components/drag-drop';
import { registerTreeSelectSortable } from '@mintplayer/web-components/tree-select';

/**
 * Opt-in registrar that wires the framework-agnostic {@link SortableController}
 * into `<mp-tree-select>`'s chip reordering seam. Importing this module performs
 * the registration as a side effect — a bare
 * `import '@mintplayer/web-components/tree-select-reorder';` is enough to make
 * the `reorderable` attribute live.
 *
 * This is the *only* place the base tree-select bundle pulls in drag-drop code,
 * so consumers that never import it tree-shake the whole sortable implementation
 * away. Idempotent.
 */
export function enableTreeSelectReorder(): void {
  registerTreeSelectSortable((host, options) => {
    const controller = new SortableController(host, {
      items: options.items,
      itemId: options.itemId,
      onDrop: options.onDrop,
      label: options.label,
      announce: options.announce,
      axis: 'both',
    });
    return { attach: (container) => controller.attach(container) };
  });
}

enableTreeSelectReorder();
