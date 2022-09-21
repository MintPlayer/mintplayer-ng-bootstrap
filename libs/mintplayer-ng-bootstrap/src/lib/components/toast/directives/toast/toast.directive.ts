import { Directive, TemplateRef } from '@angular/core';
import { BsToastService } from '../../services/toast/toast.service';

@Directive({
  selector: '[bsToast]'
})
export class BsToastDirective {

  constructor(toastService: BsToastService, template: TemplateRef<any>) {
    // toastService.pushToast(template);
  }

}
