import { Component } from '@angular/core';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';

@Component({
  selector: 'demo-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  standalone: true,
  imports: [BsGridModule]
})
export class GridComponent {}
