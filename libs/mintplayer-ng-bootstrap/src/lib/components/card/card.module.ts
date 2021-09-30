import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from './card/card.component';
import { CardHeaderComponent } from './card-header/card-header.component';

@NgModule({
  imports: [CommonModule],
  declarations: [
    CardComponent,
    CardHeaderComponent
  ],
  exports: [
    CardComponent,
    CardHeaderComponent
  ]
})
export class BsCardModule {}
