import { NgModule } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BsColorPickerValueAccessor } from './directives/color-picker-value-accessor/color-picker-value-accessor.directive';
import { BsColorPickerComponent } from './components/color-picker/color-picker.component';
import { BsColorWheelComponent } from './components/color-wheel/color-wheel.component';
import { BsLuminosityStripComponent } from './components/luminosity-strip/luminosity-strip.component';
import { BsSliderComponent, BsThumbDirective, BsTrackDirective } from './components/slider/slider.component';
import { BsAlphaStripComponent } from './components/alpha-strip/alpha-strip.component';

@NgModule({
  declarations: [
    BsColorPickerComponent,
    BsColorPickerValueAccessor,
    BsColorWheelComponent,
    BsLuminosityStripComponent,
    BsSliderComponent,
    BsAlphaStripComponent
  ],
  imports: [
    AsyncPipe,
    FormsModule,
    BsThumbDirective,
    BsTrackDirective,
  ],
  exports: [
    BsColorPickerComponent,
    BsColorPickerValueAccessor,
    BsColorWheelComponent,
    BsLuminosityStripComponent,
    BsSliderComponent,
    BsThumbDirective,
    BsTrackDirective,
    BsAlphaStripComponent
  ]
})
export class BsColorPickerModule { }
