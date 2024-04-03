import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsCarouselModule } from '@mintplayer/ng-bootstrap/carousel';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';

@Component({
  selector: 'demo-swiper',
  templateUrl: './swiper.component.html',
  styleUrls: ['./swiper.component.scss'],
  standalone: true,
  imports: [BsGridModule, BsAlertModule, BsCarouselModule]
})
export class SwiperComponent {

  colors = Color;
  images = [
    '/assets/resized/deer.png',
    '/assets/resized/duck.png',
    '/assets/resized/leopard.png',
    '/assets/resized/lion.png',
    '/assets/resized/peacock.png',
    '/assets/resized/tiger.png',
  ];

}
