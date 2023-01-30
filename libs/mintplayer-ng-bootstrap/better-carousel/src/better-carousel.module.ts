import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsNoNoscriptModule } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsBetterCarouselComponent } from './better-carousel/better-carousel.component';
import { BsCarouselImageDirective } from './carousel-image/carousel-image.directive';

@NgModule({
  declarations: [BsBetterCarouselComponent, BsCarouselImageDirective],
  imports: [CommonModule, BsNoNoscriptModule],
  exports: [BsBetterCarouselComponent, BsCarouselImageDirective],
})
export class BsBetterCarouselModule {}
