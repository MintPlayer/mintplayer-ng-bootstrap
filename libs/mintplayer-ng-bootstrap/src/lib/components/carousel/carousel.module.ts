import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCarouselComponent } from './carousel/carousel.component';
import { BsCarouselSlideDirective } from './carousel-slide/carousel-slide.directive';

@NgModule({
  declarations: [
    BsCarouselComponent,
    BsCarouselSlideDirective,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsCarouselComponent,
    BsCarouselSlideDirective,
  ]
})
export class BsCarouselModule { }
