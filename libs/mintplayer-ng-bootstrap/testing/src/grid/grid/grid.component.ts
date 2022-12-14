import { Component, Input } from '@angular/core';
import { BsGridComponent } from '@mintplayer/ng-bootstrap/grid';

@Component({
  selector: 'bs-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  providers: [
    { provide: BsGridComponent, useExisting: BsGridMockComponent },
  ]
})
export class BsGridMockComponent {
  @Input() stopFullWidthAt: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'never' = 'sm';
}
