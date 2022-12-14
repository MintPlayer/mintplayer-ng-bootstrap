import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsListGroupMockComponent } from './list-group/list-group.component';
import { BsListGroupItemMockComponent } from './list-group-item/list-group-item.component';

@NgModule({
  declarations: [BsListGroupMockComponent, BsListGroupItemMockComponent],
  imports: [CommonModule],
  exports: [BsListGroupMockComponent, BsListGroupItemMockComponent],
  providers: [
    { provide: BsListGroupComponent, useClass: BsListGroupMockComponent },
    { provide: BsListGroupItemComponent, useClass: BsListGroupItemMockComponent },
  ]
})
export class BsListGroupTestingModule {}
