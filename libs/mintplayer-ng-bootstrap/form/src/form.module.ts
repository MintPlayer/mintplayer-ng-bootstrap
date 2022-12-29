import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormComponent } from './form/form.component';
import { BsFormControlDirective } from './form-control/form-control.directive';
import { BsFormGroupDirective } from './form-group/form-group.directive';

@NgModule({
  declarations: [BsFormComponent, BsFormControlDirective, BsFormGroupDirective],
  imports: [CommonModule],
  exports: [BsFormComponent, BsFormControlDirective, BsFormGroupDirective],
})
export class BsFormModule {}
