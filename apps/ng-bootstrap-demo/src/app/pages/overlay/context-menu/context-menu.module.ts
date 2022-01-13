import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsContextMenuModule } from '@mintplayer/ng-bootstrap';

import { ContextMenuRoutingModule } from './context-menu-routing.module';
import { ContextMenuComponent } from './context-menu.component';


@NgModule({
  declarations: [
    ContextMenuComponent
  ],
  imports: [
    CommonModule,
    BsContextMenuModule,
    ContextMenuRoutingModule
  ]
})
export class ContextMenuModule { }
