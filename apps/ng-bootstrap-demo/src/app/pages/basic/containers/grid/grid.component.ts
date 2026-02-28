import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';

@Component({
  selector: 'demo-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  standalone: true,
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridComponent {}
