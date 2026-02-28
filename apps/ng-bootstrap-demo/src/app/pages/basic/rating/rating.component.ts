import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsRatingComponent } from '@mintplayer/ng-bootstrap/rating';

@Component({
  selector: 'demo-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss'],
  standalone: true,
  imports: [BsGridModule, BsRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingComponent {
  ratingValue = signal(3);
  previewValue = signal(3);
}
