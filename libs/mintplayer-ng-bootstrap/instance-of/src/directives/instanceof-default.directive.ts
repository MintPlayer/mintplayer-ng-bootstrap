import { Directive, ViewContainerRef, Optional, Host, TemplateRef } from "@angular/core";
import { SwitchView } from "./switch-view";
import { BsInstanceOfContext } from "../interfaces/instance-of-context";
import { BsInstanceOfDirective } from "./instanceof.directive";

@Directive({
  selector: '[bsInstanceofDefault]',
  standalone: false,
})
export class BsInstanceOfDefaultDirective {
  public constructor(
    viewContainer: ViewContainerRef,
    templateRef: TemplateRef<BsInstanceOfContext>,
    @Optional() @Host() bsInstanceof: BsInstanceOfDirective
  ) {
    if (!bsInstanceof) {
      this.throwError('bsInstanceofDefault');
    }
    bsInstanceof._addDefault(new SwitchView(viewContainer, templateRef));
  }

  throwError(directiveName: string) {
    throw new Error(
      `An element with the "${directiveName}" attribute (matching the "${directiveName}" directive) must be located inside an element with the "bsInstanceof" attribute (matching "BsInstanceofDirective" directive)`
    );
  };
}