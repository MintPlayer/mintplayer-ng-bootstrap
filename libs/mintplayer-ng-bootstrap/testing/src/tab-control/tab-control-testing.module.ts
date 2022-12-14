import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTabControlMockComponent } from './tab-control/tab-control.component';
import { BsTabPageMockComponent } from './tab-page/tab-page.component';

@NgModule({
  declarations: [BsTabControlMockComponent, BsTabPageMockComponent],
  imports: [CommonModule],
  exports: [BsTabControlMockComponent, BsTabPageMockComponent],
})
export class BsTabControlTestingModule {}
