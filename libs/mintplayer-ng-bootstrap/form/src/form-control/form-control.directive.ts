import { Directive, inject } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapForms } from '@mintplayer/ui-core/bootstrap';
import { BsFormComponent } from '../form/form.component';

@Directive({
  selector: 'bs-form input:not(.no-form-control), bs-form textarea:not(.no-form-control)',
  host: {
    '[attr.data-mps]': '"form"',
    '[class.form-control]': 'formControlClass',
  },
})
export class BsFormControlDirective {
  constructor() {
    // #452: the forms partial ships with this component, scoped to the elements it stamps (data-mps="form").
    useBootstrap(bootstrapForms);
  }

  private form = inject(BsFormComponent, { optional: true });
  formControlClass = !!this.form;
}
