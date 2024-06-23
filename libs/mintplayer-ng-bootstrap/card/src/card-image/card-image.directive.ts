import { Directive, HostBinding, Input, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Directive({
  selector: '[bsCardImage]',
})
export class BsCardImageDirective {
  constructor(template: TemplateRef<any>) {
    this.template = template;
  }

  template: TemplateRef<any>

  @Input() set bsCardImage(position: 'top' | 'bottom' | undefined | '') {
    this.position$.next(position || undefined);
  }

  public position$ = new BehaviorSubject<'top' | 'bottom' | undefined>(undefined);

  // @HostBinding('class') positionClass: 'card-img' | 'card-img-top' | 'card-img-bottom' | undefined;
}
