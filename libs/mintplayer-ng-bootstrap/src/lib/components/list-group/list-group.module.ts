import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsListGroupComponent } from './list-group/list-group.component';
import { BsListGroupItemComponent } from './list-group-item/list-group-item.component';

@NgModule({
  imports: [CommonModule],
  declarations: [
      BsListGroupComponent,
      BsListGroupItemComponent
  ],
  exports: [
    BsListGroupComponent,
    BsListGroupItemComponent
  ]
})
export class BsListGroupModule {}
