import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTableModule } from '@mintplayer/ng-bootstrap/table';
import { BsPaginationModule } from '@mintplayer/ng-bootstrap/pagination';
import { BsDatatableComponent } from './datatable/datatable.component';
import { BsDatatableColumnDirective } from './datatable-column/datatable-column.directive';
import { BsRowTemplateDirective } from './row-template/row-template.directive';

@NgModule({
  declarations: [
    BsDatatableComponent,
    BsDatatableColumnDirective,
    BsRowTemplateDirective
  ],
  imports: [
    CommonModule,
    BsGridModule,
    BsTableModule,
    BsPaginationModule
  ],
  exports: [
    BsDatatableComponent,
    BsDatatableColumnDirective,
    BsRowTemplateDirective
  ]
})
export class BsDatatableModule { }
