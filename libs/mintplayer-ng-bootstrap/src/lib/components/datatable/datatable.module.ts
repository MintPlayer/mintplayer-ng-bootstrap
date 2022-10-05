import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDatatableComponent } from './datatable/datatable.component';
import { BsRowTemplateDirective } from './row-template/row-template.directive';
import { BsGridModule } from '../grid/grid.module';
import { BsTableModule } from '../table/table.module';
import { BsPaginationModule } from '../pagination/pagination.module';
import { BsDatatableColumnDirective } from './datatable-column/datatable-column.directive';

@NgModule({
  declarations: [
    BsDatatableComponent,
    BsRowTemplateDirective,
    BsDatatableColumnDirective
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsTableModule,
    BsPaginationModule
  ],
  exports: [
    BsDatatableComponent,
    BsRowTemplateDirective,
    BsDatatableColumnDirective
  ]
})
export class BsDatatableModule { }
