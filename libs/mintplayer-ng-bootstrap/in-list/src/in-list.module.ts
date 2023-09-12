import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsInListPipe } from './in-list.pipe';

@NgModule({
  declarations: [
    BsInListPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsInListPipe
  ]
})
export class BsInListModule { }
