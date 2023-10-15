import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HasPropertyPipe } from './has-property.pipe';

@NgModule({
  declarations: [HasPropertyPipe],
  imports: [CommonModule],
  exports: [HasPropertyPipe],
})
export class BsHasPropertyModule {}
