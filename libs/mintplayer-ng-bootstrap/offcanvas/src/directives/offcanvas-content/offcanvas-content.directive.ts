import { Directive, TemplateRef } from '@angular/core';
import { BsOffcanvasHostComponent } from '../../components/offcanvas-host/offcanvas-host.component';

@Directive({
  selector: '[bsOffcanvasContent]',
  standalone: false,
})
export class BsOffcanvasContentDirective {

  constructor(offcanvasHost: BsOffcanvasHostComponent, template: TemplateRef<any>) {
    offcanvasHost.content = template;
  }

}
