import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsIconModule } from '@mintplayer/ng-bootstrap/icon';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsTreeviewComponent } from './treeview/treeview.component';
import { BsTreeviewItemComponent } from './treeview-item/treeview-item.component';

@NgModule({
  declarations: [BsTreeviewComponent, BsTreeviewItemComponent],
  imports: [CommonModule, BsListGroupModule, BsIconModule],
  exports: [BsTreeviewComponent, BsTreeviewItemComponent],
})
export class BsTreeviewModule {}
