import { Directive, inject, TemplateRef } from '@angular/core';
import { BsOffcanvasHostComponent } from '../../components/offcanvas-host/offcanvas-host.component';

@Directive({
  selector: '[bsOffcanvasContent]',
  standalone: false,
})
export class BsOffcanvasContentDirective {
  constructor() {
    const offcanvasHost = inject(BsOffcanvasHostComponent);
    const template = inject(TemplateRef);
    offcanvasHost.content = template;
  }
}
