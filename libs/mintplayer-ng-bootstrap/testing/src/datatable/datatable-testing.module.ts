import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDatatableMockComponent } from './datatable/datatable.component';
import { BsDatatableColumnMockDirective } from './datatable-column/datatable-column.directive';
import { BsRowTemplateMockDirective } from './row-template/row-template.directive';
import { BsDatatableColumnDirective, BsDatatableComponent } from '@mintplayer/ng-bootstrap/datatable';

@NgModule({
  declarations: [BsDatatableMockComponent, BsDatatableColumnMockDirective, BsRowTemplateMockDirective],
  imports: [CommonModule],
  exports: [BsDatatableMockComponent, BsDatatableColumnMockDirective, BsRowTemplateMockDirective],
  providers: [
    { provide: BsDatatableComponent, useClass: BsDatatableMockComponent },
    { provide: BsDatatableColumnDirective, useClass: BsDatatableColumnMockDirective },
  ]
})
export class BsDatatableTestingModule {}
