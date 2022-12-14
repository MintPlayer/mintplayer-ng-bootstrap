import { Component, Input } from '@angular/core';

@Component({
  selector: 'bs-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss'],
})
export class BsTabControlMockComponent {
  @Input() border = true;
}
