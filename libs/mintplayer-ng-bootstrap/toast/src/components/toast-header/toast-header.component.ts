import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';

@Component({
  selector: 'bs-toast-header',
  templateUrl: './toast-header.component.html',
  styleUrls: ['./toast-header.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsToastHeaderComponent {
  @HostBinding('class.toast-header') toastClass = true;
}
