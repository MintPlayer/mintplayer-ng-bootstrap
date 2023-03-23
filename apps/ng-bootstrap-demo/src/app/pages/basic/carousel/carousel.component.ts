import { Component } from '@angular/core';
import { Direction } from '@mintplayer/ng-swiper';

@Component({
  selector: 'demo-carousel',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss']
})
export class CarouselComponent {
  mode: 'slide' | 'fade' = 'slide';
  direction: Direction = 'horizontal';
  
  onModeChange(value: any) {
    this.mode = value;
  }
}
