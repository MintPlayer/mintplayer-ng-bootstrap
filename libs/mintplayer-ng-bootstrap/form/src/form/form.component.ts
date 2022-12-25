import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'bs-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
})
export class BsFormComponent {
  @Output() submitted = new EventEmitter<Event>();
  onSubmit(ev: Event) {
    this.submitted.emit(ev);
    return false;
  }
}
