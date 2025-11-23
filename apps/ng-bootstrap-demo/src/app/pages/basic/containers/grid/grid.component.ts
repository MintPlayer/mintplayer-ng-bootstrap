import { Component } from '@angular/core';
import { BsGridColDirective, BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';

@Component({
  selector: 'demo-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  standalone: true,
  imports: [BsGridComponent, BsGridRowDirective, BsGridColDirective, BsGridColumnDirective]
})
export class GridComponent {}
