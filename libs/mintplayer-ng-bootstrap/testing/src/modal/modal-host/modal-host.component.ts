import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'bs-modal',
  templateUrl: './modal-host.component.html',
  styleUrls: ['./modal-host.component.scss'],
})
export class BsModalHostMockComponent {
  @Input() isOpen = false;
  @Output() isOpenChange = new EventEmitter<boolean>();
}
