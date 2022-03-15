import { Directive, HostListener } from '@angular/core';
import { BsOffcanvasHostComponent } from '../../components/offcanvas-host/offcanvas-host.component';

@Directive({
  selector: '[bsOffcanvasClose]'
})
export class BsOffcanvasCloseDirective {
  constructor(private offcanvas: BsOffcanvasHostComponent) { }

  @HostListener('click') onClick() {
    this.offcanvas.state = 'closed';
  }
}
