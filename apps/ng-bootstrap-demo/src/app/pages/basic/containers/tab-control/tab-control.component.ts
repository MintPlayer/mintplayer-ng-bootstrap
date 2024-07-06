import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';
import { BsTabControlModule, BsTabsPosition } from '@mintplayer/ng-bootstrap/tab-control';

@Component({
  selector: 'demo-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss'],
  standalone: true,
  imports: [FormsModule, BsForDirective, BsGridModule, BsSelectModule, BsTabControlModule, BsCheckboxComponent]
})
export class TabControlComponent {
  tabsPosition: BsTabsPosition = 'top';
  numbers = Array.from(Array(20).keys()).map(i => i + 1);
  allowDragDrop = true;
}
