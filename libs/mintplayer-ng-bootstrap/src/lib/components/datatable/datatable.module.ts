import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDatatableComponent } from './datatable/datatable.component';
import { BsDatatableColumnComponent } from './datatable-column/datatable-column.component';
import { BsRowTemplateDirective } from './row-template/row-template.directive';
import { BsPaginationModule } from '../pagination/pagination.module';
import { BsDirectivesModule } from '../../directives/directives.module';



@NgModule({
  declarations: [
    BsDatatableComponent,
    BsDatatableColumnComponent,
    BsRowTemplateDirective
  ],
  imports: [
    CommonModule,
    BsDirectivesModule,
    BsPaginationModule
  ],
  exports: [
    BsDatatableComponent,
    BsDatatableColumnComponent,
    BsRowTemplateDirective
  ]
})
export class BsDatatableModule { }
