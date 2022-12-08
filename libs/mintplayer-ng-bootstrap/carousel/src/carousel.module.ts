import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCarouselComponent } from './carousel/carousel.component';
import { BsCarouselImageDirective } from './carousel-image/carousel-image.directive';

@NgModule({
  declarations: [
    BsCarouselComponent,
    BsCarouselImageDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsCarouselComponent,
    BsCarouselImageDirective
  ]
})
export class BsCarouselModule { }
