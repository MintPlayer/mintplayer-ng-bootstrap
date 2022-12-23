import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFloatingLabelComponent } from './floating-label/floating-label.component';
import { BsFloatingFormControlDirective } from './floating-form-control/floating-form-control.directive';

@NgModule({
  declarations: [BsFloatingLabelComponent, BsFloatingFormControlDirective],
  imports: [CommonModule],
  exports: [BsFloatingLabelComponent, BsFloatingFormControlDirective],
})
export class BsFloatingLabelsModule {}
