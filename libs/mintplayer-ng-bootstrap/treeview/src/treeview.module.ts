import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsTreeviewComponent } from './treeview/treeview.component';
import { BsTreeviewItemComponent } from './treeview-item/treeview-item.component';

@NgModule({
  declarations: [BsTreeviewComponent, BsTreeviewItemComponent],
  imports: [CommonModule, BsListGroupModule],
  exports: [BsTreeviewComponent, BsTreeviewItemComponent],
})
export class BsTreeviewModule {}
