import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';

@Component({
  selector: 'bs-toast-body',
  templateUrl: './toast-body.component.html',
  styleUrls: ['./toast-body.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsToastBodyComponent {
  @HostBinding('class.d-flex')
  @HostBinding('class.toast-body')
  toastClasses = true;
}
