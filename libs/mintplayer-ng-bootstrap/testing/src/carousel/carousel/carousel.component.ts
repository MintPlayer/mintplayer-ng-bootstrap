import { Component, Input } from '@angular/core';
import { BsCarouselComponent } from '@mintplayer/ng-bootstrap/carousel';

@Component({
  selector: 'bs-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  providers: [
    { provide: BsCarouselComponent, useExisting: BsCarouselMockComponent }
  ]
})
export class BsCarouselMockComponent {
  @Input() public animation: 'fade' | 'slide' = 'slide';
  @Input() public indicators = true;
}
