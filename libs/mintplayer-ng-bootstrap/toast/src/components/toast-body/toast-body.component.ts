import { Component, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-toast-body',
  templateUrl: './toast-body.component.html',
  styleUrls: ['./toast-body.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.d-flex]': 'true',
    '[class.toast-body]': 'true',
  },
})
export class BsToastBodyComponent {
}
