import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { BsLetContext } from '../interfaces/let-context';

@Directive({
  selector: '[bsLet]',
})
export class BsLetDirective<T> {
  private viewContainer = inject(ViewContainerRef);
  private templateRef = inject<TemplateRef<BsLetContext<T>>>(TemplateRef);

  private context: BsLetContext<T | null> = { bsLet: null, $implicit: null };
  private hasView: boolean = false;

  readonly bsLet = input<T | undefined>(undefined);

  constructor() {
    effect(() => {
      const value = this.bsLet();
      if (value !== undefined) {
        this.context.$implicit = this.context.bsLet = value;
        if (!this.hasView) {
          this.hasView = true;
          this.viewContainer.createEmbeddedView(this.templateRef, this.context);
        }
      }
    });
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
