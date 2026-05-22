import { Directive, inject, TemplateRef } from '@angular/core';
import { BsNavbarComponent } from '../navbar/navbar.component';

@Directive({
  selector: '[bsExpandButton]',
})
export class BsExpandButtonDirective {

  constructor() {
    const navbar = inject(BsNavbarComponent);
    const templateRef = inject(TemplateRef);
    navbar.expandButtonTemplate.set(templateRef);
  }
  
  public static ngTemplateContextGuard(
    dir: BsExpandButtonDirective,
    ctx: any
  ): ctx is BsExpandButtonContext {
    return true;
  }

}

export class BsExpandButtonContext {
  public $implicit: boolean = null!;
}