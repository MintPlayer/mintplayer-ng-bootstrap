import { Component } from '@angular/core';
import { BsGridColDirective, BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';

@Component({
  selector: 'demo-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  imports: [BsGridComponent, BsGridRowDirective, BsGridColDirective, BsGridColumnDirective]
})
export class GridComponent {}
