import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsColorPickerComponent } from './component/color-picker.component';
import { BsColorPickerValueAccessor } from './directives/color-picker-value-accessor/color-picker-value-accessor.directive';

@NgModule({
  declarations: [
    BsColorPickerComponent,
    BsColorPickerValueAccessor
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    BsColorPickerComponent,
    BsColorPickerValueAccessor
  ]
})
export class BsColorPickerModule { }
