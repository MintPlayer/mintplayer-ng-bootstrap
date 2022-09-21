import { Component, HostBinding } from '@angular/core';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';

@Component({
  selector: 'bs-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  animations: [FadeInOutAnimation]
})
export class BsToastComponent {
  constructor() {
    this.id = BsToastComponent.counter++;
  }

  static counter = 1;
  id: number | null = null;
}
