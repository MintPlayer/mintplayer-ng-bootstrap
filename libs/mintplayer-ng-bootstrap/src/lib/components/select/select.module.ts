import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSelectComponent } from './component/select.component';
import { BsSelectValueAccessor, BsSelectOption } from './value-accessors/select-value-accessor';

@NgModule({
  declarations: [
    BsSelectComponent,
    BsSelectValueAccessor,
    BsSelectOption
  ],
  imports: [CommonModule],
  exports: [
    BsSelectComponent,
    BsSelectValueAccessor,
    BsSelectOption
  ],
})
export class BsSelectModule {}
