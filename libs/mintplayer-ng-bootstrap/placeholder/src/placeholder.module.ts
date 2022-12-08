import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsPlaceholderComponent } from './placeholder/placeholder.component';
import { BsPlaceholderFieldDirective } from './placeholder-field/placeholder-field.directive';

@NgModule({
  declarations: [BsPlaceholderComponent, BsPlaceholderFieldDirective],
  imports: [CommonModule],
  exports: [BsPlaceholderComponent, BsPlaceholderFieldDirective],
})
export class BsPlaceholderModule {}
