import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCardComponent } from './card/card.component';
import { BsCardHeaderComponent } from './card-header/card-header.component';

@NgModule({
  imports: [CommonModule],
  declarations: [
    BsCardComponent,
    BsCardHeaderComponent
  ],
  exports: [
    BsCardComponent,
    BsCardHeaderComponent
  ]
})
export class BsCardModule {}
