import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCarouselMockComponent } from './carousel/carousel.component';
import { BsCarouselImageMockDirective } from './carousel-image/carousel-image.directive';
import { BsCarouselComponent } from '@mintplayer/ng-bootstrap/carousel';

@NgModule({
  declarations: [BsCarouselMockComponent, BsCarouselImageMockDirective],
  imports: [CommonModule],
  exports: [BsCarouselMockComponent, BsCarouselImageMockDirective],
  providers: [
    { provide: BsCarouselComponent, useClass: BsCarouselMockComponent }
  ]
})
export class BsCarouselTestingModule {}
