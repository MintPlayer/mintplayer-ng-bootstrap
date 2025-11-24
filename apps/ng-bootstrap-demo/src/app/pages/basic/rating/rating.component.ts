import { Component } from '@angular/core';
import { BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsRatingComponent } from '@mintplayer/ng-bootstrap/rating';

@Component({
  selector: 'demo-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss'],
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsRatingComponent]
})
export class RatingComponent {
  ratingValue = 3;
  previewValue = 3;
}
