import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsMarqueeComponent } from './marquee/marquee.component';

@NgModule({
  declarations: [BsMarqueeComponent],
  imports: [CommonModule],
  exports: [BsMarqueeComponent],
})
export class BsMarqueeModule {}
