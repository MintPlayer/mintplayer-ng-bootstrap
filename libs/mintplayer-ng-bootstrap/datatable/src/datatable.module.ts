import { NgModule } from '@angular/core';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
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
    AsyncPipe,
    NgTemplateOutlet,
    BsGridModule,
    BsTableComponent,
    BsPaginationComponent
  ],
  exports: [
    BsDatatableComponent,
    BsDatatableColumnDirective,
    BsRowTemplateDirective
  ]
})
export class BsDatatableModule { }
