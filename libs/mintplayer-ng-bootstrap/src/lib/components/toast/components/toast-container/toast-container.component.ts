import { Component, HostBinding } from '@angular/core';
import { BsToastService } from '../../services/toast/toast.service';

@Component({
  selector: 'bs-toast-container',
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss'],
})
export class BsToastContainerComponent {
  constructor(toastService: BsToastService) {
    this.toastService = toastService;
  }

  toastService: BsToastService;

  @HostBinding('style.overflow-y') overflowY = 'auto';
}
