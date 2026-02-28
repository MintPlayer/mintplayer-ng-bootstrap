import { Component, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-offcanvas-header',
  templateUrl: './offcanvas-header.component.html',
  styleUrls: ['./offcanvas-header.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffcanvasHeaderComponent {}
