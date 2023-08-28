import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsContainerModule } from '@mintplayer/ng-bootstrap/container';
import { BsGridComponent } from './component/grid.component';
import { BsGridRowDirective } from './directives/row/row.directive';
import { BsGridColumnDirective } from './directives/column/column.directive';
import { BsColFormLabelDirective } from './directives/col-form-label/col-form-label.directive';

@NgModule({
  declarations: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective],
  imports: [CommonModule, BsContainerModule],
  exports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective],
})
export class BsGridModule {}
