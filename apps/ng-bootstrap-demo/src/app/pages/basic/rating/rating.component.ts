import { Component } from '@angular/core';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsRatingModule } from '@mintplayer/ng-bootstrap/rating';

@Component({
  selector: 'demo-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss'],
  standalone: true,
  imports: [BsGridModule, BsRatingModule]
})
export class RatingComponent {
  ratingValue = 3;
  previewValue = 3;
}
