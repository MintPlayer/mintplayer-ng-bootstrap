import { Component, ContentChildren, QueryList } from '@angular/core';
import { BsCarouselImageDirective } from '../carousel-image/carousel-image.directive';

@Component({
  selector: 'bs-better-carousel',
  templateUrl: './better-carousel.component.html',
  styleUrls: ['./better-carousel.component.scss'],
})
export class BsBetterCarouselComponent {
  @ContentChildren(BsCarouselImageDirective) images!: QueryList<BsCarouselImageDirective>;
}
