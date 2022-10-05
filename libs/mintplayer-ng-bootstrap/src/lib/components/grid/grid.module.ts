import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridComponent } from './component/grid.component';
import { BsGridRowDirective } from './directives/row/row.directive';
import { BsGridColumnDirective } from './directives/column/column.directive';

@NgModule({
  declarations: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective],
  imports: [CommonModule],
  exports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective],
})
export class BsGridModule {}
