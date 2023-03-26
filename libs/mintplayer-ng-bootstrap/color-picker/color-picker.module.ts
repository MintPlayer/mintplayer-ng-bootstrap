import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsColorWheelValueAccessor } from './directives/color-wheel-value-accessor/color-wheel-value-accessor.directive';
import { BsColorPickerValueAccessor } from './directives/color-picker-value-accessor/color-picker-value-accessor.directive';
import { BsColorPickerComponent } from './components/color-picker/color-picker.component';
import { BsColorWheelComponent } from './components/color-wheel/color-wheel.component';
import { BsLetModule } from '../let/let.module';

@NgModule({
  declarations: [
    BsColorPickerComponent,
    BsColorPickerValueAccessor,
    BsColorWheelValueAccessor,
    BsColorWheelComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsLetModule,
  ],
  exports: [
    BsColorPickerComponent,
    BsColorPickerValueAccessor,
    BsColorWheelValueAccessor,
    BsColorWheelComponent
  ]
})
export class BsColorPickerModule { }
