import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsColorPickerModule } from '@mintplayer/ng-bootstrap/color-picker';
import { BsFontColorModule } from '@mintplayer/ng-bootstrap/font-color';

import { FontColorRoutingModule } from './font-color-routing.module';
import { FontColorComponent } from './font-color.component';


@NgModule({
  declarations: [
    FontColorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsColorPickerModule,
    BsFontColorModule,
    FontColorRoutingModule
  ]
})
export class FontColorModule { }
