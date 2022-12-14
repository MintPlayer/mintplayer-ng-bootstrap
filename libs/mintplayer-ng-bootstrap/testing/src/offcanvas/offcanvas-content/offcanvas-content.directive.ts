import { Directive, TemplateRef } from '@angular/core';
import { BsOffcanvasHostComponent } from '@mintplayer/ng-bootstrap/offcanvas';

@Directive({
  selector: '[bsOffcanvasContent]'
})
export class BsOffcanvasContentMockDirective {
  constructor(offcanvasHost: BsOffcanvasHostComponent, template: TemplateRef<any>) {
    offcanvasHost.content = template;
  }
}
