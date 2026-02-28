import { Directive, input, DoCheck, ViewContainerRef, inject, TemplateRef } from "@angular/core";
import { SwitchView } from "./switch-view";
import { BsInstanceOfContext } from "../interfaces/instance-of-context";
import { AbstractType } from "../types/abstract.type";
import { BsInstanceOfDirective } from "./instanceof.directive";

@Directive({
  selector: '[bsInstanceofCase]',
  standalone: true,
})
export class BsInstanceofCaseDirective<T> implements DoCheck {
  readonly bsInstanceofCase = input.required<AbstractType<T>>();

  private _view: SwitchView<T>;
  private bsInstanceof = inject(BsInstanceOfDirective, { optional: true, host: true })!;

  public constructor() {
    const viewContainer = inject(ViewContainerRef);
    const templateRef = inject<TemplateRef<BsInstanceOfContext<T>>>(TemplateRef);
    if (!this.bsInstanceof) {
      this.throwError('bsInstanceofCase');
    }
    this.bsInstanceof._addCase();
    this._view = new SwitchView<T>(viewContainer, templateRef);
  }

  /**
   * Asserts the correct type of the context for the template that `InstanceofCaseDirective` will render.
   *
   * The presence of this method is a signal to the Ivy template type-check compiler that the
   * `InstanceofCaseDirective` structural directive renders its template with a specific context type.
   * Magic happens here!
   */
  public static ngTemplateContextGuard<T>(
    dir: BsInstanceofCaseDirective<T>,
    ctx: any
  ): ctx is BsInstanceOfContext<Exclude<T, false | 0 | '' | null | undefined>> {
    return true;
  }

  public ngDoCheck() {
    this._view.enforceState(
      this.bsInstanceof._matchCase(this.bsInstanceofCase())
    );
  }

  throwError(directiveName: string) {
    throw new Error(
      `An element with the "${directiveName}" attribute (matching the "${directiveName}" directive) must be located inside an element with the "bsInstanceof" attribute (matching "BsInstanceofDirective" directive)`
    );
  };
}
