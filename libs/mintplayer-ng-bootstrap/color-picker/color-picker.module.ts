import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsLetModule } from '../let/let.module';
import { BsColorPickerValueAccessor } from './directives/color-picker-value-accessor/color-picker-value-accessor.directive';
import { BsColorPickerComponent } from './components/color-picker/color-picker.component';
import { BsColorWheelComponent } from './components/color-wheel/color-wheel.component';
import { BsSaturationStripComponent } from './components/saturation-strip/saturation-strip.component';
import { HslService } from './services/hsl/hsl.service';

@NgModule({
  declarations: [
    BsColorPickerComponent,
    BsColorPickerValueAccessor,
    BsColorWheelComponent,
    BsSaturationStripComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsLetModule,
  ],
  providers: [
    HslService
  ],
  exports: [
    BsColorPickerComponent,
    BsColorPickerValueAccessor,
    BsColorWheelComponent,
    BsSaturationStripComponent
  ]
})
export class BsColorPickerModule { }
