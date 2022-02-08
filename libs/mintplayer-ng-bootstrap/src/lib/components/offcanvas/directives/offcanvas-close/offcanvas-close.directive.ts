import { Directive, HostListener, Input } from '@angular/core';
import { BsOffcanvasComponent } from '../../components/offcanvas/offcanvas.component';
import { BsOffcanvasService } from '../../services/offcanvas/offcanvas.service';

@Directive({
  selector: '[bsOffcanvasClose]'
})
export class BsOffcanvasCloseDirective {
  constructor(private offcanvasService: BsOffcanvasService) { }

  @Input() public bsOffcanvasClose!: BsOffcanvasComponent;

  @HostListener('click') onClick() {
    this.offcanvasService.hide(this.bsOffcanvasClose);
  }
}
