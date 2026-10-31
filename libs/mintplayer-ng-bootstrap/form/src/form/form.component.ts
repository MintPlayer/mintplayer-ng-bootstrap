import { Component, input, output, ChangeDetectionStrategy} from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapForms } from '@mintplayer/ui-core/bootstrap';

@Component({
  selector: 'bs-form',
  templateUrl: './form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsFormComponent {
  constructor() {
    useBootstrap(bootstrapForms);
  }

  readonly action = input<string | undefined>(undefined);
  readonly method = input<'GET' | 'POST' | 'PUT' | 'DELETE' | undefined>(undefined);

  readonly submitted = output<Event>();
  onSubmit(ev: Event) {
    this.submitted.emit(ev);
    return false;
  }
}
