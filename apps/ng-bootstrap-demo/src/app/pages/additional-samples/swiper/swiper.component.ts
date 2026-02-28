import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsCarouselComponent, BsCarouselImageDirective } from '@mintplayer/ng-bootstrap/carousel';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';

@Component({
  selector: 'demo-swiper',
  templateUrl: './swiper.component.html',
  styleUrls: ['./swiper.component.scss'],
  standalone: true,
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsAlertComponent, BsCarouselComponent, BsCarouselImageDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
