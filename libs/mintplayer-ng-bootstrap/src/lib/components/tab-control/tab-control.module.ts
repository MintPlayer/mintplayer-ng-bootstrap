import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTabControlComponent } from './tab-control/tab-control.component';
import { BsTabPageComponent } from './tab-page/tab-page.component';
import { BsTabPageHeaderComponent } from './tab-page-header/tab-page-header.component';
import { TabPageHeaderDirective } from './tab-page-header-directive/tab-page-header.directive';

@NgModule({
  declarations: [
    BsTabControlComponent,
    BsTabPageComponent,
    BsTabPageHeaderComponent,
    TabPageHeaderDirective
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsTabControlComponent,
    BsTabPageComponent,
    BsTabPageHeaderComponent,
    TabPageHeaderDirective
  ]
})
export class BsTabControlModule { }
