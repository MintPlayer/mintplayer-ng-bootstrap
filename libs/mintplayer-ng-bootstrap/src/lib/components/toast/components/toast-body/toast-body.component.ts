import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'bs-toast-body',
  templateUrl: './toast-body.component.html',
  styleUrls: ['./toast-body.component.scss'],
})
export class BsToastBodyComponent {
  constructor() {}

  @HostBinding('class.d-flex')
  @HostBinding('class.toast-body')
  toastClasses = true;
}
