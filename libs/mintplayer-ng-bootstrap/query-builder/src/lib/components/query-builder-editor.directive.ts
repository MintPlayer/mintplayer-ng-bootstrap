import { Directive, TemplateRef, input } from '@angular/core';
/**
 * `*bsQueryBuilderEditor="<fieldName>"` projects an Angular template as the
 * value editor for the named field of the parent `bs-query-builder`.
 *
 * The template's context exposes the `EditorContext` (`let ctx`):
 *
 *   <bs-datepicker *bsQueryBuilderEditor="'orderDate'; let ctx"
 *                  [value]="ctx.value"
 *                  (valueChange)="ctx.onChange($event)">
 *   </bs-datepicker>
 *
 * The wrapper collects these via @ContentChildren and assembles them into
 * an `EditorRegistry` it forwards to the WC. Each factory invocation creates
 * a fresh embedded view, exposes `view.rootNodes[0]` as the EditorHandle.element,
 * and returns `dispose: () => view.destroy()` so M4's disposal contract holds.
 */
@Directive({
  selector: '[bsQueryBuilderEditor]',
  standalone: true,
})
export class BsQueryBuilderEditorDirective {
  fieldName = input.required<string>({ alias: 'bsQueryBuilderEditor' });

  constructor(public readonly templateRef: TemplateRef<unknown>) {}
}
