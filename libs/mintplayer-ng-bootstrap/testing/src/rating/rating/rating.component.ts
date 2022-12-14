import { Component, Input } from '@angular/core';

@Component({
  selector: 'bs-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss'],
})
export class BsRatingMockComponent {
  @Input() maximum = 5;
  @Input() value = 0;
}
