import { Component } from '@angular/core';
import { BsTabsPosition } from '@mintplayer/ng-bootstrap/tab-control';

@Component({
  selector: 'demo-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss']
})
export class TabControlComponent {
  tabsPosition: BsTabsPosition = 'top';
  numbers = Array.from(Array(20).keys()).map(i => i + 1);
}
