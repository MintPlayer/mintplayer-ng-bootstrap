import { Directive, HostBinding, TemplateRef } from "@angular/core";

@Directive({
  selector: '[bsPrioNavElement]',
  // hostDirectives: [BsObserveSizeDirective],
})
export class BsPrioNavElementDirective {
  constructor(/*private observer: BsObserveSizeDirective,*/ template: TemplateRef<any>) {
    this.template = template;
  }

  template: TemplateRef<any>;
  
  public static ngTemplateContextGuard(dir: BsPrioNavElementDirective, ctx: any)
    : ctx is BsPrioNavElementContext {
      return true;
    }
}

export class BsPrioNavElementContext {
  isOverflown: boolean = null!;
}