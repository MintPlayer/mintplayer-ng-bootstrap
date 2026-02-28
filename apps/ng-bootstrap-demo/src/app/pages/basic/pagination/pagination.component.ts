import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';

@Component({
  selector: 'demo-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  imports: [BsPaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {

  example1PageNumbers = signal<number[]>([10, 20, 50]);
  example1_2SelectedPageNumber = signal(20);

  example2PageNumbers = signal<number[]>([10, 20, 50]);

  example3PageNumbers = signal<number[]>([...Array(10).keys()].map((p) => p + 1));
  example3SelectedPageNumber = signal(5);

  example4PageNumbers = signal<number[]>([...Array(30).keys()].map((p) => p + 1));
  example4SelectedPageNumber = signal(15);

}
