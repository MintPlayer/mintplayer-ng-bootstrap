import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsFontColorPipe } from './font-color.pipe';



@NgModule({
  declarations: [
    BsFontColorPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsFontColorPipe
  ]
})
export class BsFontColorPipeModule { }
