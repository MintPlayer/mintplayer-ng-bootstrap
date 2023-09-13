import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsWordCountPipe } from './word-count.pipe';

@NgModule({
  declarations: [BsWordCountPipe],
  imports: [CommonModule],
  exports: [BsWordCountPipe],
})
export class BsWordCountModule {}
