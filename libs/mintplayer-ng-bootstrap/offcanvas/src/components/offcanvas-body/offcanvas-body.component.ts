import { Component, input, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-offcanvas-body',
  templateUrl: './offcanvas-body.component.html',
  styleUrls: ['./offcanvas-body.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffcanvasBodyComponent {
  readonly noPadding = input(false);
}
