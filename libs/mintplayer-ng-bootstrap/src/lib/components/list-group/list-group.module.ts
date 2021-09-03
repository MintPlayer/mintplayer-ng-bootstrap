import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListGroupComponent } from './list-group/list-group.component';
import { ListGroupItemComponent } from './list-group-item/list-group-item.component';

@NgModule({
  imports: [CommonModule],
  declarations: [
      ListGroupComponent,
      ListGroupItemComponent
  ],
  exports: [
    ListGroupComponent,
    ListGroupItemComponent
  ]
})
export class NgBootstrapListGroupModule {}
