import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSlugifyPipe } from './slugify.pipe';

@NgModule({
  declarations: [BsSlugifyPipe],
  imports: [CommonModule],
  exports: [BsSlugifyPipe],
})
export class BsSlugifyModule {}
