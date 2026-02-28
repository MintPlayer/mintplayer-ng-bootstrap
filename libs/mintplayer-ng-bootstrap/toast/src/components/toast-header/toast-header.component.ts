import { Component, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-toast-header',
  templateUrl: './toast-header.component.html',
  styleUrls: ['./toast-header.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.toast-header]': 'true',
  },
})
export class BsToastHeaderComponent {
}
