import { Directive, Input, DoCheck, ViewContainerRef, Optional, Host, TemplateRef } from "@angular/core";
import { SwitchView } from "./switch-view";
import { BsHasPropertyContext } from "../interfaces/has-property-context";
import { AbstractType } from "../types/abstract.type";
import { BsHasPropertyDirective } from "./has-property.directive";

@Directive({
  selector: '[bsInstanceofCase]',
})
export class BsInstanceofCaseDirective<T> implements DoCheck {
  @Input() public bsInstanceofCase!: AbstractType<T>;

  private _view: SwitchView<T>;

  public constructor(
    viewContainer: ViewContainerRef,
    templateRef: TemplateRef<BsHasPropertyContext<T>>,
    @Optional() @Host() private bsHasProperty: BsHasPropertyDirective
  ) {
    if (!bsHasProperty) {
      this.throwError('bsInstanceofCase');
    }
    bsHasProperty._addCase();
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
  ): ctx is BsHasPropertyContext<Exclude<T, false | 0 | '' | null | undefined>> {
    return true;
  }

  public ngDoCheck() {
    this._view.enforceState(
      this.bsHasProperty._matchCase(this.bsInstanceofCase)
    );
  }

  throwError(directiveName: string) {
    throw new Error(
      `An element with the "${directiveName}" attribute (matching the "${directiveName}" directive) must be located inside an element with the "bsInstanceof" attribute (matching "BsInstanceofDirective" directive)`
    );
  };
}
