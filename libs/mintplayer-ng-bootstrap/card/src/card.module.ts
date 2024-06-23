import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCardComponent } from './card/card.component';
import { BsCardHeaderDirective } from './card-header/card-header.directive';
import { BsCardBodyDirective } from './card-body/card-body.directive';
import { BsCardFooterDirective } from './card-footer/card-footer.directive';
import { BsCardImageDirective } from './card-image/card-image.directive';

@NgModule({
  imports: [CommonModule],
  declarations: [
    BsCardComponent,
    BsCardHeaderDirective,
    BsCardBodyDirective,
    BsCardFooterDirective,
    BsCardImageDirective
  ],
  exports: [
    BsCardComponent,
    BsCardHeaderDirective,
    BsCardBodyDirective,
    BsCardFooterDirective,
    BsCardImageDirective
  ]
})
export class BsCardModule {}
