import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'bs-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.None,
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
