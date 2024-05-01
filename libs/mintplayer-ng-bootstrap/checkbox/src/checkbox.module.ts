import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFormCheckComponent } from '@mintplayer/ng-bootstrap/form-check';
import { BsCheckboxComponent } from './checkbox.component';
import { BsCheckboxValueAccessor } from './checkbox-accessor.directive';

@NgModule({
  declarations: [BsCheckboxComponent, BsCheckboxValueAccessor],
  imports: [CommonModule, BsFormCheckComponent],
  exports: [BsCheckboxComponent, BsCheckboxValueAccessor],
})
export class BsCheckboxModule { }
