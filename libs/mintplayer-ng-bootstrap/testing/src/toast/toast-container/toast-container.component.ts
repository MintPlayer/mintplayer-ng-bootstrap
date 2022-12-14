import { Component } from '@angular/core';
import { BsToastContainerComponent, BsToastService } from '@mintplayer/ng-bootstrap/toast';

@Component({
  selector: 'bs-toast-container',
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss'],
  providers: [
    { provide: BsToastContainerComponent, useExisting: BsToastContainerMockComponent }
  ]
})
export class BsToastContainerMockComponent {
  constructor(toastService: BsToastService) {
    this.toastService = toastService;
  }

  toastService: BsToastService;
}
