import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsButtonGroupModule } from '@mintplayer/ng-bootstrap/button-group';
import { BsColorPickerModule } from '@mintplayer/ng-bootstrap/color-picker';

import { ColorPickerRoutingModule } from './color-picker-routing.module';
import { ColorPickerComponent } from './color-picker.component';


@NgModule({
  declarations: [
    ColorPickerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsButtonTypeModule,
    BsButtonGroupModule,
    BsColorPickerModule,
    ColorPickerRoutingModule
  ]
})
export class ColorPickerModule { }
