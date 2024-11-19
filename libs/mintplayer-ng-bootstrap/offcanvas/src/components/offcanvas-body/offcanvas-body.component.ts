import { Component, Input } from '@angular/core';

@Component({
  selector: 'bs-offcanvas-body',
  templateUrl: './offcanvas-body.component.html',
  styleUrls: ['./offcanvas-body.component.scss'],
  standalone: false,
})
export class OffcanvasBodyComponent {
  @Input() noPadding = false;
}
