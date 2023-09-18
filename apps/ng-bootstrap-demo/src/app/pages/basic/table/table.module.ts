import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsTableModule } from '@mintplayer/ng-bootstrap/table';
import { BsTrackByModule } from '@mintplayer/ng-bootstrap/track-by';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

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
    BsTrackByModule,
    BsToggleButtonModule,
    TableRoutingModule
  ]
})
export class TableModule { }
