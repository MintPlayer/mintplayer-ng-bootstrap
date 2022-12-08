import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'bs-toast-header',
  templateUrl: './toast-header.component.html',
  styleUrls: ['./toast-header.component.scss'],
})
export class BsToastHeaderComponent {
  constructor() {}

  @HostBinding('class.toast-header') toastClass = true;
}
