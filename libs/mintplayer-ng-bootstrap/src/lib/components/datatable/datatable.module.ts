import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDatatableComponent } from './datatable/datatable.component';
import { BsRowTemplateDirective } from './row-template/row-template.directive';
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
    BsPaginationModule
  ],
  exports: [
    BsDatatableComponent,
    BsRowTemplateDirective,
    BsDatatableColumnDirective
  ]
})
export class BsDatatableModule { }
