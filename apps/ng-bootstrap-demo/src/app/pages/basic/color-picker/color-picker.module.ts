import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsButtonGroupModule } from '@mintplayer/ng-bootstrap/button-group';
import { BsColorPickerModule } from '@mintplayer/ng-bootstrap/color-picker';

import { ColorPickerRoutingModule } from './color-picker-routing.module';
import { ColorPickerComponent } from './color-picker.component';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';


@NgModule({
  declarations: [
    ColorPickerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsGridModule,
    BsButtonTypeModule,
    BsButtonGroupModule,
    BsColorPickerModule,
    BsToggleButtonModule,
    BsListGroupModule,
    ColorPickerRoutingModule
  ]
})
export class ColorPickerModule { }
