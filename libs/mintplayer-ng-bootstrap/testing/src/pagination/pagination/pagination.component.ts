import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';

@Component({
  selector: 'bs-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  providers: [
    { provide: BsPaginationComponent, useExisting: BsPaginationMockComponent },
  ]
})
export class BsPaginationMockComponent {
  @Input() showArrows = true;
  @Input() numberOfBoxes: number | null = null;
  @Input() pageNumbers: number[] = [10];
  @Input() selectedPageNumber = 10;
  @Output() selectedPageNumberChange = new EventEmitter<number>();
}
