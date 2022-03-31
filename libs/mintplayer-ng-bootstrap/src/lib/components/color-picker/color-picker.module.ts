import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsColorPickerComponent } from './component/color-picker.component';

@NgModule({
  declarations: [
    BsColorPickerComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    BsColorPickerComponent
  ]
})
export class BsColorPickerModule { }
