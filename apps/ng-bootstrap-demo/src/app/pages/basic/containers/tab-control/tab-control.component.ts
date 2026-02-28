import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSelectComponent } from '@mintplayer/ng-bootstrap/select';
import { BsTabControlComponent, BsTabPageComponent, BsTabPageHeaderDirective, BsTabsPosition } from '@mintplayer/ng-bootstrap/tab-control';
import { BsToggleButtonComponent, BsToggleButtonValueAccessor } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-tab-control',
  templateUrl: './tab-control.component.html',
  styleUrls: ['./tab-control.component.scss'],
  standalone: true,
  imports: [FormsModule, BsForDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsSelectComponent, BsTabControlComponent, BsTabPageComponent, BsTabPageHeaderDirective, BsToggleButtonComponent, BsToggleButtonValueAccessor],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabControlComponent {
  tabsPosition = signal<BsTabsPosition>('top');
  numbers = Array.from(Array(20).keys()).map(i => i + 1);
  allowDragDrop = signal(true);
}
