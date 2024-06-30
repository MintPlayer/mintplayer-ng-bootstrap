import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSelectComponent } from './component/select.component';
import { BsSelectValueAccessor, BsSelectOption } from './value-accessors/select-value-accessor';
import { BsDisableSelectDirective } from './directives/disable-select/disable-select.directive';

@NgModule({
  declarations: [
    BsSelectComponent,
    BsSelectValueAccessor,
    // BsDisableSelectDirective,
    BsSelectOption
  ],
  imports: [CommonModule],
  exports: [
    BsSelectComponent,
    BsSelectValueAccessor,
    // BsDisableSelectDirective,
    BsSelectOption
  ],
})
export class BsSelectModule {}
