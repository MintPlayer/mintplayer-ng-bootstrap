import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'bs-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
  standalone: false,
})
export class BsFormComponent {
  @Input() action?: string;
  @Input() method?: 'GET' | 'POST' | 'PUT' | 'DELETE';

  @Output() submitted = new EventEmitter<Event>();
  onSubmit(ev: Event) {
    this.submitted.emit(ev);
    return false;
  }
}
