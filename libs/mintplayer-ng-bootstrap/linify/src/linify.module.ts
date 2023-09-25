import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsLinifyPipe } from './linify.pipe';

@NgModule({
  declarations: [BsLinifyPipe],
  imports: [CommonModule],
  exports: [BsLinifyPipe],
})
export class BsLinifyModule {}
