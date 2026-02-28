import { Component, input, output, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsFormComponent {
  readonly action = input<string | undefined>(undefined);
  readonly method = input<'GET' | 'POST' | 'PUT' | 'DELETE' | undefined>(undefined);

  readonly submitted = output<Event>();
  onSubmit(ev: Event) {
    this.submitted.emit(ev);
    return false;
  }
}
