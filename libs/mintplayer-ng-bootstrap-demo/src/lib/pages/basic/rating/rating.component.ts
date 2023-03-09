import { Component } from '@angular/core';

@Component({
  selector: 'demo-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss']
})
export class RatingComponent {

  ratingValue = 3;
  previewValue = 3;

}
