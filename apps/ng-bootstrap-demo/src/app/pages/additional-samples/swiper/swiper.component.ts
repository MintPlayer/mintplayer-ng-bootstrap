import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-swiper',
  templateUrl: './swiper.component.html',
  styleUrls: ['./swiper.component.scss']
})
export class SwiperComponent {

  colors = Color;
  indicators = true;
  images = [
    '/assets/resized/deer.png',
    '/assets/resized/duck.png',
    '/assets/resized/leopard.png',
    '/assets/resized/lion.png',
    '/assets/resized/peacock.png',
    '/assets/resized/tiger.png',
  ];

}
