import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsColorPickerValueAccessor } from './directives/color-picker-value-accessor/color-picker-value-accessor.directive';
import { BsColorPickerComponent } from './components/color-picker/color-picker.component';
import { BsColorWheelComponent } from './components/color-wheel/color-wheel.component';
import { BsLuminosityStripComponent } from './components/luminosity-strip/luminosity-strip.component';

@NgModule({
  declarations: [
    BsColorPickerComponent,
    BsColorPickerValueAccessor,
    BsColorWheelComponent,
    BsLuminosityStripComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    BsColorPickerComponent,
    BsColorPickerValueAccessor,
    BsColorWheelComponent,
    BsLuminosityStripComponent
  ]
})
export class BsColorPickerModule { }
