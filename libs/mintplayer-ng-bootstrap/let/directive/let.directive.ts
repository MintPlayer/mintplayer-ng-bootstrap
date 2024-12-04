import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { BsLetContext } from '../interfaces/let-context';

@Directive({
  selector: '[bsLet]',
  standalone: true,
})
export class BsLetDirective<T> {

  private context: BsLetContext<T | null> = { bsLet: null, $implicit: null };
  private hasView: boolean = false;

  // eslint-disable-next-line no-unused-vars
  constructor(private viewContainer: ViewContainerRef, private templateRef: TemplateRef<BsLetContext<T>>) { }

  @Input() set bsLet(value: T) {
      this.context.$implicit = this.context.bsLet = value;
      if (!this.hasView) {
          this.hasView = true;
          this.viewContainer.createEmbeddedView(this.templateRef, this.context);
      }
  }

  /** @internal */
  public static bsLetUseIfTypeGuard: void;

  /**
   * Assert the correct type of the expression bound to the `NgLet` input within the template.
   *
   * The presence of this static field is a signal to the Ivy template type check compiler that
   * when the `NgLet` structural directive renders its template, the type of the expression bound
   * to `NgLet` should be narrowed in some way. For `NgLet`, the binding expression itself is used to
   * narrow its type, which allows the strictNullChecks feature of TypeScript to work with `NgLet`.
   */
  static ngTemplateGuard_bsLet: 'binding';

  /**
   * Asserts the correct type of the context for the template that `NgLet` will render.
   *
   * The presence of this method is a signal to the Ivy template type-check compiler that the
   * `NgLet` structural directive renders its template with a specific context type.
   */
  static ngTemplateContextGuard<T>(dir: BsLetDirective<T>, ctx: any): ctx is BsLetContext<T> {
      return true;
  }
}
