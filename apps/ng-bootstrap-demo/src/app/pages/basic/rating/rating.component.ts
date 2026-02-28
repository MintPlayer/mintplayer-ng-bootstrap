import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsRatingComponent } from '@mintplayer/ng-bootstrap/rating';

@Component({
  selector: 'demo-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss'],
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingComponent {
  ratingValue = signal(3);
  previewValue = signal(3);
}
