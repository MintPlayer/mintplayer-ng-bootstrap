import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { BsLetModule } from '@mintplayer/ng-bootstrap/let';
import { BsNoNoscriptModule } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsTabControlComponent } from './tab-control/tab-control.component';
import { BsTabPageComponent } from './tab-page/tab-page.component';
import { BsTabPageHeaderDirective } from './tab-page-header/tab-page-header.directive';

@NgModule({
  declarations: [
    BsTabControlComponent,
    BsTabPageComponent,
    BsTabPageHeaderDirective,
  ],
  imports: [
    CommonModule,
    DragDropModule,
    BsLetModule,
    BsNoNoscriptModule
  ],
  exports: [
    BsTabControlComponent,
    BsTabPageComponent,
    BsTabPageHeaderDirective,
  ]
})
export class BsTabControlModule { }
