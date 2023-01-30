import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBetterCarouselComponent } from './better-carousel/better-carousel.component';
import { BsCarouselImageDirective } from './carousel-image/carousel-image.directive';

@NgModule({
  declarations: [BsBetterCarouselComponent, BsCarouselImageDirective],
  imports: [CommonModule],
  exports: [BsBetterCarouselComponent, BsCarouselImageDirective],
})
export class BsBetterCarouselModule {}
