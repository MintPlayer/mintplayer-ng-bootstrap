import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTableModule } from '@mintplayer/ng-bootstrap/table';

import { TableRoutingModule } from './table-routing.module';
import { TableComponent } from './table.component';


@NgModule({
  declarations: [
    TableComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsGridModule,
    BsTableModule,
    TableRoutingModule
  ]
})
export class TableModule { }
