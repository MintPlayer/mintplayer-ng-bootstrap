import { Component } from '@angular/core';

@Component({
  selector: 'demo-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss']
})
export class TabControlComponent {
  numbers = Array.from(Array(20).keys()).map(i => i + 4);
}
