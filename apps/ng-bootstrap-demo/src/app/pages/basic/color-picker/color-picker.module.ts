import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsColorPickerModule } from '@mintplayer/ng-bootstrap/color-picker';

import { ColorPickerRoutingModule } from './color-picker-routing.module';
import { ColorPickerComponent } from './color-picker.component';


@NgModule({
  declarations: [
    ColorPickerComponent
  ],
  imports: [
    CommonModule,
    BsButtonTypeModule,
    BsColorPickerModule,
    ColorPickerRoutingModule
  ]
})
export class ColorPickerModule { }
