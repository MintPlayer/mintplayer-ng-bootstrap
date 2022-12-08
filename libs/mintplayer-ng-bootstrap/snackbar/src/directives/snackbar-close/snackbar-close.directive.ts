import { Directive, HostListener, Input } from '@angular/core';
import { BsSnackbarService } from '../../service/snackbar.service';
import { BsSnackbarComponent } from '../../component/snackbar.component';

@Directive({
  selector: '[bsSnackbarClose]'
})
export class BsSnackbarCloseDirective {
  constructor(private snackbarService: BsSnackbarService) { }

  @Input() public bsSnackbarClose!: BsSnackbarComponent;

  @HostListener('click') onClick() {
    this.snackbarService.hide(this.bsSnackbarClose);
  }
}
