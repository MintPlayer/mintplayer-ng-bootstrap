import { Component, model, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsGridComponent, BsGridRowDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsTabControlComponent, BsTabPageComponent, BsTabPageHeaderDirective, BsTabsPosition } from '@mintplayer/ng-bootstrap/tab-control';

@Component({
  selector: 'demo-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss'],
  imports: [FormsModule, BsForDirective, BsGridComponent, BsGridRowDirective, BsGridColDirective, BsSelectComponent, BsSelectOption, BsTabControlComponent, BsTabPageComponent, BsTabPageHeaderDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabControlComponent {
  tabsPosition = model<BsTabsPosition>('top');
  numbers = Array.from(Array(20).keys()).map(i => i + 1);
}
