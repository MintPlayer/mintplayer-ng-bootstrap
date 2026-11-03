import { Component, input, output, ChangeDetectionStrategy} from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapForms } from '@mintplayer/ui-core/bootstrap/forms';

/**
 * The `<form>` is an anchor of the forms part (#458): it is stamped, so the
 * consumer's projected `.form-label`, `.form-text`, `.form-check-input`, …
 * match the part's anchored sub guard from this import alone.
 */
@Component({
  selector: 'bs-form',
  templateUrl: './form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsFormComponent {
  readonly action = input<string | undefined>(undefined);
  readonly method = input<'GET' | 'POST' | 'PUT' | 'DELETE' | undefined>(undefined);

  readonly submitted = output<Event>();

  constructor() {
    useBootstrap(bootstrapForms);
  }

  onSubmit(ev: Event) {
    this.submitted.emit(ev);
    return false;
  }
}
