import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsContainerComponent } from '@mintplayer/ng-bootstrap/container';
import { BsGridComponent } from './component/grid.component';
import { BsGridRowDirective } from './directives/row/row.directive';
import { BsGridColDirective, BsGridColumnDirective } from './directives/column/column.directive';
import { BsColFormLabelDirective } from './directives/col-form-label/col-form-label.directive';

@NgModule({
  declarations: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective],
  imports: [CommonModule, BsContainerComponent],
  exports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective],
})
export class BsGridModule {}
