import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsLetModule } from '@mintplayer/ng-bootstrap/let';
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
    BsThumbDirective,
    BsTrackDirective,
    BsAlphaStripComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsLetModule
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
