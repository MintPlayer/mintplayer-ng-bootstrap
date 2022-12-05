import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsContextMenuModule, BsDropdownMenuModule } from '@mintplayer/ng-bootstrap';

import { ContextMenuRoutingModule } from './context-menu-routing.module';
import { ContextMenuComponent } from './context-menu.component';


@NgModule({
  declarations: [
    ContextMenuComponent
  ],
  imports: [
    CommonModule,
    BsDropdownMenuModule,
    BsContextMenuModule,
    ContextMenuRoutingModule
  ]
})
export class ContextMenuModule { }
