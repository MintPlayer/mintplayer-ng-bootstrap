import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsGridColDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsTabControlModule, BsTabsPosition } from '@mintplayer/ng-bootstrap/tab-control';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss'],
  imports: [FormsModule, BsForDirective, BsGridComponent, BsGridRowDirective, BsGridColDirective, BsSelectComponent, BsSelectOption, BsTabControlModule, BsToggleButtonComponent]
})
export class TabControlComponent {
  tabsPosition: BsTabsPosition = 'top';
  numbers = Array.from(Array(20).keys()).map(i => i + 1);
  allowDragDrop = true;
}
