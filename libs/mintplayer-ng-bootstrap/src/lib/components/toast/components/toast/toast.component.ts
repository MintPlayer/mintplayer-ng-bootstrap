import { Component, Input } from '@angular/core';

@Component({
  selector: 'bs-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class BsToastComponent {
  constructor() {
    this.id = BsToastComponent.counter++;
  }

  static counter = 1;
  id: number | null = null;
  @Input() public isVisible = false;
}
