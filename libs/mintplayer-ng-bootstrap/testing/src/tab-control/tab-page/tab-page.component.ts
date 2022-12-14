import { Component, Input } from '@angular/core';

@Component({
  selector: 'bs-tab-page',
  templateUrl: './tab-page.component.html',
  styleUrls: ['./tab-page.component.scss'],
})
export class BsTabPageMockComponent {
  @Input() disabled = false;
}
