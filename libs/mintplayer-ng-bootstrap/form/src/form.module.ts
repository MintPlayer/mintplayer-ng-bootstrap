import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormComponent } from './form/form.component';
import { BsFormControlDirective } from './form-control/form-control.directive';

@NgModule({
  declarations: [BsFormComponent, BsFormControlDirective],
  imports: [CommonModule],
  exports: [BsFormComponent, BsFormControlDirective],
})
export class BsFormModule {}
