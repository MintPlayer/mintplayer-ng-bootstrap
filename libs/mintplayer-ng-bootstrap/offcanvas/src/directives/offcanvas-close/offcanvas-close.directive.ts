import { Directive, HostListener, inject } from '@angular/core';
import { BsOffcanvasHostComponent } from '../../components/offcanvas-host/offcanvas-host.component';

@Directive({
  selector: '[bsOffcanvasClose]',
  standalone: false,
})
export class BsOffcanvasCloseDirective {
  offcanvas = inject(BsOffcanvasHostComponent);

  @HostListener('click') onClick() {
    this.offcanvas.isVisible = false;
  }
}
