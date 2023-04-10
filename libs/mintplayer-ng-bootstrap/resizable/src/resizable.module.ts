import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsResizableComponent } from './resizable/resizable.component';

@NgModule({
  declarations: [
    BsResizableComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsResizableComponent
  ]
})
export class BsResizableModule { }
