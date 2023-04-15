import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTreeviewModule } from '@mintplayer/ng-bootstrap/treeview';

import { TreeviewRoutingModule } from './treeview-routing.module';
import { TreeviewComponent } from './treeview.component';


@NgModule({
  declarations: [
    TreeviewComponent
  ],
  imports: [
    CommonModule,
    BsTreeviewModule,
    TreeviewRoutingModule
  ]
})
export class TreeviewModule { }
