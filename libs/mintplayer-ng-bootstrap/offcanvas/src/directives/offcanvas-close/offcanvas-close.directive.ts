import { Directive, inject } from '@angular/core';
import { BsOffcanvasHostComponent } from '../../components/offcanvas-host/offcanvas-host.component';

@Directive({
  selector: '[bsOffcanvasClose]',
  standalone: false,
  host: {
    '[attr.aria-label]': '"Close"',
    '(click)': 'onClick()',
  },
})
export class BsOffcanvasCloseDirective {
  private offcanvas = inject(BsOffcanvasHostComponent);

  onClick() {
    this.offcanvas.isVisible.set(false);
  }
}
