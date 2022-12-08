import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTabControlComponent } from './tab-control/tab-control.component';
import { BsTabPageComponent } from './tab-page/tab-page.component';

@NgModule({
  declarations: [
    BsTabControlComponent,
    BsTabPageComponent,
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsTabControlComponent,
    BsTabPageComponent,
  ]
})
export class BsTabControlModule { }
