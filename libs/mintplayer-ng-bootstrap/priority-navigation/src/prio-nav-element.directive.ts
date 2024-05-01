import { Directive, HostBinding, TemplateRef } from "@angular/core";
// import { BsObserveSizeDirective } from "@mintplayer/ng-bootstrap/observe-size";

@Directive({
  selector: '[bsPrioNavElement]',
  // hostDirectives: [BsObserveSizeDirective],
})
export class BsPrioNavElementDirective {
  constructor(/*private observer: BsObserveSizeDirective,*/ template: TemplateRef<any>) {
    this.template = template;
  }

  @HostBinding('class.d-inline-block') classList = true;
  template: TemplateRef<any>;
}
