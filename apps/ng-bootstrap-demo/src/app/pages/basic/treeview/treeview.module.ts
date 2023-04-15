import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTreeviewModule } from '@mintplayer/ng-bootstrap/treeview';

import { TreeviewRoutingModule } from './treeview-routing.module';
import { TreeviewComponent } from './treeview.component';
import { BsIconModule } from '@mintplayer/ng-bootstrap/icon';


@NgModule({
  declarations: [
    TreeviewComponent
  ],
  imports: [
    CommonModule,
    BsTreeviewModule,
    BsIconModule,
    TreeviewRoutingModule
  ]
})
export class TreeviewModule { }
