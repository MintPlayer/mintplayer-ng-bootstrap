import { Component, ContentChildren, forwardRef, QueryList } from '@angular/core';
import { FadeInOutAnimation, CarouselSlideAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCarouselPreviewImageDirective } from '../carousel-preview-image/carousel-image.directive';

@Component({
  selector: 'bs-carousel-preview',
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.scss'],
  animations: [FadeInOutAnimation, CarouselSlideAnimation]
})
export class BsCarouselPreviewComponent {

  colors = Color;
  indicators = true;
  // images = [
  //   '/assets/resized/deer.png',
  //   '/assets/resized/duck.png',
  //   '/assets/resized/leopard.png',
  //   '/assets/resized/lion.png',
  //   '/assets/resized/peacock.png',
  //   '/assets/resized/tiger.png',
  // ];

  @ContentChildren(forwardRef(() => BsCarouselPreviewImageDirective)) images!: QueryList<BsCarouselPreviewImageDirective>;

}
