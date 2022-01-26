import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCarouselComponent } from './carousel/carousel.component';
import { BsCarouselImageDirective } from './carousel-image/carousel-image.directive';
import { CustomTemplateOutletModule } from '../../directives/custom-template-outlet/custom-template-outlet.module';

@NgModule({
  declarations: [
    BsCarouselComponent,
    BsCarouselImageDirective
  ],
  imports: [
    CommonModule,
    CustomTemplateOutletModule
  ],
  exports: [
    BsCarouselComponent,
    BsCarouselImageDirective
  ]
})
export class BsCarouselModule { }
