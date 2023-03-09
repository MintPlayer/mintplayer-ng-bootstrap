import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsContextMenuModule } from '@mintplayer/ng-bootstrap/context-menu';
import { BsDropdownMenuModule } from '@mintplayer/ng-bootstrap/dropdown-menu';

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
