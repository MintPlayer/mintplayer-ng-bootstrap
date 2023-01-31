import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsNoNoscriptModule } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsCarouselComponent } from './carousel/carousel.component';
import { BsCarouselImageDirective } from './carousel-image/carousel-image.directive';

@NgModule({
  declarations: [
    BsCarouselComponent,
    BsCarouselImageDirective
  ],
  imports: [
    CommonModule,
    BsNoNoscriptModule
  ],
  exports: [
    BsCarouselComponent,
    BsCarouselImageDirective
  ]
})
export class BsCarouselModule { }
