import { Directive } from '@angular/core';
import { enableTreeSelectReorder } from '@mintplayer/web-components/tree-select-reorder';

/**
 * Opt-in enabler for `<bs-tree-select reorderable>` chip drag/keyboard reorder.
 *
 * Importing this directive is what pulls the framework-agnostic drag-drop
 * sortable implementation into your bundle and registers it with the web
 * component. Add it to a standalone component's `imports` next to
 * `BsTreeSelectComponent`:
 *
 * ```ts
 * import { BsTreeSelectComponent } from '@mintplayer/ng-bootstrap/tree-select';
 * import { BsTreeSelectReorderDirective } from '@mintplayer/ng-bootstrap/tree-select/reorder';
 *
 * @Component({ imports: [BsTreeSelectComponent, BsTreeSelectReorderDirective], ... })
 * ```
 *
 * Consumers that never import it tree-shake the entire drag-drop module away,
 * and `[reorderable]` on the component stays inert.
 */
@Directive({
  selector: 'bs-tree-select[reorderable]',
})
export class BsTreeSelectReorderDirective {
  constructor() {
    enableTreeSelectReorder();
  }
}
