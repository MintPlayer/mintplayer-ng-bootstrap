import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsColorPickerModule } from '@mintplayer/ng-bootstrap';

import { ColorPickerRoutingModule } from './color-picker-routing.module';
import { ColorPickerComponent } from './color-picker.component';


@NgModule({
  declarations: [
    ColorPickerComponent
  ],
  imports: [
    CommonModule,
    BsColorPickerModule,
    ColorPickerRoutingModule
  ]
})
export class ColorPickerModule { }
